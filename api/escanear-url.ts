import * as axe from 'axe-core';
import {
  errors as erroresPlaywright,
  type BrowserContext,
  type Locator,
  type Page,
  type Request as PeticionPlaywright,
  type Response as RespuestaPlaywright,
} from 'playwright-core';
import { TAGS_WCAG_2_2_A_AA } from '../src/app/core/axe-tags';
import type { ViolacionAxe } from '../src/app/core/escaneo-axe';
import { PresupuestoCapturas, selectorSimple } from './_lib/captura-evidencia';
import { recorteConContexto } from './_lib/recorte-captura';
import { lanzarNavegador } from './_lib/navegador';
import { hostPermitido, validarFormatoUrl } from './_lib/validar-url';

// Presupuesto de capturas en base64 por ejecución — deja margen bajo el
// límite de 4,5 MB de respuesta de Vercel — ver specs/13-captura-evidencia-
// escaneo.md "Decisiones tomadas y descartadas".
const PRESUPUESTO_CAPTURAS_BASE64 = 3 * 1024 * 1024;

// POST /api/escanear-url: escanea con axe-core la URL en vivo de una página
// y devuelve sus violaciones en crudo, para que el cliente las aplique con
// EscaneoAxeService.aplicarViolaciones() igual que el modo "Pegar HTML" —
// ver specs/12-escaneo-url.md. El mapeo a criterios WCAG y la persistencia
// ocurren en el cliente (IndexedDB), no aquí.

const VIEWPORT = { width: 1280, height: 800 };
const TAMANO_MAXIMO_CUERPO = 4 * 1024;
const TIMEOUT_NAVEGACION_MS = 20000;
const ESPERA_TRAS_CARGA_MS = 1500;
const PROTOCOLOS_PERMITIDOS_EN_PETICIONES = new Set(['http:', 'https:', 'data:', 'blob:']);

type CodigoErrorRespuesta =
  | 'url-no-valida'
  | 'url-bloqueada'
  | 'web-no-accesible'
  | 'timeout'
  | 'metodo-no-permitido'
  | 'error-interno';

// Único tipo de error que puede llegar al catch de POST(): cualquier otro
// error (red, Playwright, JSON) se envuelve como 500 error-interno antes de
// responder — ver "aplicarViolaciones" más abajo.
class ErrorEscaneoHttp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErrorRespuesta,
    message: string,
  ) {
    super(message);
  }
}

// axe-core, inyectado en la página vía addScriptTag(), queda expuesto como
// global del navegador — sin tipos propios de axe-core ahí (esos tipos son
// para el uso en Node/import, no para el objeto global del navegador).
interface AxeGlobalEnPagina {
  run(
    context: Document,
    options: { runOnly: { type: 'tag'; values: string[] } },
  ): Promise<axe.AxeResults>;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const cuerpo = await leerCuerpoJson(request);
    const url =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { url?: unknown }).url : undefined;

    const formato = validarFormatoUrl(url);
    if (!formato.valida) {
      throw new ErrorEscaneoHttp(400, 'url-no-valida', 'La URL no tiene un formato válido.');
    }

    // Vive por petición: cachea el veredicto DNS por host mientras dura este
    // escaneo (URL inicial, redirecciones y subrecursos pueden repetir host).
    const cacheHost = new Map<string, boolean>();
    if (!(await hostPermitido(formato.url.hostname, cacheHost))) {
      throw new ErrorEscaneoHttp(400, 'url-bloqueada', 'La URL apunta a un host no permitido.');
    }

    const violaciones = await escanearUrl(formato.url, cacheHost);
    return Response.json({ violaciones } satisfies { violaciones: ViolacionAxe[] });
  } catch (error) {
    const errorHttp =
      error instanceof ErrorEscaneoHttp
        ? error
        : new ErrorEscaneoHttp(500, 'error-interno', mensajeDeError(error));
    return Response.json(
      { error: { codigo: errorHttp.codigo, mensaje: errorHttp.message } },
      { status: errorHttp.status },
    );
  }
}

async function leerCuerpoJson(request: Request): Promise<unknown> {
  const longitudDeclarada = request.headers.get('content-length');
  if (longitudDeclarada !== null && Number(longitudDeclarada) > TAMANO_MAXIMO_CUERPO) {
    throw new ErrorEscaneoHttp(
      400,
      'url-no-valida',
      'El cuerpo de la petición es demasiado grande.',
    );
  }

  const texto = await request.text();
  if (texto.length > TAMANO_MAXIMO_CUERPO) {
    throw new ErrorEscaneoHttp(
      400,
      'url-no-valida',
      'El cuerpo de la petición es demasiado grande.',
    );
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorEscaneoHttp(400, 'url-no-valida', 'El cuerpo de la petición no es JSON válido.');
  }
}

