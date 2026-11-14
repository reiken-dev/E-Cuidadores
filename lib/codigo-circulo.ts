// Código del círculo para la invitación: al azar, opaco y sin ningún dato de la familia.
// Se crea una vez en cada dispositivo y se guarda. Nunca se deriva del nombre de quien se cuida.

// Sin 0, O, 1 ni I: se puede dictar y leer sin confundirlo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Forma válida de un código: cuatro caracteres, guion y cuatro más. Sirve para validar lo guardado. */
export const CODIGO_CIRCULO_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

/** Código de 8 caracteres en dos grupos, por ejemplo "K7QD-3MPX" (40 bits al azar). */
export function codigoCirculoAleatorio(fuente: { getRandomValues<T extends Uint8Array>(a: T): T } = globalThis.crypto): string {
  const bytes = fuente.getRandomValues(new Uint8Array(8));
  let codigo = '';
  // 256 es múltiplo de 32: cada símbolo sale con la misma probabilidad.
  for (const b of bytes) codigo += ALFABETO[b % ALFABETO.length];
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}
