import { defineConfig } from 'vitest/config';

// Tests de api/: entorno Node puro, sin Angular ni jsdom — por eso corren
// con un config de Vitest independiente del test runner del frontend
// (@angular/build:unit-test, ver angular.json) — ver specs/12-escaneo-url.md.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['api/**/*.spec.ts'],
  },
});
