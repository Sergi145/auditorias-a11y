import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Vistas públicas (funcionalidades, cómo funciona y accesibilidad) y su
// layout compartido con la bienvenida — ver specs/24-vistas-publicas.md.

// Etiquetas de axe equivalentes a WCAG 2.2 A/AA (las de 2.0 y 2.1 siguen
// siendo parte de 2.2).
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const MOVIL = { width: 320, height: 640 };

const VISTAS = [
  {
    enlace: 'Funcionalidades',
    url: '/funcionalidades',
    titulo: 'Funcionalidades · Auditorías A11y',
  },
  { enlace: 'Cómo funciona', url: '/como-funciona', titulo: 'Cómo funciona · Auditorías A11y' },
  {
    enlace: 'Accesibilidad',
    url: '/accesibilidad',
    titulo: 'Declaración de accesibilidad · Auditorías A11y',
  },
];

const PAGINAS_PUBLICAS = ['/bienvenida', ...VISTAS.map((vista) => vista.url)];

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

const navPrincipal = (page: Page) =>
  page.getByRole('banner').getByRole('navigation', { name: 'Principal' });
const navPie = (page: Page) => page.getByRole('navigation', { name: 'Enlaces del pie de página' });

// Marca la ventana: si la marca sigue ahí después de navegar, el cambio de
// vista ha sido del router y no una recarga completa.
async function marcarDocumento(page: Page): Promise<void> {
  await page.evaluate(() => ((window as unknown as { sinRecargar: boolean }).sinRecargar = true));
}

async function sigueSinRecargar(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { sinRecargar?: boolean }).sinRecargar === true);
}

test.describe('Navegación a las vistas públicas', () => {
  for (const vista of VISTAS) {
    test(`«${vista.enlace}» de la cabecera lleva a ${vista.url} sin recargar`, async ({ page }) => {
      await page.goto('/bienvenida');
      await marcarDocumento(page);

      await navPrincipal(page).getByRole('link', { name: vista.enlace, exact: true }).click();

      await expect(page).toHaveURL(vista.url);
      await expect(page).toHaveTitle(vista.titulo);
      expect(await sigueSinRecargar(page)).toBe(true);
    });

    test(`«${vista.enlace}» del pie lleva a ${vista.url} sin recargar`, async ({ page }) => {
      await page.goto('/bienvenida');
      await marcarDocumento(page);

      await navPie(page).getByRole('link', { name: vista.enlace, exact: true }).click();

      await expect(page).toHaveURL(vista.url);
      expect(await sigueSinRecargar(page)).toBe(true);
    });

    test(`«${vista.enlace}» del menú móvil lleva a ${vista.url} y cierra el menú`, async ({
      page,
    }) => {
      await page.setViewportSize(MOVIL);
      await page.goto('/bienvenida');
      await marcarDocumento(page);

      await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
      const menu = page.getByRole('dialog');
      await menu.getByRole('link', { name: vista.enlace, exact: true }).click();

      await expect(page).toHaveURL(vista.url);
      await expect(menu).toHaveCount(0);
      expect(await sigueSinRecargar(page)).toBe(true);
    });
  }

  test('los enlaces de la landing llevan a su vista', async ({ page }) => {
    const enlaces = [
      { texto: 'Ver todas las funcionalidades', url: '/funcionalidades' },
      { texto: 'Ver el proceso paso a paso', url: '/como-funciona' },
      { texto: 'Leer la declaración de accesibilidad', url: '/accesibilidad' },
      { texto: 'Ver cómo funciona', url: '/como-funciona' },
    ];
    for (const enlace of enlaces) {
      await page.goto('/bienvenida');
      await page.getByRole('main').getByRole('link', { name: enlace.texto, exact: true }).click();
      await expect(page).toHaveURL(enlace.url);
    }
  });

  test('recargar /accesibilidad muestra la vista, no redirige', async ({ page }) => {
    await page.goto('/accesibilidad');
    await page.reload();

    await expect(page).toHaveURL('/accesibilidad');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Declaración de accesibilidad' }),
    ).toBeVisible();
  });
});

