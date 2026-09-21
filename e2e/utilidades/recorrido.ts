import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Locator, type Page, type TestInfo } from '@playwright/test';

// Utilidades compartidas de los recorridos de usuario — ver
// specs/22-pruebas-usuario-ux.md. Todo lo que se comprueba aquí se hace
// "como un usuario": selectores por rol y nombre accesible, y lo que oiría
// un lector de pantalla (regiones aria-live) en vez de detalles internos.

// Etiquetas de axe equivalentes a WCAG 2.2 A/AA (las de 2.0 y 2.1 siguen
// siendo parte de 2.2). Exportadas para los e2e que pasan axe con un diálogo
// abierto, que `pasarAxe` no admite (espera a que no haya ningún fondo).
export const ETIQUETAS_WCAG =['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

export interface Recorrido {
  // Errores de consola y excepciones no capturadas vistas durante el test.
  erroresConsola: string[];
  // Pasa axe sobre la pantalla actual y registra sus violaciones (fallo
  // "soft": el recorrido sigue para descubrir más problemas).
  pasarAxe(pantalla: string): Promise<void>;
  // Comprobaciones de cada pantalla del recorrido: axe y, en viewport móvil,
  // además reflow sin scroll horizontal (WCAG 1.4.10) y objetivos táctiles
  // de al menos 24×24 px (WCAG 2.5.8).
  revisarPantalla(pantalla: string): Promise<void>;
  // Comprueba que el foco no se ha perdido en <body> tras una acción.
  comprobarFoco(momento: string): Promise<void>;
  // Textos anunciados por regiones aria-live (LiveAnnouncer, role=status…)
  // desde el inicio del test, en orden — lo que "oiría" un lector de pantalla.
  anuncios(): Promise<string[]>;
  // Guarda el árbol de accesibilidad de la pantalla como adjunto del test.
  adjuntarArbolAria(pantalla: string): Promise<void>;
}

// Script que se inyecta antes de cargar la app: registra cada texto que
// aparece dentro de una región aria-live (o role=status/alert), igual que lo
// leería un lector de pantalla.
function registrarAnuncios(): void {
  const registro: string[] = [];
  (window as unknown as { __anuncios: string[] }).__anuncios = registro;
  const esRegionViva = (nodo: Node | null): boolean => {
    const elemento = nodo instanceof Element ? nodo : nodo?.parentElement;
    return !!elemento?.closest(
      '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]',
    );
  };
  const observador = new MutationObserver((mutaciones) => {
    for (const mutacion of mutaciones) {
      if (!esRegionViva(mutacion.target)) continue;
      const texto = (mutacion.target.textContent ?? '').trim();
      if (texto && registro[registro.length - 1] !== texto) registro.push(texto);
    }
  });
  document.addEventListener('DOMContentLoaded', () =>
    observador.observe(document.body, { childList: true, subtree: true, characterData: true }),
  );
}

function crearRecorrido(page: Page, testInfo: TestInfo): Recorrido {
  const erroresConsola: string[] = [];
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresConsola.push(mensaje.text());
  });
  page.on('pageerror', (error) => erroresConsola.push(error.message));

  return {
    erroresConsola,
    async pasarAxe(pantalla) {
      // Se espera a que acaben las transiciones (p. ej. el fundido del fondo
      // del modal de confirmación al cerrarse): a mitad de un fundido axe
      // mide colores semitransparentes y da falsos fallos de contraste.
      await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
      await page.waitForFunction(() => document.getAnimations().length === 0);
      const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
      const violaciones = resultado.violations.map((violacion) => ({
        regla: violacion.id,
        impacto: violacion.impact,
        ayuda: violacion.help,
        nodos: violacion.nodes.map((nodo) => nodo.target.join(' ')),
      }));
      if (violaciones.length > 0) {
        await testInfo.attach(`axe — ${pantalla}`, {
          body: JSON.stringify(violaciones, null, 2),
          contentType: 'application/json',
        });
      }
      expect
        .soft(
          violaciones,
          `axe en «${pantalla}» (${esMovil(page) ? 'móvil 320 px' : 'escritorio'})`,
        )
        .toEqual([]);
    },
    async revisarPantalla(pantalla) {
      await this.pasarAxe(pantalla);
      if (!esMovil(page)) return;

      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect.soft(desborde, `scroll horizontal en «${pantalla}» a 320 px`).toBeLessThanOrEqual(0);

      // Controles interactivos visibles de menos de 24×24 px que además no
      // cumplen la excepción de separación de WCAG 2.5.8: un círculo de 24 px
      // de diámetro centrado en el objetivo no puede tocar otro objetivo ni
      // el círculo de otro objetivo pequeño. Se excluyen los enlaces dentro
      // de un texto (excepción "inline").
      const pequenos = await page.evaluate(() => {
        const objetivos = [
          ...document.querySelectorAll<HTMLElement>(
            'button, select, input:not([type="hidden"]), textarea, [role="button"], [role="tab"], a[appbutton], nav a',
          ),
        ]
          .filter((el) => el.checkVisibility() && !el.closest('.sr-only, .cdk-visually-hidden'))
          .map((el) => ({ el, caja: el.getBoundingClientRect() }))
          .filter(({ caja }) => caja.width > 0 && caja.height > 0);
        const centro = (caja: DOMRect) => ({
          x: caja.left + caja.width / 2,
          y: caja.top + caja.height / 2,
        });
        const esPequeno = (caja: DOMRect) => caja.width < 24 || caja.height < 24;
        const distanciaARect = (p: { x: number; y: number }, caja: DOMRect) =>
          Math.hypot(
            Math.max(caja.left - p.x, 0, p.x - caja.right),
            Math.max(caja.top - p.y, 0, p.y - caja.bottom),
          );
        return objetivos
          .filter(({ caja }) => esPequeno(caja))
          .filter(({ el, caja }) => {
            const c = centro(caja);
            return objetivos.some(
              (otro) =>
                otro.el !== el &&
                !otro.el.contains(el) &&
                !el.contains(otro.el) &&
                (distanciaARect(c, otro.caja) < 12 ||
                  (esPequeno(otro.caja) &&
                    Math.hypot(c.x - centro(otro.caja).x, c.y - centro(otro.caja).y) < 24)),
            );
          })
          .map(({ el, caja }) => {
            const nombre = (el.getAttribute('aria-label') ?? el.textContent ?? '')
              .trim()
              .slice(0, 40);
            return `${el.tagName.toLowerCase()} «${nombre}» ${Math.round(caja.width)}×${Math.round(caja.height)}`;
          });
      });
      expect.soft(pequenos, `objetivos táctiles < 24×24 px en «${pantalla}»`).toEqual([]);
    },
    async comprobarFoco(momento) {
      // Se deja renderizar a Angular (dos frames) antes de mirar: si no, la
      // comprobación puede llegar antes de que desaparezca el elemento
      // enfocado y el resultado dependería de la velocidad de la máquina.
      await page.evaluate(
        () => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))),
      );
      const enfocado = await page.evaluate(() => {
        const activo = document.activeElement;
        return !activo || activo === document.body ? null : activo.outerHTML.slice(0, 120);
      });
      expect.soft(enfocado, `el foco no debería quedarse en <body> ${momento}`).not.toBeNull();
    },
    async anuncios() {
      return page.evaluate(() => (window as unknown as { __anuncios?: string[] }).__anuncios ?? []);
    },
    async adjuntarArbolAria(pantalla) {
      await testInfo.attach(`árbol aria — ${pantalla}`, {
        body: await page.locator('body').ariaSnapshot(),
        contentType: 'text/yaml',
      });
    },
  };
}

