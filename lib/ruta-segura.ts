/** Ruta interna a la que se puede redirigir tras entrar. Rechaza cualquier destino externo (redirección abierta). */
export function rutaSegura(destino: string | null | undefined, porDefecto = '/app'): string {
  if (!destino) return porDefecto;
  // Solo rutas del propio sitio: empiezan por "/" pero no por "//" ni "/\" (el navegador las toma como otro host).
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) return porDefecto;
  // Sin saltos de línea ni caracteres de control.
  if (/[\u0000-\u001f]/.test(destino)) return porDefecto;
  return destino;
}
