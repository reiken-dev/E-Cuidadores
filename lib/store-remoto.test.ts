// Pruebas del store en MODO REMOTO (Supabase conectado): hidratación, acciones optimistas, cola de escrituras y
// recarga tras un fallo. El acceso a Supabase (lib/datos/remoto.ts) se reemplaza por dobles; allí están sus propias pruebas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { data, med, note } from './test-utils';
import type { AppData } from './types';
import { SELF_ID } from './types';

type Store = typeof import('./store');

const U1 = '11111111-1111-4111-8111-111111111111';
const MED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOY = '2026-11-14';

class FakeStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const ok = { ok: true } as const;
let storage: FakeStorage;
let cargar: ReturnType<typeof vi.fn>;
let escribir: Record<string, ReturnType<typeof vi.fn>>;
let getUser: ReturnType<typeof vi.fn<() => Promise<unknown>>>;
let asignar: ReturnType<typeof vi.fn<(url: string) => void>>;
let cambiosDeSesion: Array<(evento: string, sesion: { user: { id: string } } | null) => void>;

const delServidor = (over: Partial<AppData> = {}): AppData =>
  data({ demo: false, currentUserId: U1, organizerName: 'Ana', members: [{ id: U1, name: 'Ana', role: 'Organizador', tone: 'accent' }], meds: [med({ id: MED, name: 'Losartán', giverId: null })], doses: [], appts: [], notes: [], hitos: [], ...over });

async function abrir(): Promise<Store> {
  vi.resetModules();
  const real = await vi.importActual<typeof import('./marca')>('./marca');
  vi.doMock('./marca', () => ({ ...real, MARCA: { ...real.MARCA, conexiones: { ...real.MARCA.conexiones, supabase: true } } }));
  vi.doMock('./supabase/navegador', () => ({
    crearClienteNavegador: () => ({
      auth: {
        getUser: () => getUser(),
        onAuthStateChange: (cb: (typeof cambiosDeSesion)[number]) => {
          cambiosDeSesion.push(cb);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
      },
    }),
  }));
  escribir = new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get: (t, k: string) => (t[k] ??= vi.fn().mockResolvedValue(ok)),
  });
  vi.doMock('./datos/remoto', () => ({ cargarCirculo: cargar, escribir }));
  return (await import('./store')) as Store;
}

/** Abre el store ya hidratado con los datos del «servidor». */
async function conDatos(over: Partial<AppData> = {}) {
  cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor(over) });
  const store = await abrir();
  store.actions.reintentarCarga();
  await vi.waitFor(() => expect(store.leerEstadoDatos()).toBe('listo'));
  return store;
}
const vaciar = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  storage = new FakeStorage();
  asignar = vi.fn();
  vi.stubGlobal('window', { localStorage: storage, addEventListener: () => {}, location: { origin: 'http://localhost:3000', assign: asignar } });
  cargar = vi.fn();
  getUser = vi.fn().mockResolvedValue({ data: { user: { id: U1 } }, error: null });
  cambiosDeSesion = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('./marca');
  vi.doUnmock('./supabase/navegador');
  vi.doUnmock('./datos/remoto');
});

