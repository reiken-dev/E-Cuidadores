import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('./', import.meta.url);
const archivos = readdirSync(dir).filter((f) => f.endsWith('.html'));

describe('plantillas de correo de Supabase Auth (ECU-4)', () => {
  it('hay las cuatro que usa la app', () => {
    expect(archivos.sort()).toEqual(['cambio-de-correo.html', 'confirmacion.html', 'enlace-acceso.html', 'recuperar-contrasena.html']);
  });
  for (const f of archivos) {
    const html = readFileSync(new URL(f, dir), 'utf8');
    it(`${f}: lleva el enlace de Supabase (botón y texto) y está en español`, () => {
      // Confirmación y enlace de acceso usan token_hash (abre en cualquier navegador); las demás, el enlace estándar.
      const variable = ['confirmacion.html', 'enlace-acceso.html'].includes(f) ? /\{\{ \.TokenHash \}\}/g : /\{\{ \.ConfirmationURL \}\}/g;
      expect(html.match(variable)?.length).toBeGreaterThanOrEqual(2);
      expect(html).toContain('Si el botón no funciona');
      expect(html).not.toMatch(/\b(click here|confirm your|reset your|magic link)\b/i);
    });
    it(`${f}: sin datos de salud ni scripts`, () => {
      expect(html).not.toMatch(/medicin|pastilla|dosis|diagn|<script|javascript:/i);
    });
    it(`${f}: letra de 16 px y botón contrastado`, () => {
      expect(html).toContain('font-size:16px');
      expect(html).toContain('#1F5BD6');
    });
  }
  it('el enlace de confirmación y el de acceso verifican en /auth/callback con token_hash y conservan el destino', () => {
    for (const f of ['confirmacion.html', 'enlace-acceso.html']) {
      const html = readFileSync(new URL(f, dir), 'utf8');
      expect(html).toContain('{{ .RedirectTo }}');
      expect(html).toContain('/auth/callback?next=/app');
      expect(html).toContain('&token_hash={{ .TokenHash }}&type=email');
      expect(html).not.toContain('ConfirmationURL');
    }
  });
});
