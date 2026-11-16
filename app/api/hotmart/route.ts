// app/api/hotmart/route.ts — recibe los avisos de Hotmart. ⚠️ Requiere NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y HOTMART_HOTTOK.
// Opcional: HOTMART_PRODUCT_ID (si lo defines, los avisos de otros productos de tu cuenta se ignoran).
// Orden: 1) configuración  2) autenticidad  3) aviso incompleto, evento o producto que no usamos  4) ¿ya procesado?
//        5) estado (solo si el aviso corresponde)  6) anotar el aviso.
// Respuestas: 200 = recibido (Hotmart no reintenta) · 401 = firma incorrecta · 422 = aviso de un evento que usamos pero
// incompleto (queda como fallido en el panel de Hotmart: así un cambio de formato no pasa en silencio) · 503 = falta configuración ·
// 500 = algo falló aquí (Hotmart reintenta; por eso el aviso solo se anota como procesado tras éxito).
// Privacidad: no se escribe nada en logs (ni cuerpo, ni correo, ni errores) y el payload guardado solo lleva el producto.
import { NextResponse } from 'next/server';
import { enviarCorreo } from '@/lib/enviar-correo';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  debeAplicarEstado,
  estadoDeEvento,
  extraerAviso,
  faltaConfiguracionHotmart,
  hottokValido,
  importeContable,
  productoPermitido,
} from '@/lib/hotmart';

export const runtime = 'nodejs';

type Db = SupabaseClient;

/** Busca el usuario por correo con UNA consulta a la función SQL `usuario_por_correo` (supabase/vigencia-y-correo.sql, ECU-8).
 *  Solo cuenta una cuenta con el correo CONFIRMADO: una cuenta sin confirmar pudo crearla cualquiera con un correo ajeno.
 *  Sin cuenta confirmada, la compra queda en pending_purchases y se enlaza cuando la persona confirme (ver schema.sql).
 *  Si la función no existe aún (falta ejecutar el SQL) o falla, devuelve 'error' → 5xx y Hotmart reintenta: nunca se pierde un aviso. */
async function usuarioPorCorreo(db: Db, correo: string): Promise<{ id: string } | null | 'error'> {
  const { data, error } = await db.rpc('usuario_por_correo', { p_email: correo });
  if (error) return 'error';
  return typeof data === 'string' && data ? { id: data } : null;
}