describe('modo remoto · arranque', () => {
  it('antes de que lleguen los datos NO se ven datos de ejemplo', async () => {
    const store = await abrir();
    const d = store.getSnapshot();
    expect(d.demo).toBe(false);
    expect(d.profile.name).not.toBe('Rosa');
    expect(d.meds).toEqual([]);
    expect(store.MODO_REMOTO).toBe(true);
    expect(store.leerEstadoDatos()).toBe('cargando');
  });
  it('hidrata desde el servidor y pasa a «listo»', async () => {
    const store = await conDatos();
    expect(store.getSnapshot()).toMatchObject({ demo: false, currentUserId: U1, organizerName: 'Ana' });
    expect(store.getSnapshot().meds).toHaveLength(1);
    expect(cargar).toHaveBeenCalledWith(expect.anything(), U1, { simpleMode: false });
  });
  it('si la carga falla queda en «error» y se puede reintentar', async () => {
    cargar.mockRejectedValueOnce(new Error('red'));
    const store = await abrir();
    store.actions.reintentarCarga();
    await vi.waitFor(() => expect(store.leerEstadoDatos()).toBe('error'));
    cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor() });
    store.actions.reintentarCarga();
    await vi.waitFor(() => expect(store.leerEstadoDatos()).toBe('listo'));
  });
  it('sin círculo todavía también es «error» (el guard de /app manda a /bienvenida antes)', async () => {
    cargar.mockResolvedValue(null);
    const store = await abrir();
    store.actions.reintentarCarga();
    await vi.waitFor(() => expect(store.leerEstadoDatos()).toBe('error'));
  });
  it('no guarda ningún dato de salud en localStorage', async () => {
    const store = await conDatos();
    store.actions.setQuestions('¿Subimos la dosis?');
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    await vaciar();
    expect([...storage.map.keys()]).toEqual([]);
  });
});

describe('modo remoto · dosis', () => {
  const dosis = { medId: MED, date: HOY, time: '08:00' };
  it('confirmar es optimista: se ve al instante y se envía al servidor en segundo plano', async () => {
    const store = await conDatos();
    let liberar!: (v: unknown) => void;
    (escribir.registrarDosis as ReturnType<typeof vi.fn>).mockReturnValue(new Promise((r) => (liberar = r)));
    expect(store.actions.confirmDose({ ...dosis, byId: U1, at: 5 })).toBe(true);
    expect(store.getSnapshot().doses).toHaveLength(1); // ya está en pantalla, aunque el servidor no ha respondido
    await vaciar();
    expect(escribir.registrarDosis).toHaveBeenCalledWith(expect.objectContaining({ circleId: 'c1', userId: U1 }), { ...dosis, skipped: null, bySelf: false });
    liberar(ok);
    await vaciar();
    expect(store.leerAvisoDatos()).toBeNull();
  });
  it('la dosis siempre la firma quien tiene la sesión, aunque se pida otra persona', async () => {
    const store = await conDatos({ members: [{ id: U1, name: 'Ana', role: '', tone: 'accent' }, { id: 'otra', name: 'Bea', role: '', tone: 'green' }] });
    store.actions.confirmDose({ ...dosis, byId: 'otra' });
    expect(store.getSnapshot().doses[0].byId).toBe(U1);
  });
  it('el modo simple firma como el propio familiar', async () => {
    const store = await conDatos();
    store.actions.confirmDose({ ...dosis, byId: SELF_ID });
    await vaciar();
    expect(escribir.registrarDosis).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ bySelf: true }));
  });
  it('omitir envía el motivo; deshacer borra', async () => {
    const store = await conDatos();
    store.actions.skipDose({ ...dosis, byId: U1, reason: 'olvido' });
    await vaciar();
    expect(escribir.registrarDosis).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skipped: 'olvido' }));
    store.actions.undoDose(MED, HOY, '08:00');
    await vaciar();
    expect(escribir.deshacerDosis).toHaveBeenCalledWith(expect.anything(), dosis);
    expect(store.getSnapshot().doses).toHaveLength(0);
  });
  it('lo inválido se rechaza igual que en modo local y no envía nada', async () => {
    const store = await conDatos();
    expect(store.actions.confirmDose({ medId: 'no-existe', date: HOY, time: '08:00', byId: U1 })).toBe(false);
    expect(store.actions.confirmDose({ ...dosis, date: '14/11/2026', byId: U1 })).toBe(false);
    expect(store.actions.skipDose({ ...dosis, byId: U1, reason: 'inventado' as never })).toBe(false);
    expect(escribir.registrarDosis).not.toHaveBeenCalled();
  });
});