test.describe('Enlace activo y foco', () => {
  test('solo el enlace de la vista actual tiene aria-current="page"', async ({ page }) => {
    await page.goto('/bienvenida');
    await expect(navPrincipal(page).locator('[aria-current]')).toHaveCount(0);

    for (const vista of VISTAS) {
      await page.goto(vista.url);
      const actual = navPrincipal(page).getByRole('link', { name: vista.enlace, exact: true });
      await expect(actual).toHaveAttribute('aria-current', 'page');
      await expect(navPrincipal(page).locator('[aria-current]')).toHaveCount(1);
      // No solo con color (WCAG 1.4.1): subrayado y peso.
      const estilo = await actual.evaluate((enlace) => {
        const calculado = getComputedStyle(enlace);
        return { subrayado: calculado.textDecorationLine, peso: calculado.fontWeight };
      });
      expect(estilo.subrayado).toContain('underline');
      expect(Number(estilo.peso)).toBeGreaterThanOrEqual(600);
    }
  });

  test('al cambiar de vista con el teclado el foco queda en #contenido', async ({ page }) => {
    await page.goto('/funcionalidades');

    for (const vista of [VISTAS[1], VISTAS[2], VISTAS[0]]) {
      await navPrincipal(page).getByRole('link', { name: vista.enlace, exact: true }).focus();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(vista.url);
      await expect(page.locator('#contenido')).toBeFocused();
    }
  });
});

test.describe('Contenido de cada vista', () => {
  for (const url of PAGINAS_PUBLICAS) {
    test(`${url} tiene un solo <h1> y los encabezados no saltan de nivel`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

      const niveles = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((encabezados) => encabezados.map((h) => Number(h.tagName[1])));
      for (let i = 1; i < niveles.length; i++) {
        expect(niveles[i], `encabezado ${i} (${niveles.join(', ')})`).toBeLessThanOrEqual(
          niveles[i - 1] + 1,
        );
      }
    });
  }

  for (const vista of VISTAS) {
    test(`${vista.url} tiene un único «Empezar una auditoría» que lleva a /auditorias/nueva`, async ({
      page,
    }) => {
      await page.goto(vista.url);
      const cta = page.getByRole('link', { name: 'Empezar una auditoría' });
      await expect(cta).toHaveCount(1);

      await cta.click();
      await expect(page).toHaveURL('/auditorias/nueva');
    });
  }

  test('/funcionalidades muestra 6 secciones con 2 a 4 puntos cada una', async ({ page }) => {
    await page.goto('/funcionalidades');
    const secciones = page.getByRole('main').locator('section');
    await expect(secciones).toHaveCount(6);

    for (const seccion of await secciones.all()) {
      await expect(seccion.getByRole('heading', { level: 2 })).toHaveCount(1);
      const puntos = await seccion.getByRole('listitem').count();
      expect(puntos).toBeGreaterThanOrEqual(2);
      expect(puntos).toBeLessThanOrEqual(4);
    }
  });

  test('/como-funciona muestra 6 pasos, cada uno con «Dónde:» y «Qué obtienes:»', async ({
    page,
  }) => {
    await page.goto('/como-funciona');
    const pasos = page.getByRole('main').locator('ol > li');
    await expect(pasos).toHaveCount(6);

    for (const paso of await pasos.all()) {
      await expect(paso.getByRole('heading', { level: 2 })).toHaveCount(1);
      await expect(paso.getByText('Dónde:', { exact: true })).toHaveCount(1);
      await expect(paso.getByText('Qué obtienes:', { exact: true })).toHaveCount(1);
    }
  });

  test('/accesibilidad tiene las secciones de una declaración y el correo de contacto', async ({
    page,
  }) => {
    await page.goto('/accesibilidad');
    // allTextContents() no espera: la vista se carga en diferido.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Declaración de accesibilidad' }),
    ).toBeVisible();

    const secciones = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(secciones.map((texto) => texto.trim())).toEqual([
      'Compromiso',
      'Estado de cumplimiento',
      'Cómo se comprueba',
      'Limitaciones conocidas',
      'Informar de un problema',
      'Fecha de la declaración',
    ]);
    await expect(page.getByRole('link', { name: 'sergipicazo14@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:sergipicazo14@gmail.com',
    );
  });
});

test.describe('Axe y reflow', () => {
  for (const tamano of [
    { nombre: 'escritorio', viewport: { width: 1280, height: 800 } },
    { nombre: 'móvil 320 px', viewport: MOVIL },
  ]) {
    for (const url of PAGINAS_PUBLICAS) {
      test(`${url} en ${tamano.nombre}: axe sin violaciones y sin scroll horizontal`, async ({
        page,
      }) => {
        await page.setViewportSize(tamano.viewport);
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
        expect(resultado.violations).toEqual([]);

        const desborda = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(desborda, 'scroll horizontal').toBe(false);
      });
    }
  }
});
