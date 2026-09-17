import { chromium, type Browser } from 'playwright-core';
import chromiumServerless from '@sparticuz/chromium';

// Arranca el Chromium adecuado según el entorno — ver specs/12-escaneo-url.md:
// - En Vercel (`process.env.VERCEL` está definido en toda función desplegada
//   allí): el binario comprimido de @sparticuz/chromium, pensado para el
//   límite de tamaño de las funciones serverless.
// - En local (`vercel dev`): el Chromium que ya instala Playwright para los
//   e2e — playwright-core está fijado a la misma versión exacta que
//   @playwright/test (ver package.json), así que lo encuentra en la caché
//   de navegadores compartida sin necesitar su propia descarga.
export async function lanzarNavegador(): Promise<Browser> {
  if (process.env['VERCEL']) {
    return chromium.launch({
      args: chromiumServerless.args,
      executablePath: await chromiumServerless.executablePath(),
      headless: true,
    });
  }

  return chromium.launch({ headless: true });
}
