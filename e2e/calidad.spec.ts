import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Calidad de cada pantalla principal (pilares Frontend, Diseño y UX/UI):
// consola limpia, sin desbordes, objetivos táctiles de 44 px o más, y axe sin violaciones serias ni críticas,
// en modo claro y con preferencia de sistema oscura (la app es solo clara: la ficha fija el modo claro).

const PANTALLAS = [
  '/',
  '/onboarding',
  '/entrar',
  '/app',
  '/app/medicinas',
  '/app/citas',
  '/app/bitacora',
  '/app/familia',
  '/app/semana',
  '/app/plan',
  '/app/resumen',
  '/app/simple',
  '/privacidad',
];

// Recorre el onboarding hasta la muestra del valor (mismo recorrido que recorrido.spec.ts).
async function llegarALaMuestra(page: Page) {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Mi mamá' }).click();
  await page.getByPlaceholder('Ej: Rosa, Don Manuel…').fill('Rosa');
  await page.getByPlaceholder('Ej: Marta').fill('Carlos');
  await page.getByRole('button', { name: /Seguir con|Continuar/ }).click();
  await page.getByRole('button', { name: 'Solo yo por ahora' }).click();
  await page.getByRole('button', { name: 'Se le olvidan los medicamentos' }).click();
  await page.getByRole('button', { name: 'Cargar su primer medicamento' }).click();
  await page.getByPlaceholder('Ej: Losartán').fill('Losartán');
  await page.getByRole('button', { name: 'Mañana' }).click();
  await page.getByRole('checkbox', { name: /Autorizo guardar el medicamento y la hora de Rosa/ }).check();
  await page.getByRole('button', { name: 'Armar mi plan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Así se verá hoy para Rosa' })).toBeVisible({ timeout: 15_000 });
}

// Recorre el onboarding hasta el paywall, con las respuestas de la demostración.
async function llegarAlPaywall(page: Page) {
  await llegarALaMuestra(page);
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await page.getByRole('button', { name: 'Ver mi plan' }).click();
  await expect(page.getByRole('button', { name: /Empezar mis|Activar mi Círculo/ })).toBeVisible({ timeout: 15_000 });
}

async function revisar(page: Page) {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  return errores;
}

async function comprobarPantalla(page: Page) {
  // Sin desbordes horizontales a este ancho.
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde, 'desborde horizontal en px').toBeLessThanOrEqual(0);
  // Objetivos táctiles de 44 px o más, en móvil (el enlace de salto solo se ve con foco y se omite aquí).
  if (test.info().project.name.startsWith('movil')) {
    const pequenos = await page.evaluate(() => {
      const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=checkbox], [role=radio], [role=switch]';
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll(sel))) {
        if (el.classList.contains('sr-only') || el.closest('[aria-hidden="true"]')) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (r.width < 44 || r.height < 44) out.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} ${(el.textContent || '').trim().slice(0, 30)}`);
      }
      return out;
    });
    expect(pequenos, 'objetivos táctiles menores de 44 px').toEqual([]);
  }
  // Axe: sin violaciones serias ni críticas (WCAG 2.0/2.1 A y AA).
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const graves = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact}:${v.id}`);
  expect(graves, 'violaciones de accesibilidad serias o críticas').toEqual([]);
}

for (const modo of ['light', 'dark'] as const) {
  for (const ruta of PANTALLAS) {
    test(`${ruta} (${modo}): consola limpia, sin desbordes, táctiles y axe`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: modo });
      const errores = await revisar(page);
      await page.goto(ruta);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1200); // deja terminar las entradas de Motion: así se miden los tamaños finales, no a mitad de animación
      await comprobarPantalla(page);
      expect(errores, 'errores de consola').toEqual([]);
    });
  }
}

test('la muestra del valor y las dudas cumplen lo mismo: consola limpia, sin desbordes, táctiles y axe', async ({ page }) => {
  const errores = await revisar(page);
  await llegarALaMuestra(page);
  await page.waitForTimeout(1200);
  await comprobarPantalla(page);
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Antes de empezar' })).toBeVisible();
  await page.waitForTimeout(1200);
  await comprobarPantalla(page);
  expect(errores, 'errores de consola').toEqual([]);
});

test('el paywall (con demostración) cumple lo mismo: consola limpia, sin desbordes, táctiles y axe', async ({ page }) => {
  test.skip(Boolean(process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL || process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL), 'con enlaces de cobro conectados el paywall cambia de flujo');
  const errores = await revisar(page);
  await llegarAlPaywall(page);
  await page.waitForTimeout(1200);
  await comprobarPantalla(page);
  expect(errores, 'errores de consola').toEqual([]);
});

test('el CTA principal mide 56 px en móvil (landing y Hoy)', async ({ page }) => {
  test.skip(!test.info().project.name.startsWith('movil'), 'la medida de la rúbrica es en móvil');
  // offsetHeight es la altura de diseño: no cambia mientras Motion termina una transformación de entrada.
  const altoDeDiseno = (loc: ReturnType<Page['locator']>) => loc.evaluate((el) => (el as HTMLElement).offsetHeight);
  await page.goto('/');
  const cta = page.locator('a[data-cta="boton"]').first();
  await expect(cta).toBeVisible();
  expect(await altoDeDiseno(cta)).toBeGreaterThanOrEqual(56);
  // Hoy muestra "Confirmar dosis" solo mientras queda una dosis pendiente del día. Con el reloj real, después de
  // la última dosis de la demostración el botón no existe: se fija la mañana para que la prueba no dependa de la hora.
  const manana = new Date();
  manana.setHours(9, 0, 0, 0);
  await page.clock.setFixedTime(manana);
  await page.goto('/app');
  const confirmar = page.getByRole('button', { name: 'Confirmar dosis' });
  await expect(confirmar).toBeVisible({ timeout: 15_000 });
  expect(await altoDeDiseno(confirmar)).toBeGreaterThanOrEqual(56);
});

test('el resumen para el médico muestra el nombre de quien se cuida y las alergias como dato de seguridad', async ({ page }) => {
  await page.goto('/app/resumen');
  await expect(page.getByText(/^Paciente:/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alergias · dato de seguridad' })).toBeVisible();
  await expect(page.getByText(/Datos registrados por la familia en la app\./)).toBeVisible();
});
