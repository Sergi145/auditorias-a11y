import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Paginación del listado de auditorías — ver
// specs/23-paginacion-auditorias.md. Comprueba desde el navegador lo que el
// usuario percibe: nombres accesibles, foco, lo anunciado a lectores de
// pantalla, la URL y el historial.

// Etiquetas de axe equivalentes a WCAG 2.2 A/AA (las de 2.0 y 2.1 siguen
// siendo parte de 2.2).
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const MOVIL = { width: 320, height: 640 };

let erroresConsola: string[] = [];

test.beforeEach(({ page }) => {
  erroresConsola = [];
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresConsola.push(mensaje.text());
  });
  page.on('pageerror', (error) => erroresConsola.push(error.message));
});

test.afterEach(() => {
  expect(erroresConsola, 'errores de consola').toEqual([]);
});

const titulo = (page: Page) => page.getByRole('heading', { level: 1, name: 'Auditorías' });
const tarjetas = (page: Page) => page.getByRole('article');
const paginacion = (page: Page) =>
  page.getByRole('navigation', { name: 'Paginación de auditorías' });

// Crea `total` auditorías ("Auditoria 001", "Auditoria 002"…, la 001 es la más
// antigua) escribiendo directamente en IndexedDB: hacerlo por la interfaz
// para llegar a 90 auditorías sería lentísimo y aquí no se prueba el
// formulario de alta. Después hay que cargar la página de nuevo (`goto`), no
// esperar a que la pantalla actual se refresque.
async function sembrarAuditorias(page: Page, total: number): Promise<void> {
  await page.goto('/auditorias');
  await expect(titulo(page)).toBeVisible();
  await page.evaluate(async (cuantas) => {
    const db = await new Promise<IDBDatabase>((resolver, rechazar) => {
      const peticion = indexedDB.open('auditorias-a11y');
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => rechazar(peticion.error);
    });
    await new Promise<void>((resolver, rechazar) => {
      const transaccion = db.transaction('auditorias', 'readwrite');
      const almacen = transaccion.objectStore('auditorias');
      for (let i = 1; i <= cuantas; i++) {
        almacen.add({
          nombre: `Auditoria ${String(i).padStart(3, '0')}`,
          cliente: 'ACME',
          url_base: 'https://ejemplo.test',
          fecha_inicio: '2026-09-01',
          estandar_objetivo: 'AA',
          estado: 'en_progreso',
        });
      }
      transaccion.oncomplete = () => resolver();
      transaccion.onerror = () => rechazar(transaccion.error);
    });
    db.close();
  }, total);
}

// Texto que hay ahora mismo en las regiones del LiveAnnouncer: lo que
// anunciaría un lector de pantalla.
const anunciado = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.cdk-live-announcer-element'))
      .map((region) => (region.textContent ?? '').trim())
      .join('|'),
  );

// Páginas y "…" en el orden en que se ven, sin "Anterior" ni "Siguiente".
const numerosVisibles = (page: Page) =>
  paginacion(page)
    .locator('li')
    .evaluateAll((elementos) =>
      elementos
        .map((elemento) => {
          if (elemento.getAttribute('aria-hidden') === 'true') return '…';
          const numero = /Página (\d+)$/.exec(
            (elemento.textContent ?? '').replace(/\s+/g, ' ').trim(),
          );
          return numero ? numero[1] : null;
        })
        .filter((valor) => valor !== null),
    );

async function anilloDeFoco(control: Locator): Promise<{ estilo: string; ancho: number }> {
  return control.evaluate((elemento) => {
    const estilos = getComputedStyle(elemento);
    return { estilo: estilos.outlineStyle, ancho: parseFloat(estilos.outlineWidth) };
  });
}

async function comprobarAxe(page: Page, pantalla: string): Promise<void> {
  // Sin animaciones en curso: a mitad de una transición axe mide colores
  // semitransparentes y da falsos fallos de contraste.
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  const violaciones = resultado.violations.map(
    (violacion) =>
      `${violacion.id}: ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(', ')}`,
  );
  expect(violaciones, `axe en «${pantalla}»`).toEqual([]);
}