describe('modo remoto · cola de escrituras', () => {
  it('las escrituras salen una detrás de otra, en orden', async () => {
    const store = await conDatos();
    const orden: string[] = [];
    let liberarPrimera!: (v: unknown) => void;
    escribir.guardarMed.mockImplementationOnce(() => { orden.push('med:inicio'); return new Promise((r) => (liberarPrimera = (v) => { orden.push('med:fin'); r(v); })); });
    escribir.guardarNota.mockImplementationOnce(async () => { orden.push('nota'); return ok; });
    store.actions.saveMed(med({ id: MED, name: 'Losartán 100' }));
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    await vaciar();
    expect(orden).toEqual(['med:inicio']); // la nota espera a que termine la medicina
    liberarPrimera(ok);
    await vi.waitFor(() => expect(orden).toEqual(['med:inicio', 'med:fin', 'nota']));
  });
  it('cada acción de datos llega al servidor con lo que cambió', async () => {
    const store = await conDatos();
    store.actions.saveMed(med({ id: MED, name: 'Losartán', times: ['09:00'] })); // cambia el horario: rige desde ahora
    store.actions.toggleMedPause(MED);
    store.actions.deleteMed(MED);
    store.actions.saveAppt({ id: 'a1', title: 'Control', specialist: '', date: HOY, time: '10:00', place: '', attendeeId: null, remindDayBefore: true, remindHoursBefore: 0, status: 'pendiente', result: '' });
    store.actions.setApptStatus('a1', 'atendida', 'Todo bien');
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    store.actions.deleteNote('n1');
    store.actions.updateProfile({ name: 'Rosa', allergies: ['Penicilina'] });
    store.actions.setQuestions('¿Y la dosis?');
    store.actions.markSeen(1736337600000);
    await vaciar();
    await vi.waitFor(() => expect(escribir.actualizarVisita).toHaveBeenCalled());
    expect(escribir.guardarMed.mock.calls[0][1]).toMatchObject({ id: MED, times: ['09:00'] });
    expect(escribir.guardarMed.mock.calls[0][1].scheduleFrom).toBeGreaterThan(0);
    expect(escribir.borrarMed).toHaveBeenCalledWith(expect.anything(), MED);
    expect(escribir.guardarCita.mock.calls[1][1]).toMatchObject({ id: 'a1', status: 'atendida', result: 'Todo bien' });
    expect(escribir.guardarNota).toHaveBeenCalledTimes(1);
    expect(escribir.borrarNota).toHaveBeenCalledWith(expect.anything(), 'n1');
    expect(escribir.actualizarPerfil.mock.calls[0][1]).toMatchObject({ name: 'Rosa', allergies: ['Penicilina'] });
    expect(escribir.actualizarPreguntas).toHaveBeenCalledWith(expect.anything(), '¿Y la dosis?');
    expect(escribir.actualizarVisita).toHaveBeenCalledWith(expect.anything(), 1736337600000);
  });
  it('un hito se guarda una sola vez', async () => {
    const store = await conDatos();
    store.actions.markHito('racha-7');
    store.actions.markHito('racha-7');
    await vaciar();
    expect(escribir.actualizarHitos).toHaveBeenCalledTimes(1);
    expect(escribir.actualizarHitos).toHaveBeenCalledWith(expect.anything(), ['racha-7']);
  });
  it('los recordatorios por defecto van al círculo; el modo simple se queda en este dispositivo', async () => {
    const store = await conDatos();
    store.actions.updateSettings({ simpleMode: true });
    await vaciar();
    expect(escribir.actualizarAjustes).not.toHaveBeenCalled();
    expect(storage.map.get('entre-hermanos:simple')).toBe('1');
    store.actions.updateSettings({ defaultRemindHours: 2 });
    await vaciar();
    expect(escribir.actualizarAjustes).toHaveBeenCalledWith(expect.anything(), { defaultRemindDayBefore: expect.any(Boolean), defaultRemindHours: 2 });
  });
});

