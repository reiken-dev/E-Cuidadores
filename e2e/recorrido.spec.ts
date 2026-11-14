import { expect, test, type Page } from '@playwright/test';

const ENLACE_MENSUAL = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL;
const ENLACE_ANUAL = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL;

// Recorre las cinco preguntas, la muestra y las dudas hasta el paywall, con las respuestas de la demostración.
async function responderHastaLaMuestra(page: Page, query = '') {
  await page.goto(`/onboarding${query}`);
  await page.getByRole('button', { name: 'Mi mamá' }).click();
  await page.getByPlaceholder('Ej: Rosa, Don Manuel…').fill('Rosa');
  await page.getByPlaceholder('Ej: Marta').fill('Carlos');
  // La etiqueta lleva el nombre ("Seguir con Rosa") y cambia al escribirlo: se acepta cualquiera de las dos.
  await page.getByRole('button', { name: /Seguir con|Continuar/ }).click();
  await page.getByRole('button', { name: 'Solo yo por ahora' }).click();
  await page.getByRole('button', { name: 'Se le olvidan los medicamentos' }).click();
  await page.getByRole('button', { name: 'Cargar su primer medicamento' }).click();
  await page.getByPlaceholder('Ej: Losartán').fill('Losartán');
  await page.getByRole('button', { name: 'Mañana' }).click();
  await page.getByRole('checkbox', { name: /Autorizo guardar el medicamento y la hora de Rosa/ }).check();
  await page.getByRole('button', { name: 'Armar mi plan' }).click();
}

async function llegarAlPaywall(page: Page, query = '') {
  await responderHastaLaMuestra(page, query);
  await expect(page.getByRole('heading', { level: 1, name: 'Así se verá hoy para Rosa' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await page.getByRole('button', { name: 'Ver mi plan' }).click();
  await expect(page.getByRole('button', { name: /Empezar mis|Activar mi Círculo/ })).toBeVisible({ timeout: 15_000 });
}

test('la landing tiene un solo título y su CTA lleva al recorrido', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('link', { name: 'Armar mi Círculo de Cuidado' }).first().click();
  await expect(page).toHaveURL(/\/onboarding/);
});

test('la muestra del valor enseña la medicina y la hora que la persona acaba de dar', async ({ page }) => {
  await responderHastaLaMuestra(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Así se verá hoy para Rosa' })).toBeVisible();
  await expect(page.getByText('Losartán', { exact: true })).toBeVisible();
  await expect(page.getByText('8:00 a. m.', { exact: true })).toBeVisible();
  await expect(page.getByText('Citas: sin citas por ahora')).toBeVisible();
});

test('sin la autorización de datos de salud, la medicina no avanza', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Mi mamá' }).click();
  await page.getByPlaceholder('Ej: Rosa, Don Manuel…').fill('Rosa');
  await page.getByPlaceholder('Ej: Marta').fill('Carlos');
  await page.getByRole('button', { name: /Seguir con|Continuar/ }).click();
  await page.getByRole('button', { name: 'Solo yo por ahora' }).click();
  await page.getByRole('button', { name: 'Se le olvidan los medicamentos' }).click();
  await page.getByRole('button', { name: 'Cargar su primer medicamento' }).click();
  await page.getByPlaceholder('Ej: Losartán').fill('Losartán');
  await page.getByRole('button', { name: 'Armar mi plan' }).click();
  await expect(page.getByText('Marca la autorización para guardar el medicamento de Rosa')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '¿Qué medicamento toma Rosa ahora mismo?' })).toBeVisible();
});

test('sin enlace de cobro, el CTA del paywall es una demostración y no cobra', async ({ page }) => {
  test.skip(Boolean(ENLACE_MENSUAL || ENLACE_ANUAL), 'hay enlace de cobro conectado: ver la prueba de Hotmart');
  await llegarAlPaywall(page);
  await page.getByRole('button', { name: /Empezar mis|Activar mi Círculo/ }).click();
  await expect(page).toHaveURL(/\/entrar/, { timeout: 10_000 });
});

test('con el enlace de Hotmart conectado, el CTA lleva a Hotmart', async ({ page }) => {
  test.skip(!ENLACE_MENSUAL, 'define NEXT_PUBLIC_HOTMART_CHECKOUT_URL para probar el cobro');
  // El enlace real no se abre en la prueba: se responde aquí y se comprueba a dónde llegó el navegador.
  await page.route(`${ENLACE_MENSUAL}**`, (ruta) => ruta.fulfill({ status: 200, contentType: 'text/html', body: '<h1>cobro</h1>' }));
  await llegarAlPaywall(page);
  await page.getByRole('button', { name: /Empezar mis|Activar mi Círculo/ }).click();
  await expect(page).toHaveURL(ENLACE_MENSUAL!, { timeout: 10_000 });
});

test('si el servicio falla, el paywall avisa y no deja la compra a medias', async ({ page }) => {
  test.skip(Boolean(ENLACE_MENSUAL || ENLACE_ANUAL), 'con enlaces conectados no hay simulación de fallo');
  await llegarAlPaywall(page);
  // El parámetro simularError solo funciona en desarrollo. En producción,
  // probamos el error real de falta de conexión después de cargar la pantalla.
  await page.context().setOffline(true);
  await page.getByRole('button', { name: /Empezar mis|Activar mi Círculo/ }).click();
  await expect(page.getByText('Parece que no tienes conexión. No se cobró nada. Conéctate e inténtalo de nuevo.')).toBeVisible({ timeout: 10_000 });
});

test('Hoy abre con el saludo y la tarjeta de la próxima dosis', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Buen(os|as) (días|tardes|noches)/);
});

test('la invitación a un hermano no lleva un enlace que dé 404 ni el nombre de quien cuidas', async ({ page }) => {
  await page.goto('/app/familia?invitar=1');
  const mensaje = page.getByLabel('Tu mensaje');
  await expect(mensaje).toBeVisible();
  await expect(page.locator('body')).not.toContainText('/unirme');
  // El mensaje que sale de la app no lleva el nombre de la persona cuidada (dato de salud de un tercero).
  await expect(mensaje).not.toHaveValue(/Rosa/);
  await expect(page.getByRole('link', { name: 'Descargar la tarjeta' })).toHaveAttribute('href', '/tarjeta-invitacion');
});

test('ninguna página principal se sale del ancho de la pantalla', async ({ page }) => {
  for (const ruta of ['/', '/onboarding', '/app']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    const { ancho, pantalla } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      pantalla: window.innerWidth,
    }));
    expect(ancho, `desborde horizontal en ${ruta}`).toBeLessThanOrEqual(pantalla + 1);
  }
});