export function esMovil(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 640;
}

// Navega por el menú principal del shell. En móvil el menú está plegado en
// el cajón: se abre con su botón, que es justo lo que se quiere comprobar.
export async function irPorMenu(page: Page, enlace: string): Promise<void> {
  const abrirMenu = page.getByRole('button', { name: 'Abrir menú de navegación' });
  if (await abrirMenu.isVisible()) await abrirMenu.click();
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: enlace, exact: true })
    .filter({ visible: true })
    .click();
}

// Pulsa Tab (o Shift+Tab) hasta que el foco llega al elemento indicado, como
// haría un usuario de teclado. Falla si no lo alcanza en `maximo` pulsaciones.
export async function tabularHasta(
  page: Page,
  destino: Locator,
  { maximo = 250, atras = false } = {},
): Promise<void> {
  for (let i = 0; i < maximo; i++) {
    if (await destino.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(atras ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`No se llega con el teclado a ${destino} en ${maximo} pulsaciones`);
}

// `test` con un `recorrido` por test: inyecta el registro de anuncios y, al
// terminar, falla si hubo errores de consola.
export const test = base.extend<{ recorrido: Recorrido }>({
  recorrido: async ({ page }, use, testInfo) => {
    await page.addInitScript(registrarAnuncios);
    const recorrido = crearRecorrido(page, testInfo);
    await use(recorrido);
    expect(recorrido.erroresConsola, 'errores de consola durante el recorrido').toEqual([]);
  },
});

export { expect };

// ---------------------------------------------------------------------------
// Pasos de usuario reutilizados por varios recorridos.
// ---------------------------------------------------------------------------

export interface DatosAuditoria {
  nombre: string;
  cliente?: string;
  url?: string;
}

export async function crearAuditoria(page: Page, datos: DatosAuditoria): Promise<void> {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill(datos.nombre);
  await page.getByLabel('Cliente').fill(datos.cliente ?? 'Cliente de prueba');
  await page.getByLabel('URL base').fill(datos.url ?? 'https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('01/01/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();
  await expect(page.getByRole('heading', { level: 1, name: datos.nombre })).toBeVisible();
}

// Desde el detalle de la auditoría.
export async function anadirPagina(page: Page, nombre: string, url: string): Promise<void> {
  await page.getByRole('link', { name: 'Añadir página' }).click();
  await page.getByLabel('Nombre de la página').fill(nombre);
  await page.getByLabel('URL', { exact: true }).fill(url);
  await page.getByRole('button', { name: 'Añadir página' }).click();
  await expect(page.getByRole('link', { name: nombre })).toBeVisible();
}

export function filaCriterio(page: Page, codigo: string) {
  return page.locator('tr').filter({ has: page.locator('strong', { hasText: codigo }) });
}

// Desde el checklist de una página.
export async function abrirCriterio(page: Page, codigo: string): Promise<void> {
  await filaCriterio(page, codigo)
    .getByRole('link', { name: /^Revisar/ })
    .click();
  await expect(
    page.getByRole('heading', { name: new RegExp(codigo.replaceAll('.', '\\.')) }),
  ).toBeVisible();
}
