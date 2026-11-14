// Estado del recorrido de bienvenida, guardado en sessionStorage (clave propia, solo esta pestaña)
// para que recargar la página a mitad NO pierda las respuestas. Es un mini store externo leído con
// useSyncExternalStore: el servidor y la hidratación ven el estado vacío y el cliente lee lo guardado
// justo después, sin setState dentro de un efecto. Nada sensible: nombre del familiar, opciones
// elegidas y el primer medicamento (lo mismo que la app ya guarda en el dispositivo). Cuando
// el comprador conecte un backend, esto se reemplaza por el estado del servidor.

import { useSyncExternalStore } from 'react';

export type PreocupacionId = 'medicamentos' | 'citas' | 'chat' | 'variado';

export interface WizardState {
  step: number;
  quien: string;
  nombre: string;
  organizerName: string;
  hermanos: string;
  preocupacion: PreocupacionId | '';
  medicamento: string;
  horario: string;
  /** Opt-in del aviso por correo antes del primer cobro (paywall). */
  avisar: boolean;
}

export const WIZARD_KEY = 'entre-hermanos:onboarding:v1';
const MAX_STEP = 8;

const VACIO: WizardState = {
  step: 0,
  quien: '',
  nombre: '',
  organizerName: '',
  hermanos: '',
  preocupacion: '',
  medicamento: '',
  horario: '',
  avisar: true,
};

let cache: WizardState | null = null;
const listeners = new Set<() => void>();

function str(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function cargar(): WizardState {
  try {
    const raw = window.sessionStorage.getItem(WIZARD_KEY);
    if (!raw) return VACIO;
    const p = JSON.parse(raw) as Partial<WizardState>;
    const step = typeof p.step === 'number' && p.step >= 0 && p.step <= MAX_STEP ? Math.floor(p.step) : 0;
    const pre = p.preocupacion;
    return {
      step,
      quien: str(p.quien),
      nombre: str(p.nombre),
      organizerName: str(p.organizerName),
      hermanos: str(p.hermanos),
      preocupacion: pre === 'medicamentos' || pre === 'citas' || pre === 'chat' || pre === 'variado' ? pre : '',
      medicamento: str(p.medicamento),
      horario: str(p.horario),
      avisar: typeof p.avisar === 'boolean' ? p.avisar : true,
    };
  } catch {
    return VACIO;
  }
}

function getSnapshot(): WizardState {
  if (cache === null) cache = cargar();
  return cache;
}

function getServerSnapshot(): WizardState {
  return VACIO;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const wizard = {
  set(patch: Partial<WizardState>) {
    cache = { ...getSnapshot(), ...patch };
    try {
      window.sessionStorage.setItem(WIZARD_KEY, JSON.stringify(cache));
    } catch {
      /* sin sessionStorage (modo privado estricto): el recorrido sigue funcionando en memoria */
    }
    listeners.forEach((l) => l());
  },
  /** Borra lo guardado SIN avisar a la pantalla (se usa justo antes de navegar, para no parpadear al paso 1). */
  discard() {
    cache = null;
    try {
      window.sessionStorage.removeItem(WIZARD_KEY);
    } catch {
      /* nada que limpiar */
    }
  },
};

export function useWizard(): WizardState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** false en el servidor y en la hidratación, true después: para no pintar un paso equivocado por un instante. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