async function escanearUrl(url: URL, cacheHost: Map<string, boolean>): Promise<ViolacionAxe[]> {
  const browser = await lanzarNavegador();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      // Sin esto, page.route() no intercepta peticiones servidas por un
      // Service Worker de la web auditada — ver specs/12-escaneo-url.md.
      serviceWorkers: 'block',
    });
    try {
      return await escanearEnContexto(context, url, cacheHost);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function escanearEnContexto(
  context: BrowserContext,
  url: URL,
  cacheHost: Map<string, boolean>,
): Promise<ViolacionAxe[]> {
  const page = await context.newPage();
  let navegacionPrincipalBloqueada = false;

  // Filtra CADA petición (navegación, iframes y subrecursos): protege contra
  // que la propia web auditada cargue algo desde un host no permitido. NO
  // protege por sí solo las redirecciones de la navegación principal — ver
  // el chequeo de la cadena de redirecciones más abajo.
  await page.route('**/*', async (route) => {
    if (await peticionPermitida(route.request(), cacheHost)) {
      await route.continue();
      return;
    }
    if (route.request().isNavigationRequest() && route.request().frame() === page.mainFrame()) {
      navegacionPrincipalBloqueada = true;
    }
    await route.abort('blockedbyclient');
  });

  const respuesta = await navegar(page, url, () => navegacionPrincipalBloqueada);

  // page.route() solo ve la PRIMERA url de una redirección (documentado por
  // Playwright: "the handler will only be called for the first url if the
  // response is a redirect"), así que una web pública que redirige a un host
  // no permitido pasaría el filtro anterior sin ser detectada — confirmado
  // al implementar esta rebanada. Se reconstruye la cadena completa a partir
  // de la respuesta final (redirectedFrom()) y se revisa host por host.
  if (await algunSaltoBloqueado(cadenaDeRedirecciones(respuesta), cacheHost)) {
    throw new ErrorEscaneoHttp(
      400,
      'url-bloqueada',
      'La navegación pasó por un host no permitido.',
    );
  }
  if (respuesta.status() >= 400) {
    throw new ErrorEscaneoHttp(
      502,
      'web-no-accesible',
      `La web respondió con estado ${respuesta.status()}.`,
    );
  }

  await page.addScriptTag({ content: axe.source });
  const resultado = await page.evaluate(
    (tags) =>
      (window as unknown as { axe: AxeGlobalEnPagina }).axe.run(document, {
        runOnly: { type: 'tag', values: tags },
      }),
    TAGS_WCAG_2_2_A_AA,
  );

  const presupuesto = new PresupuestoCapturas(PRESUPUESTO_CAPTURAS_BASE64);
  const violaciones: ViolacionAxe[] = [];
  for (const violacion of resultado.violations) {
    violaciones.push({
      // id de la regla: el cliente traduce el help al español a partir de
      // él — ver specs/19-traduccion-axe.md.
      id: violacion.id,
      tags: violacion.tags,
      impact: violacion.impact,
      help: violacion.help,
      capturaPng: await capturarPrimerNodo(page, violacion.nodes[0]?.target, presupuesto),
    });
  }
  return violaciones;
}

// Captura el primer nodo afectado por una violación como evidencia — ver
// specs/13-captura-evidencia-escaneo.md. El recorte NO va pegado al elemento
// (un enlace de 77×13 px daba una miniatura ilegible): se resalta el
// elemento y se captura un área con contexto a su alrededor — ver
// specs/18-captura-con-contexto.md. undefined (sin lanzar) si el target no
// es un selector simple, si no resuelve a un único elemento visible de
// tamaño no nulo, o si la captura no cabe en el presupuesto de la ejecución:
// la violación se sigue aplicando igual, solo queda sin imagen.
async function capturarPrimerNodo(
  page: Page,
  target: unknown,
  presupuesto: PresupuestoCapturas,
): Promise<string | undefined> {
  const selector = selectorSimple(target);
  if (!selector) return undefined;

  try {
    const locator = page.locator(selector);
    if ((await locator.count()) !== 1) return undefined;

    await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
    const caja = await locator.boundingBox();
    if (!caja) return undefined;
    const recorte = recorteConContexto(caja, VIEWPORT);
    if (!recorte) return undefined;

    const quitarResaltado = await resaltar(locator);
    let buffer: Buffer;
    try {
      buffer = await page.screenshot({ type: 'png', clip: recorte, timeout: 5000 });
    } finally {
      await quitarResaltado();
    }

    const base64 = buffer.toString('base64');
    if (!presupuesto.admitir(base64.length)) return undefined;

    return `data:image/png;base64,${base64}`;
  } catch {
    // Elemento no encontrado, oculto, de tamaño cero o cualquier otro fallo
    // de Playwright al capturarlo: se descarta sin afectar al resto.
    return undefined;
  }
}

// Marca el elemento con un recuadro rojo para que se distinga dentro del
// recorte con contexto, y devuelve cómo deshacerlo: la página sigue viva
// para las capturas de las violaciones siguientes, así que el resaltado no
// puede quedarse puesto. Se restaura el atributo `style` completo (no solo
// las propiedades tocadas) para dejarlo exactamente como estaba, incluso si
// el elemento no tenía `style` propio.
async function resaltar(locator: Locator): Promise<() => Promise<void>> {
  const estiloPrevio = await locator.evaluate((elemento: HTMLElement) => {
    const previo = elemento.getAttribute('style');
    elemento.style.setProperty('outline', '3px solid #e11d48', 'important');
    elemento.style.setProperty('outline-offset', '2px', 'important');
    return previo;
  });

  return async () => {
    await locator.evaluate((elemento: HTMLElement, previo: string | null) => {
      if (previo === null) elemento.removeAttribute('style');
      else elemento.setAttribute('style', previo);
    }, estiloPrevio);
  };
}

async function peticionPermitida(
  peticion: PeticionPlaywright,
  cacheHost: Map<string, boolean>,
): Promise<boolean> {
  let urlPeticion: URL;
  try {
    urlPeticion = new URL(peticion.url());
  } catch {
    return false;
  }

  if (!PROTOCOLOS_PERMITIDOS_EN_PETICIONES.has(urlPeticion.protocol)) return false;
  if (urlPeticion.protocol === 'data:' || urlPeticion.protocol === 'blob:') return true; // sin host que resolver

  return hostPermitido(urlPeticion.hostname, cacheHost);
}

async function navegar(
  page: Page,
  url: URL,
  navegacionPrincipalBloqueada: () => boolean,
): Promise<RespuestaPlaywright> {
  try {
    const respuesta = await page.goto(url.toString(), {
      waitUntil: 'load',
      timeout: TIMEOUT_NAVEGACION_MS,
    });
    if (!respuesta) {
      throw new ErrorEscaneoHttp(
        502,
        'web-no-accesible',
        'La navegación no devolvió ninguna respuesta.',
      );
    }
    await page.waitForTimeout(ESPERA_TRAS_CARGA_MS);
    return respuesta;
  } catch (error) {
    if (error instanceof ErrorEscaneoHttp) throw error;
    if (navegacionPrincipalBloqueada()) {
      throw new ErrorEscaneoHttp(
        400,
        'url-bloqueada',
        'La navegación pasó por un host no permitido.',
      );
    }
    if (error instanceof erroresPlaywright.TimeoutError) {
      throw new ErrorEscaneoHttp(504, 'timeout', mensajeDeError(error));
    }
    throw new ErrorEscaneoHttp(502, 'web-no-accesible', mensajeDeError(error));
  }
}

// Reconstruye la cadena completa de la navegación principal (URL inicial →
// cada redirección → destino final) a partir de la respuesta que devuelve
// page.goto(), que solo expone el último salto directamente.
function cadenaDeRedirecciones(respuesta: RespuestaPlaywright): string[] {
  const urls: string[] = [];
  let peticion: PeticionPlaywright | null = respuesta.request();
  while (peticion) {
    urls.unshift(peticion.url());
    peticion = peticion.redirectedFrom();
  }
  return urls;
}

async function algunSaltoBloqueado(
  urls: string[],
  cacheHost: Map<string, boolean>,
): Promise<boolean> {
  for (const urlTexto of urls) {
    let url: URL;
    try {
      url = new URL(urlTexto);
    } catch {
      return true;
    }
    if (!PROTOCOLOS_PERMITIDOS_EN_PETICIONES.has(url.protocol)) return true;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue; // data:/blob:, sin host
    if (!(await hostPermitido(url.hostname, cacheHost))) return true;
  }
  return false;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
