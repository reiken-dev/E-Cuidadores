import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./BajaForm', () => ({ default: () => null }));
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => ({ rpc }) }));

import BajaPage from './page';
import { firmarBaja } from '@/lib/baja';

const SECRETO = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
const U1 = '11111111-1111-4111-8111-111111111111';
const abrir = async (t: string | string[] | undefined) => ((await BajaPage({ searchParams: Promise.resolve({ t }) })) as { props: { token: string | null } }).props.token;

beforeEach(() => {
  process.env.BAJA_SECRET = SECRETO;
  rpc.mockReset();
});

describe('página /baja (ECU-6)', () => {
  it('abrir el enlace NO da de baja a nadie: solo muestra el botón de confirmar', async () => {
    const token = firmarBaja(U1, SECRETO)!;
    expect(await abrir(token)).toBe(token);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('un enlace sin firma válida, manipulado, repetido o ausente muestra el mensaje neutro', async () => {
    for (const malo of [undefined, '', 'x.y', `${U1}.${'a'.repeat(43)}`, ['a', 'b']]) expect(await abrir(malo)).toBeNull();
  });
  it('sin BAJA_SECRET ningún enlace es válido (falla cerrado)', async () => {
    const token = firmarBaja(U1, SECRETO)!;
    delete process.env.BAJA_SECRET;
    expect(await abrir(token)).toBeNull();
  });
});