describe('modo remoto · cuando algo no se pudo guardar', () => {
  it('un rechazo por permisos avisa con claridad y vuelve a leer del servidor', async () => {
    const store = await conDatos();
    escribir.registrarDosis.mockResolvedValue({ ok: false, codigo: 'permiso' });
    cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor({ doses: [] }) }); // la verdad del servidor: sin la dosis
    store.actions.confirmDose({ medId: MED, date: HOY, time: '08:00', byId: U1 });
    expect(store.getSnapshot().doses).toHaveLength(1);
    await vi.waitFor(() => expect(store.leerAvisoDatos()).toContain('solo lectura'));
    await vi.waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(store.getSnapshot().doses).toHaveLength(0)); // se recuperó la verdad
    expect(store.leerEstadoDatos()).toBe('listo'); // sin volver a «cargando»
  });
  it('un fallo de red o una excepción también avisan, con otro texto', async () => {
    const store = await conDatos();
    escribir.guardarNota.mockRejectedValue(new Error('red caída con datos de la familia'));
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    await vi.waitFor(() => expect(store.leerAvisoDatos()).toContain('conexión'));
    expect(store.leerAvisoDatos()).not.toContain('familia');
  });
  it('si la recarga también falla, lo dice con verdad (no afirma que recargó) y conserva lo que había en pantalla', async () => {
    const store = await conDatos();
    escribir.guardarMed.mockResolvedValue({ ok: false, codigo: 'otro' });
    cargar.mockRejectedValue(new Error('sin red'));
    store.actions.saveMed(med({ id: MED, name: 'Losartán 100' }));
    await vi.waitFor(() => expect(store.leerAvisoDatos()).not.toBeNull());
    expect(store.leerAvisoDatos()).toContain('No pudimos recargar');
    expect(store.leerAvisoDatos()).not.toContain('Se recargaron');
    expect(store.getSnapshot().meds).toHaveLength(1);
    expect(store.leerEstadoDatos()).toBe('listo');
  });
  it('un dato que la base no acepta se explica; un cambio sin efecto también', async () => {
    const store = await conDatos();
    escribir.guardarMed.mockResolvedValue({ ok: false, codigo: 'invalido' });
    store.actions.saveMed(med({ id: MED, name: 'Losartán 100' }));
    await vi.waitFor(() => expect(store.leerAvisoDatos()).toContain('no es válido'));
    escribir.borrarNota.mockResolvedValue({ ok: false, codigo: 'sin-efecto' });
    store.actions.deleteNote('n1');
    await vi.waitFor(() => expect(store.leerAvisoDatos()).toContain('ya no exista'));
  });
  it('la recarga espera a que se vacíe la cola: no pisa los cambios que aún no salieron', async () => {
    const store = await conDatos();
    escribir.guardarNota.mockResolvedValueOnce({ ok: false, codigo: 'otro' }); // la primera falla
    let liberar!: (v: unknown) => void;
    escribir.guardarMed.mockReturnValueOnce(new Promise((r) => (liberar = r))); // la segunda queda en vuelo
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    store.actions.saveMed(med({ id: MED, name: 'Losartán 100' }));
    await vaciar();
    expect(cargar).toHaveBeenCalledTimes(1); // todavía NO se recargó: queda una escritura pendiente
    expect(store.getSnapshot().meds[0].name).toBe('Losartán 100'); // y el cambio pendiente sigue a la vista
    liberar(ok);
    await vi.waitFor(() => expect(cargar).toHaveBeenCalledTimes(2)); // ahora sí
    await vi.waitFor(() => expect(store.leerAvisoDatos()).toContain('Se recargaron'));
  });
  it('un hito que no se pudo guardar no avisa ni recarga (solo se reintenta en otra visita)', async () => {
    const store = await conDatos();
    escribir.actualizarHitos.mockResolvedValue({ ok: false, codigo: 'permiso' });
    store.actions.markHito('racha-7');
    await vaciar();
    await vaciar();
    expect(store.leerAvisoDatos()).toBeNull();
    expect(cargar).toHaveBeenCalledTimes(1);
  });
  it('el aviso se puede cerrar', async () => {
    const store = await conDatos();
    escribir.guardarNota.mockResolvedValue({ ok: false, codigo: 'otro' });
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    await vi.waitFor(() => expect(store.leerAvisoDatos()).not.toBeNull());
    store.actions.descartarAviso();
    expect(store.leerAvisoDatos()).toBeNull();
  });
});

