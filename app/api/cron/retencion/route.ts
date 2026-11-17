// Cron diario de retención. Vercel manda `Authorization: Bearer $CRON_SECRET` (vercel.json, 14:00 UTC).
// ?simular=1 cuenta candidatos sin reservar ni enviar nada (también exige el secreto). Con MARKETING_ACTIVO = false
// (lib/oferta.ts) tampoco envía. Respuestas solo con contadores: nunca correos ni datos de salud. Sin console.
import { NextResponse } from 'next/server';
import { MARKETING_ACTIVO } from '@/lib/oferta';
import { MARCA } from '@/lib/marca';
import { bearerValido, ejecutarRetencion } from '@/lib/cron-retencion';
import { crearClienteServicio } from '@/lib/supabase/servicio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  // Sin CRON_SECRET no hay forma de autenticar: 503 (falta configuración), nunca «abierto».
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'servicio no configurado' }, { status: 503 });
  if (!bearerValido(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  const db = crearClienteServicio();
  if (!db) return NextResponse.json({ error: 'servicio no configurado' }, { status: 503 });
  try {
    const r = await ejecutarRetencion(db, {
      simular: new URL(req.url).searchParams.get('simular') === '1',
      marketingActivo: MARKETING_ACTIVO,
      ahora: new Date(),
      secretoBaja: process.env.BAJA_SECRET,
      sitioUrl: MARCA.sitioUrl,
    });
    if (r.ok) return NextResponse.json(r);
    // Un fallo no se disfraza de «0 enviados».
    return NextResponse.json({ error: r.motivo === 'configuracion' ? 'falta BAJA_SECRET' : 'no se pudo completar la retención' }, { status: r.motivo === 'configuracion' ? 503 : 500 });
  } catch {
    return NextResponse.json({ error: 'no se pudo completar la retención' }, { status: 500 });
  }
}