test.describe('Cuándo aparece y qué muestra', () => {
  test('con 9 auditorías no hay paginación', async ({ page }) => {
    await sembrarAuditorias(page, 9);
    await page.goto('/auditorias');

    await expect(tarjetas(page)).toHaveCount(9);
    await expect(paginacion(page)).toHaveCount(0);
  });

  test('con 10 aparece: 9 tarjetas en la página 1, 1 en la 2, y la más reciente va primero', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 10);
    await page.goto('/auditorias');

    await expect(paginacion(page)).toBeVisible();
    await expect(tarjetas(page)).toHaveCount(9);
    await expect(tarjetas(page).first().getByRole('heading')).toContainText('Auditoria 010');
    await expect(page.getByText('Auditoria 001')).toHaveCount(0);

    await paginacion(page).getByRole('link', { name: 'Página 2', exact: true }).click();
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page).first().getByRole('heading')).toContainText('Auditoria 001');
  });

  test('solo la página actual lleva aria-current="page"', async ({ page }) => {
    await sembrarAuditorias(page, 30);
    await page.goto('/auditorias?pagina=3');

    const actuales = paginacion(page).locator('[aria-current]');
    await expect(actuales).toHaveCount(1);
    await expect(actuales).toHaveAttribute('aria-current', 'page');
    await expect(actuales).toHaveText(/Página 3/);
  });

  test('con 10 páginas, estando en la 5, se ven 1 … 5 … 10', async ({ page }) => {
    await sembrarAuditorias(page, 90);
    await page.goto('/auditorias?pagina=5');
    await expect(paginacion(page)).toBeVisible();

    expect(await numerosVisibles(page)).toEqual(['1', '…', '5', '…', '10']);
  });

  test('en la primera página, "Página anterior" no es un enlace activo; en la última, "Página siguiente" tampoco', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 20); // 3 páginas
    await page.goto('/auditorias');
    const anterior = paginacion(page).getByRole('link', { name: 'Página anterior' });
    await expect(anterior).toHaveAttribute('aria-disabled', 'true');
    await expect(anterior).not.toHaveAttribute('href');
    expect(await anterior.evaluate((elemento) => elemento.tagName)).toBe('SPAN');
    expect(await anterior.evaluate((elemento) => (elemento as HTMLElement).tabIndex)).toBe(-1);
    await expect(paginacion(page).getByRole('link', { name: 'Página siguiente' })).toHaveAttribute(
      'href',
      /pagina=2$/,
    );

    await page.goto('/auditorias?pagina=3');
    const siguiente = paginacion(page).getByRole('link', { name: 'Página siguiente' });
    await expect(siguiente).toHaveAttribute('aria-disabled', 'true');
    await expect(siguiente).not.toHaveAttribute('href');
    expect(await siguiente.evaluate((elemento) => elemento.tagName)).toBe('SPAN');
    await expect(paginacion(page).getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      /pagina=2$/,
    );
  });
});

test.describe('Navegar entre páginas', () => {
  test('«Página siguiente» cambia la URL, deja el foco en el <h1> y lo anuncia', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 30); // 4 páginas
    await page.goto('/auditorias');
    await expect(tarjetas(page)).toHaveCount(9);
    expect(await anunciado(page), 'la carga inicial no anuncia nada').toBe('');

    await paginacion(page).getByRole('link', { name: 'Página siguiente' }).click();

    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(titulo(page)).toBeFocused();
    await expect.poll(() => anunciado(page)).toContain('Página 2 de 4. Auditorías 10 a 18 de 30.');
  });

  test('volver a la página 1 deja la URL sin `pagina`', async ({ page }) => {
    await sembrarAuditorias(page, 20);
    await page.goto('/auditorias?pagina=2');
    await expect(tarjetas(page)).toHaveCount(9);

    await paginacion(page).getByRole('link', { name: 'Página 1', exact: true }).click();

    await expect(page).toHaveURL(/\/auditorias$/);
    await expect(titulo(page)).toBeFocused();
    await expect.poll(() => anunciado(page)).toContain('Página 1 de 3. Auditorías 1 a 9 de 20.');
  });

  test('recargar (F5) en ?pagina=2 mantiene la página 2 y no anuncia nada', async ({ page }) => {
    await sembrarAuditorias(page, 10);
    await page.goto('/auditorias?pagina=2');
    await expect(page.getByText('Auditoria 001')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(page.getByText('Auditoria 001')).toBeVisible();
    expect(await anunciado(page)).toBe('');
  });

  test('«Atrás» y «Adelante» del navegador cambian de página con el foco en el <h1>', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 10);
    await page.goto('/auditorias');
    await paginacion(page).getByRole('link', { name: 'Página siguiente' }).click();
    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/auditorias$/);
    await expect(tarjetas(page)).toHaveCount(9);
    await expect(titulo(page)).toBeFocused();

    await page.goForward();
    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(titulo(page)).toBeFocused();
  });

  test('entrar en /auditorias?pagina=2 desde otra pantalla enfoca el contenido, como el resto de navegaciones', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 10);
    await page.goto('/auditorias?pagina=2');
    await page.getByRole('link', { name: /Auditoria 001/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoria 001' })).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(page.locator('#contenido')).toBeFocused();
  });
});