export async function POST(req: Request) {
  // 1. Configuración: sin HOTTOK ni Supabase no se puede verificar ni guardar. 503 (nunca 200 ni 401) para que Hotmart reintente.
  if (faltaConfiguracionHotmart(process.env).length > 0) {
    return NextResponse.json({ error: 'servicio no configurado' }, { status: 503 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // 2. Autenticidad: sin el HOTTOK correcto no se lee nada más. [VERIFICAR: cabecera X-HOTMART-HOTTOK con un aviso de prueba]
  if (!hottokValido(req.headers.get('x-hotmart-hottok'), process.env.HOTMART_HOTTOK)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const reintentar = () => NextResponse.json({ error: 'reintentar' }, { status: 500 }); // 500 = Hotmart reintenta

  try {
    const cuerpo: unknown = await req.json().catch(() => null);
    const aviso = extraerAviso(cuerpo);
    if (!aviso) {
      // Un evento que SÍ usamos pero al que le falta evento, transacción o correo (p. ej. Hotmart cambió el formato):
      // 422, para que quede como fallido en el panel de Hotmart y no se pierda una cancelación o un reembolso en silencio.
      const evento = (cuerpo as { event?: unknown } | null)?.event;
      if (typeof evento === 'string' && estadoDeEvento(evento)) {
        return NextResponse.json({ error: 'aviso incompleto' }, { status: 422 });
      }
      return NextResponse.json({ ok: true, ignorado: 'aviso incompleto' }); // 200: Hotmart no reintenta basura
    }

    // 3. Evento o producto que la plantilla no usa: 200 y nada escrito (ni datos del comprador).
    const estado = estadoDeEvento(aviso.evento);
    if (!estado) return NextResponse.json({ ok: true, ignorado: 'evento no usado' });
    if (!productoPermitido(aviso.productoId, process.env.HOTMART_PRODUCT_ID)) {
      return NextResponse.json({ ok: true, ignorado: 'producto distinto' });
    }

    // Clave de servicio: salta RLS, por eso solo vive aquí (servidor) y la sesión no se guarda.
    const db = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

    // 4. ¿Ya procesado? La clave única (transacción, evento) evita contar dos veces un aviso repetido.
    //    De paso se leen los avisos que ya hay de esta transacción: sirven para no reactivar tras un reembolso (paso 5).
    const { data: previos, error: errPrevio } = await db
      .from('payment_events')
      .select('event')
      .eq('hotmart_transaction', aviso.transaccion);
    if (errPrevio || !previos) return reintentar();
    const eventosPrevios = (previos as { event: string }[]).map((f) => f.event);
    if (eventosPrevios.includes(aviso.evento)) return NextResponse.json({ ok: true, repetido: true });

    // 5. Primero el estado, salvo que el aviso no corresponda (llegó fuera de orden o es de un pedido que no se pagó).
    //    Si la persona aún no tiene cuenta confirmada, queda en pending_purchases y se enlaza al confirmar su correo.
    const aplicar = debeAplicarEstado(aviso.evento, eventosPrevios);
    let tieneCuenta = false; // los correos de cobro y cancelación solo tienen sentido para quien ya tiene cuenta
    if (aplicar) {
      // Solo se escriben los campos que llegaron: un aviso sin fecha ni nombre de plan no borra lo que ya guardamos.
      // El plan solo se escribe si Hotmart lo dice; al crear la fila, la base lo deja en "desconocido" (ver schema.sql).
      const datos = {
        status: estado,
        ...(aviso.plan ? { plan: aviso.plan } : {}),
        ...(aviso.codigoSuscriptor ? { hotmart_subscriber_code: aviso.codigoSuscriptor } : {}),
        ...(aviso.finPeriodo ? { current_period_end: aviso.finPeriodo } : {}), // [VERIFICAR: ruta del campo, ver lib/hotmart.ts]
      };
      const aSuscripcion = (userId: string) =>
        db.from('subscriptions').upsert({ user_id: userId, ...datos, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      const u = await usuarioPorCorreo(db, aviso.correo);
      if (u === 'error') return reintentar();
      if (u) {
        const { error } = await aSuscripcion(u.id);
        if (error) return reintentar();
        tieneCuenta = true;
      } else {
        const { error } = await db.from('pending_purchases').upsert({ buyer_email: aviso.correo, ...datos }, { onConflict: 'buyer_email' });
        if (error) return reintentar();
        // Carrera: si la persona confirmó su correo justo entre la búsqueda y este guardado, el trigger que enlaza las compras
        // ya corrió y no habría encontrado nada. Se vuelve a mirar y, si ya existe, se aplica directo y se borra la pendiente.
        const ahora = await usuarioPorCorreo(db, aviso.correo);
        if (ahora === 'error') return reintentar();
        if (ahora) {
          const { error: errSub } = await aSuscripcion(ahora.id);
          if (errSub) return reintentar();
          const { error: errBorrar } = await db.from('pending_purchases').delete().eq('buyer_email', aviso.correo);
          if (errBorrar) return reintentar();
          tieneCuenta = true;
        }
      }
    }

    // 6. Solo tras éxito se anota el aviso como procesado. Sin datos del comprador en el payload: el correo ya va en buyer_email.
    const { error: errAviso } = await db.from('payment_events').insert({
      hotmart_transaction: aviso.transaccion,
      event: aviso.evento,
      buyer_email: aviso.correo,
      amount_minor: importeContable(aviso.evento, aviso.importeMinimo),
      currency: aviso.moneda,
      payload: { producto: aviso.productoId },
    });
    // 23505: llegó otro envío igual a la vez, o esa transacción ya tiene su cobro en el libro: no se cuenta dos veces.
    if (errAviso?.code === '23505') return NextResponse.json({ ok: true, repetido: true });
    if (errAviso) return reintentar();

    // 7. Correos del servicio (cobro fallido, cancelación). El aviso ya está guardado: un fallo del correo no cambia la
    //    respuesta (si fuera 5xx, Hotmart reintentaría, el aviso saldría como repetido y el correo tampoco saldría).
    //    Solo si el aviso cambió el estado, y sin datos de salud: la plantilla no lleva nombres de la familia.
    //    PURCHASE_CANCELED (compra cancelada, reembolso o contracargo) no manda «cancelación»: la baja voluntaria es SUBSCRIPTION_CANCELLATION.
    //    Si el correo no sale (Resend caído) no hay segundo intento: Hotmart no reenvía un aviso ya guardado.
    if (aplicar && tieneCuenta) {
      const correo = aviso.evento === 'PURCHASE_DELAYED' ? 'pago_fallido' : aviso.evento === 'SUBSCRIPTION_CANCELLATION' ? 'cancelacion' : null;
      if (correo) {
        try {
          await enviarCorreo(correo, aviso.correo);
        } catch {
          // enviarCorreo no lanza, pero si algún día lo hiciera el aviso ya está guardado: no se convierte en 5xx.
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Cualquier fallo inesperado: 500 para que Hotmart reintente. Sin log: el error podría traer datos del comprador.
    return reintentar();
  }
}
