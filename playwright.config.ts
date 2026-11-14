import { defineConfig } from '@playwright/test';

// Pruebas de recorrido en navegador: landing → onboarding → paywall → entrar → app.
// Primera vez: `npx playwright install chromium`. Después: `npm run test:e2e`.
// Para probar el cobro conectado, define NEXT_PUBLIC_HOTMART_CHECKOUT_URL antes de correr la prueba.
// Siempre arranca ESTE proyecto (nunca reutiliza otro servidor): si el puerto está ocupado, define PUERTO_E2E
// (p. ej. PUERTO_E2E=3417 npm run test:e2e) en lugar de cambiar el valor por defecto.
const PUERTO = Number(process.env.PUERTO_E2E) || 3217;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'movil-375', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'escritorio-1280', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