test.describe('?pagina inválido o fuera de rango', () => {
  test('se corrige sin anunciar nada ni mover el foco', async ({ page }) => {
    await sembrarAuditorias(page, 20); // 3 páginas
    for (const [entrada, esperada, tarjetasEsperadas] of [
      ['abc', /\/auditorias$/, 9],
      ['0', /\/auditorias$/, 9],
      ['-2', /\/auditorias$/, 9],
      ['1', /\/auditorias$/, 9],
      ['99', /\/auditorias\?pagina=3$/, 2],
    ] as const) {
      await page.goto(`/auditorias?pagina=${entrada}`);
      await expect(page, `?pagina=${entrada}`).toHaveURL(esperada);
      await expect(tarjetas(page), `?pagina=${entrada}`).toHaveCount(tarjetasEsperadas);
      await expect(titulo(page), `?pagina=${entrada}`).not.toBeFocused();
      expect(await anunciado(page), `?pagina=${entrada}`).toBe('');
    }
  });

  test('«Atrás» no vuelve a la URL inválida', async ({ page }) => {
    await sembrarAuditorias(page, 20);
    await page.goto('/auditorias');
    await expect(tarjetas(page)).toHaveCount(9);
    await page.goto('/auditorias?pagina=99');
    await expect(page).toHaveURL(/\/auditorias\?pagina=3$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/auditorias$/);
  });

  test('con 9 auditorías o menos, cualquier ?pagina se retira', async ({ page }) => {
    await sembrarAuditorias(page, 9);
    await page.goto('/auditorias?pagina=2');

    await expect(page).toHaveURL(/\/auditorias$/);
    await expect(tarjetas(page)).toHaveCount(9);
    await expect(paginacion(page)).toHaveCount(0);
  });

  test('borrar la única auditoría de la última página y volver atrás no deja una página vacía', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 19); // 9 + 9 + 1
    await page.goto('/auditorias?pagina=3');
    await expect(tarjetas(page)).toHaveCount(1);
    await page.getByRole('link', { name: /Auditoria 001/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoria 001' })).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar auditoría' }).click();
    await expect(titulo(page)).toBeVisible();

    // Atrás: la auditoría borrada. Otra vez Atrás: /auditorias?pagina=3, que
    // ya no existe (quedan 18, en 2 páginas) y se corrige a la última.
    await page.goBack();
    await expect(page.getByText('No se ha encontrado la auditoría.')).toBeVisible();
    await page.goBack();

    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(tarjetas(page)).toHaveCount(9);
    await expect(paginacion(page).locator('[aria-current="page"]')).toHaveText(/Página 2/);
  });
});

test.describe('Solo teclado', () => {
  test('Tab, Shift+Tab y Enter recorren y usan la paginación, con el anillo de foco visible', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 30); // 4 páginas: 1 2 3 4
    await page.goto('/auditorias');
    await expect(tarjetas(page)).toHaveCount(9);
    const enlace = (nombre: string) =>
      paginacion(page).getByRole('link', { name: nombre, exact: true });

    // Tras la última tarjeta, el primer control es «Página 1»: «Página
    // anterior» está desactivado y no entra en el orden de tabulación.
    await tarjetas(page).last().getByRole('link').focus();
    await page.keyboard.press('Tab');
    await expect(enlace('Página 1')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(tarjetas(page).last().getByRole('link')).toBeFocused();
    await page.keyboard.press('Tab');

    for (const nombre of ['Página 2', 'Página 3', 'Página 4', 'Página siguiente']) {
      await page.keyboard.press('Tab');
      await expect(enlace(nombre)).toBeFocused();
      const anillo = await anilloDeFoco(enlace(nombre));
      expect(anillo.estilo, `anillo de «${nombre}»`).not.toBe('none');
      expect(anillo.ancho, `anillo de «${nombre}»`).toBeGreaterThanOrEqual(2);
    }

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/auditorias\?pagina=2$/);
    await expect(titulo(page)).toBeFocused();
    await expect.poll(() => anunciado(page)).toContain('Página 2 de 4');
  });

  test('en la última página, tras el último número el foco sale de la paginación', async ({
    page,
  }) => {
    await sembrarAuditorias(page, 20); // 3 páginas
    await page.goto('/auditorias?pagina=3');
    await expect(tarjetas(page)).toHaveCount(2);

    await paginacion(page).getByRole('link', { name: 'Página 3', exact: true }).focus();
    await page.keyboard.press('Tab');

    await expect(paginacion(page).locator(':focus')).toHaveCount(0);
  });
});

