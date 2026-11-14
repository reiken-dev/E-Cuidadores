// REGISTRO DE CONSENTIMIENTOS AL CREAR LA CUENTA: la parte pura (qué filas se guardan y con qué versión del texto).
// La escritura real en public.consents está en lib/alta.ts (con la sesión, vía RLS); /app exige las dos filas.
// Nunca se guardan en el navegador: en un dispositivo compartido atribuirían la decisión a otra persona.
import { LEGAL } from './legal';

export type FinalidadConsentimiento = 'terms_privacy_adult' | 'health_data';

export interface FilaConsentimiento {
  user_id: string;
  purpose: FinalidadConsentimiento;
  text_version: string;
  locale: string;
  origin: string;
}

/**
 * Filas que se insertan en public.consents al crear la cuenta: una por finalidad, con la versión del texto
 * que la persona aceptó. Sin las dos casillas marcadas no hay alta: devuelve null.
 */
export function filasDeAlta(userId: string, aceptados: { terminos: boolean; salud: boolean }): FilaConsentimiento[] | null {
  if (!aceptados.terminos || !aceptados.salud) return null;
  const finalidades: FinalidadConsentimiento[] = ['terms_privacy_adult', 'health_data'];
  return finalidades.map((purpose) => ({
    user_id: userId,
    purpose,
    text_version: LEGAL.version,
    locale: 'es',
    origin: 'signup',
  }));
}
