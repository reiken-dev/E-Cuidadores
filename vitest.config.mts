import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Pruebas de la lógica pura de lib/ (sin navegador). El alias "@" replica el de tsconfig.json.
// El JSX sale de tsconfig ("jsx": "react-jsx"): no hace falta configurarlo aquí.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { environment: 'node', include: ['lib/**/*.test.ts', 'components/**/*.test.tsx', 'app/**/*.test.tsx', 'supabase/**/*.test.ts'] },
});
