import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const marca = vi.hoisted(() => ({ nombre: 'E-Cuidadores', sitioUrl: 'https://ejemplo.com', soporteEmail: 'soporte@ejemplo.com', conexiones: { resend: true } }));
vi.mock('./marca', () => ({ MARCA: marca }));

import { enviarCorreo, resendConfigurado } from './enviar-correo';

const fetchMock = vi.fn();
const CLAVE = 're_clave_secreta_de_prueba';

beforeEach(() => {
  marca.conexiones.resend = true;
  process.env.RESEND_API_KEY = CLAVE;
  process.env.EMAIL_FROM = 'E-Cuidadores <hola@ejemplo.com>';
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe('enviarCorreo (ECU-4)', () => {
  it('con todo configurado envía a Resend con la clave solo en la cabecera', async () => {
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe(`Bearer ${CLAVE}`);
    expect(init.body).not.toContain(CLAVE);
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo).toMatchObject({ from: 'E-Cuidadores <hola@ejemplo.com>', reply_to: 'soporte@ejemplo.com', to: ['ana@ejemplo.com'], subject: 'No pudimos cobrar tu pago' });
    expect(cuerpo.html).toContain('https://ejemplo.com/app/plan');
    expect(init.signal).toBeDefined();
  });
  it('apagado: con resend en false, sin clave o sin remitente no envía nada', async () => {
    marca.conexiones.resend = false;
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    marca.conexiones.resend = true;
    delete process.env.RESEND_API_KEY;
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    process.env.RESEND_API_KEY = CLAVE;
    delete process.env.EMAIL_FROM;
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rechaza destinatarios mal formados o con intentos de inyección', async () => {
    for (const malo of ['', 'sin-arroba', 'a@b', 'a b@c.com', 'a@c.com\nBcc: x@y.com', 'a@c.com,x@y.com', '<a@c.com>', 'a'.repeat(250) + '@c.com']) {
      expect(await enviarCorreo('pago_fallido', malo)).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('un valor con HTML o saltos de línea no inyecta nada en el asunto ni en el HTML', async () => {
    await enviarCorreo('bienvenida', 'ana@ejemplo.com', { nombre: 'Ana\r\nBcc: x@y.com <script>alert(1)</script>' });
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo.subject).not.toMatch(/[\r\n<>]/);
    expect(cuerpo.html).not.toContain('<script');
  });
  it('un correo de retención sin enlace de baja no se envía (y no lanza)', async () => {
    expect(await enviarCorreo('pagador_fantasma', 'ana@ejemplo.com', { familiar: 'Rosa' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('con enlace de baja, lo incluye una sola vez y escapado', async () => {
    expect(await enviarCorreo('pagador_fantasma', 'ana@ejemplo.com', {}, { bajaUrl: 'https://ejemplo.com/baja?t=a&b="x' })).toBe(true);
    const { html } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(html).toContain('t=a&amp;b=&quot;x');
    expect(html.match(/Darme de baja/g)).toHaveLength(1);
  });
  it('si Resend responde error, la red falla o se agota el tiempo, devuelve false y no lanza ni escribe en consola', async () => {
    const consola = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET ana@ejemplo.com'));
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    fetchMock.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    expect(await enviarCorreo('pago_fallido', 'ana@ejemplo.com')).toBe(false);
    for (const e of consola) expect(e).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it('un correo de marketing con baja lleva las cabeceras List-Unsubscribe (baja con un clic, RFC 8058)', async () => {
    expect(await enviarCorreo('pagador_fantasma', 'ana@ejemplo.com', {}, { bajaUrl: 'https://ejemplo.com/baja?t=a', bajaUnClic: 'https://ejemplo.com/api/baja?t=a' })).toBe(true);
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo.headers).toEqual({
      'List-Unsubscribe': '<https://ejemplo.com/api/baja?t=a>, <https://ejemplo.com/baja?t=a>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
  it('los correos de cuenta y cobro no llevan cabeceras de baja', async () => {
    await enviarCorreo('pago_fallido', 'ana@ejemplo.com');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('headers');
  });
  it('con una clave de idempotencia la manda a Resend; sin ella, no', async () => {
    await enviarCorreo('pago_fallido', 'ana@ejemplo.com', {}, { idempotencia: 'pagador_fantasma/u1/2026-10-20' });
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('pagador_fantasma/u1/2026-10-20');
    await enviarCorreo('pago_fallido', 'ana@ejemplo.com');
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Idempotency-Key');
  });
  it('resendConfigurado exige la bandera, la clave y el remitente', () => {
    expect(resendConfigurado()).toBe(true);
    marca.conexiones.resend = false;
    expect(resendConfigurado()).toBe(false);
    marca.conexiones.resend = true;
    delete process.env.EMAIL_FROM;
    expect(resendConfigurado()).toBe(false);
  });
});