describe('modo remoto · cerrar sesión y sesión caída', () => {
  it('vaciarCola espera a que salgan las escrituras pendientes', async () => {
    const store = await conDatos();
    let liberar!: (v: unknown) => void;
    escribir.guardarNota.mockReturnValueOnce(new Promise((r) => (liberar = r)));
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    let terminado = false;
    const espera = store.actions.vaciarCola().then((v) => {
      terminado = true;
      return v;
    });
    await vaciar();
    expect(terminado).toBe(false);
    liberar(ok);
    expect(await espera).toBe(true);
  });
  it('vaciarCola no se queda colgada: con tope de tiempo devuelve false si algo no sale', async () => {
    const store = await conDatos();
    escribir.guardarNota.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    store.actions.saveNote(note({ id: 'n1', authorId: U1 }));
    vi.useFakeTimers();
    try {
      const espera = store.actions.vaciarCola();
      await vi.advanceTimersByTimeAsync(5001);
      expect(await espera).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
  it('sin cola pendiente vaciarCola responde enseguida', async () => {
    const store = await conDatos();
    expect(await store.actions.vaciarCola()).toBe(true);
  });
  it('si la sesión caducó, no se queda en «reintentar»: vuelve al acceso con una navegación completa', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
    const store = await abrir();
    store.actions.reintentarCarga();
    await vi.waitFor(() => expect(asignar).toHaveBeenCalledWith('http://localhost:3000/entrar'));
  });
  it('si en otra pestaña se cierra la sesión o entra otra persona, esta pestaña vuelve al acceso (no queda la familia anterior a la vista)', async () => {
    await conDatos();
    expect(cambiosDeSesion).toHaveLength(1);
    cambiosDeSesion[0]('TOKEN_REFRESHED', { user: { id: U1 } });
    cambiosDeSesion[0]('INITIAL_SESSION', { user: { id: U1 } });
    expect(asignar).not.toHaveBeenCalled();
    cambiosDeSesion[0]('SIGNED_IN', { user: { id: 'otra-persona' } });
    expect(asignar).toHaveBeenCalledTimes(1);
    cambiosDeSesion[0]('SIGNED_OUT', null);
    expect(asignar).toHaveBeenCalledTimes(2);
  });
  it('vigila la sesión una sola vez aunque se vuelva a cargar', async () => {
    const store = await conDatos();
    store.actions.reintentarCarga();
    await vi.waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
    expect(cambiosDeSesion).toHaveLength(1);
  });
});

describe('modo remoto · lo que ya no aplica', () => {
  it('el plan, la demostración, el borrado local y el código de invitación no hacen nada', async () => {
    const store = await conDatos();
    const antes = JSON.stringify(store.getSnapshot());
    store.actions.setPlan({ estado: 'pago_pendiente' });
    store.actions.resetDemo();
    store.actions.borrarTodo();
    store.actions.ensureCodigoCirculo();
    expect(store.actions.enterDemo()).toBe('storage-unavailable');
    expect(store.actions.restorePersonalData()).toBe('missing');
    expect(store.actions.applyOnboarding({ name: 'Otra' })).toBe('preserved');
    expect(JSON.stringify(store.getSnapshot())).toBe(antes);
    await vaciar();
    expect(Object.values(escribir).every((f) => f.mock.calls.length === 0)).toBe(true);
  });
  it('exportar los datos funciona con los datos reales cargados', async () => {
    const store = await conDatos();
    expect(JSON.parse(store.actions.exportarDatos()).datos.organizerName).toBe('Ana');
  });
});

describe('modo remoto · ver los cambios de los hermanos (sondeo, ECU-10)', () => {
  let visible: 'visible' | 'hidden';
  let eventos: Record<string, Array<() => void>>;
  beforeEach(() => {
    visible = 'visible';
    eventos = {};
    vi.stubGlobal('window', {
      localStorage: storage,
      location: { origin: 'http://localhost:3000', assign: asignar },
      addEventListener: (n: string, f: () => void) => (eventos[`w:${n}`] ??= []).push(f),
      removeEventListener: (n: string, f: () => void) => (eventos[`w:${n}`] = (eventos[`w:${n}`] ?? []).filter((x) => x !== f)),
    });
    vi.stubGlobal('document', {
      get visibilityState() {
        return visible;
      },
      addEventListener: (n: string, f: () => void) => (eventos[n] ??= []).push(f),
      removeEventListener: (n: string, f: () => void) => (eventos[n] = (eventos[n] ?? []).filter((x) => x !== f)),
    });
  });
  afterEach(() => vi.useRealTimers());

  /** Store hidratado y suscrito (como una pantalla abierta), con el reloj bajo control. */
  async function abierto() {
    const store = await conDatos();
    vi.useFakeTimers(); // antes de suscribirse: el temporizador del sondeo se crea al suscribir
    const baja = store.suscribirAlStore(() => {});
    await vi.advanceTimersByTimeAsync(0);
    cargar.mockClear();
    return { store, baja };
  }
  const avanzar = (ms: number) => vi.advanceTimersByTimeAsync(ms);

  it('cada 30 s con la pestaña visible lee el círculo y muestra lo que anotó un hermano', async () => {
    const { store, baja } = await abierto();
    cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor({ notes: [note({ id: 'n-hermano', authorId: 'otro' })] }) });
    await avanzar(29000);
    expect(cargar).not.toHaveBeenCalled();
    await avanzar(1500);
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().notes.map((n) => n.id)).toEqual(['n-hermano']);
    baja();
  });

  it('con la pestaña oculta no lee; al volver a verse, lee enseguida', async () => {
    const { baja } = await abierto();
    visible = 'hidden';
    await avanzar(95000);
    expect(cargar).not.toHaveBeenCalled();
    visible = 'visible';
    eventos.visibilitychange.forEach((f) => f());
    await avanzar(0);
    expect(cargar).toHaveBeenCalledTimes(1);
    baja();
  });

  it('al recuperar la conexión lee enseguida', async () => {
    const { baja } = await abierto();
    eventos['w:online'].forEach((f) => f());
    await avanzar(0);
    expect(cargar).toHaveBeenCalledTimes(1);
    baja();
  });

  it('no lee mientras hay escrituras sin enviar: nunca pisa lo que la persona acaba de anotar', async () => {
    const { store, baja } = await abierto();
    let soltar!: (v: unknown) => void;
    escribir.guardarNota.mockReturnValue(new Promise((r) => (soltar = r)));
    store.actions.saveNote(note({ id: 'mia', authorId: U1 }));
    await avanzar(60000);
    expect(cargar).not.toHaveBeenCalled();
    soltar(ok);
    await avanzar(0);
    await avanzar(30000);
    expect(cargar).toHaveBeenCalledTimes(1);
    baja();
  });

  it('si no cambió nada, conserva el mismo objeto (la pantalla no se repinta)', async () => {
    const { store, baja } = await abierto();
    const antes = store.getSnapshot();
    cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor() });
    await avanzar(30000);
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(antes);
    baja();
  });

  it('un fallo del sondeo no muestra aviso ni pierde los datos que ya había', async () => {
    const { store, baja } = await abierto();
    cargar.mockRejectedValue(new Error('sin red'));
    await avanzar(30000);
    expect(store.leerAvisoDatos()).toBeNull();
    expect(store.leerEstadoDatos()).toBe('listo');
    expect(store.getSnapshot().meds).toHaveLength(1);
    cargar.mockResolvedValue({ circleId: 'c1', datos: delServidor({ notes: [note({ id: 'n2', authorId: 'otro' })] }) });
    await avanzar(30000);
    expect(store.getSnapshot().notes).toHaveLength(1);
    baja();
  });

  it('al quitar la última pantalla se detiene el sondeo', async () => {
    const { baja } = await abierto();
    baja();
    await avanzar(120000);
    expect(cargar).not.toHaveBeenCalled();
    expect(eventos.visibilitychange ?? []).toHaveLength(0);
    expect(eventos['w:online'] ?? []).toHaveLength(0);
  });
});
