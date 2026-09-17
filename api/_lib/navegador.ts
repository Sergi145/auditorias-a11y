import { chromium, type Browser } from 'playwright-core';

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
    // @sparticuz/chromium se publica como ESM puro ("type": "module"); el
    // bundle de la función en Vercel compila api/**/*.ts a CommonJS, y un
    // require() de un paquete ESM falla en tiempo de ejecución
    // (ERR_REQUIRE_ESM, confirmado en el despliegue real). El propio mensaje
    // de error de Node recomienda el import() dinámico, que sí funciona
    // desde CommonJS porque devuelve una promesa en vez de resolver en
    // síncrono.
    const { default: chromiumServerless } = await import('@sparticuz/chromium');
    return chromium.launch({
      args: chromiumServerless.args,
      executablePath: await chromiumServerless.executablePath(),
      headless: true,
    });
  }

  return chromium.launch({ headless: true });
}
