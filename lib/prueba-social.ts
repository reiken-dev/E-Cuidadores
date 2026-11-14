// PRUEBA SOCIAL — testimonios de quien ya usa la app.
// Pon aquí SOLO testimonios reales, con permiso de quien los dice: nombre, relación y la frase tal cual la escribió.
// Mientras la lista esté vacía, la sección no aparece en la landing: la plantilla nunca inventa testimonios.

export interface Testimonio {
  /** Cómo se firma (nombre o inicial). */
  nombre: string;
  /** Relación con el familiar cuidado, sin datos de salud. Ej.: "hija de una mamá de 81 años". */
  relacion: string;
  /** La frase exacta de la persona. */
  frase: string;
}

export const TESTIMONIOS: Testimonio[] = [];