test.describe('Escritorio y móvil', () => {
  test('a 1280 px «Página anterior» y «Página siguiente» muestran su texto y los controles miden al menos 40×40 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await sembrarAuditorias(page, 90);
    await page.goto('/auditorias?pagina=5');
    await expect(paginacion(page)).toBeVisible();

    await expect(paginacion(page).getByText('Página anterior')).toBeVisible();
    await expect(paginacion(page).getByText('Página siguiente')).toBeVisible();
    const cajas = await paginacion(page)
      .locator('li:not([aria-hidden="true"]) > *')
      .evaluateAll((controles) =>
        controles.map((control) => {
          const caja = control.getBoundingClientRect();
          return { ancho: caja.width, alto: caja.height };
        }),
      );
    for (const caja of cajas) {
      expect(caja.ancho).toBeGreaterThanOrEqual(40);
      expect(caja.alto).toBeGreaterThanOrEqual(40);
    }
  });

  test('a 320×640: una sola línea, sin scroll horizontal, con nombres accesibles y objetivos de al menos 32×32 px', async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await sembrarAuditorias(page, 90);
    await page.goto('/auditorias?pagina=5');
    await expect(paginacion(page)).toBeVisible();

    const medidas = await paginacion(page)
      .locator('li')
      .evaluateAll((elementos) =>
        elementos.map((elemento) => {
          // Los "…" son un <li> con solo texto; el resto, un <li> con un
          // enlace (o un texto inactivo) dentro, que es el objetivo táctil.
          const caja = elemento.getBoundingClientRect();
          const oculto = elemento.getAttribute('aria-hidden') === 'true';
          const objetivo = oculto ? caja : elemento.firstElementChild!.getBoundingClientRect();
          return {
            oculto,
            arriba: Math.round(caja.top),
            ancho: objetivo.width,
            alto: objetivo.height,
          };
        }),
      );
    expect(new Set(medidas.map((medida) => medida.arriba)).size, 'una sola línea').toBe(1);
    for (const medida of medidas.filter((valor) => !valor.oculto)) {
      expect(medida.ancho).toBeGreaterThanOrEqual(32);
      expect(medida.alto).toBeGreaterThanOrEqual(32);
    }
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde, 'scroll horizontal').toBeLessThanOrEqual(0);

    // Solo icono a la vista, pero con nombre accesible «Página anterior» /
    // «Página siguiente».
    await expect(paginacion(page).getByRole('link', { name: 'Página anterior' })).toBeVisible();
    await expect(paginacion(page).getByRole('link', { name: 'Página siguiente' })).toBeVisible();
    for (const texto of ['Página anterior', 'Página siguiente']) {
      const caja = await paginacion(page).getByText(texto).boundingBox();
      expect(caja!.width, `texto «${texto}» a la vista`).toBeLessThanOrEqual(1);
    }
    expect(await numerosVisibles(page)).toEqual(['1', '…', '5', '…', '10']);
  });
});

test.describe('Axe (WCAG 2.2 A/AA)', () => {
  for (const [entorno, viewport] of [
    ['escritorio', { width: 1280, height: 800 }],
    ['móvil 320 px', MOVIL],
  ] as const) {
    test(`/auditorias paginada, en ${entorno}: sin violaciones en primera, intermedia y última página`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await sembrarAuditorias(page, 90); // 10 páginas
      for (const numero of [1, 5, 10]) {
        await page.goto(numero === 1 ? '/auditorias' : `/auditorias?pagina=${numero}`);
        await expect(paginacion(page)).toBeVisible();
        await expect(tarjetas(page)).toHaveCount(9);
        await comprobarAxe(page, `/auditorias, página ${numero} (${entorno})`);
      }
    });
  }
});
