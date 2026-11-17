// Baja con un clic (RFC 8058): Gmail y Outlook llaman a este POST desde su botón «Cancelar suscripción». Corre en el
// servidor; la identidad sale de la firma del enlace (lib/baja.ts). Solo POST: un GET (vista previa, antivirus) no hace nada.
import { NextResponse } from 'next/server';
import { verificarBaja } from '@/lib/baja';
import { crearClienteServicio } from '@/lib/supabase/servicio';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const id = verificarBaja(new URL(req.url).searchParams.get('t'), process.env.BAJA_SECRET);
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const servicio = crearClienteServicio();
  if (!servicio) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const { error } = await servicio.rpc('darse_de_baja', { p_user: id });
    return error ? NextResponse.json({ ok: false }, { status: 500 }) : NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
