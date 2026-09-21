import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const IMAGEN_VALIDA = path.join(__dirname, 'fixtures', 'evidencia.png');

// Crea una auditoría y una página desde la UI (sin acceso directo a Dexie:
// mismo camino que seguiría quien audita) y deja la pantalla de escaneo
// abierta en la pestaña "URL en vivo", lista para interceptar
// /api/escanear-url — ver specs/12-escaneo-url.md.
async function crearPaginaYAbrirEscaneoUrl(page: Page, urlPagina: string): Promise<void> {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill('Auditoría de prueba');
  await page.getByLabel('Cliente').fill('Cliente de prueba');
  await page.getByLabel('URL base').fill('https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('01/01/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();

  await page.getByRole('link', { name: 'Añadir página' }).click();
  await page.getByLabel('Nombre de la página').fill('Página de prueba');
  await page.getByLabel('URL', { exact: true }).fill(urlPagina);
  await page.getByRole('button', { name: 'Añadir página' }).click();

  await page.getByRole('link', { name: 'Página de prueba' }).click();
  await page.getByRole('link', { name: 'Escanear automáticamente' }).click();
  await page.getByRole('tab', { name: 'URL en vivo' }).click();
  await expect(page.locator('#url-panel')).toBeVisible();
}

function botonEjecutarEscaneo(page: Page) {
  return page.getByRole('button', { name: /Ejecutar escaneo|Escaneando…/ });
}

// Texto que hay ahora mismo en las regiones del LiveAnnouncer: lo que
// anunciaría un lector de pantalla.
const anunciado = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.cdk-live-announcer-element'))
      .map((region) => (region.textContent ?? '').trim())
      .join('|'),
  );

test('al empezar un escaneo de URL se anuncia a los lectores de pantalla', async ({ page }) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');

  // La respuesta se retiene hasta comprobar el aviso: el escaneo sigue en
  // marcha, que es cuando quien usa un lector de pantalla necesita saberlo.
  let liberarRespuesta!: () => void;
  const respuestaLiberada = new Promise<void>((resolver) => (liberarRespuesta = resolver));
  await page.route('**/api/escanear-url', async (route) => {
    await respuestaLiberada;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ violaciones: [] }),
    });
  });

  await botonEjecutarEscaneo(page).click();

  await expect(botonEjecutarEscaneo(page)).toHaveText('Escaneando…');
  await expect.poll(() => anunciado(page)).toContain('Escaneando la URL');

  liberarRespuesta();
  await expect(page).toHaveURL(/\/paginas\/\d+$/);
});

test('al empezar un escaneo de HTML pegado se anuncia a los lectores de pantalla', async ({
  page,
}) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');
  await page.getByRole('tab', { name: 'Pegar HTML' }).click();
  await page
    .getByLabel('HTML de la página')
    .fill('<!doctype html><html lang="es"><title>Prueba</title><img src="x.png"></html>');

  await botonEjecutarEscaneo(page).click();

  await expect.poll(() => anunciado(page)).toContain('Escaneando el HTML');
});

test('un escaneo de URL con violaciones marca el criterio como Falla automática y vuelve al checklist', async ({
  page,
}) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');

  await page.route('**/api/escanear-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        violaciones: [{ tags: ['wcag111'], impact: 'critical', help: 'Falta texto alternativo' }],
      }),
    });
  });

  await botonEjecutarEscaneo(page).click();

  await expect(
    page.getByText('Escaneo completado: 1 criterio(s) marcado(s) como Falla automática.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/paginas\/\d+$/);

  const filaCriterio111 = page
    .locator('tr')
    .filter({ has: page.locator('strong', { hasText: '1.1.1' }) });
  await expect(filaCriterio111).toContainText('Falla');
  await expect(filaCriterio111).toContainText('Automático');
});

test('una URL bloqueada muestra su mensaje de error y se queda en la pantalla de escaneo', async ({
  page,
}) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');

  await page.route('**/api/escanear-url', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { codigo: 'url-bloqueada', mensaje: 'IP no permitida' } }),
    });
  });

  await botonEjecutarEscaneo(page).click();

  await expect(
    page.getByText(
      'La URL de esta página no se puede escanear: no es una dirección pública válida.',
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/escaneo$/);
  await expect(botonEjecutarEscaneo(page)).toHaveText('Ejecutar escaneo');
});

test('un fallo de red al escanear la URL se comunica como servicio no disponible', async ({
  page,
}) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');

  await page.route('**/api/escanear-url', (route) => route.abort());

  await botonEjecutarEscaneo(page).click();

  await expect(
    page.getByText(
      'El servicio de escaneo de URL no está disponible ahora mismo. Puedes usar «Pegar HTML».',
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/escaneo$/);
});

test('una violación con captura de pantalla la guarda como evidencia del hallazgo automático', async ({
  page,
}) => {
  await crearPaginaYAbrirEscaneoUrl(page, 'https://pagina-a-escanear.test/');

  const capturaPng = `data:image/png;base64,${readFileSync(IMAGEN_VALIDA).toString('base64')}`;
  await page.route('**/api/escanear-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        violaciones: [
          { tags: ['wcag111'], impact: 'critical', help: 'Falta texto alternativo', capturaPng },
        ],
      }),
    });
  });

  await botonEjecutarEscaneo(page).click();
  await expect(
    page.getByText('Escaneo completado: 1 criterio(s) marcado(s) como Falla automática.'),
  ).toBeVisible();

  const filaCriterio111 = page
    .locator('tr')
    .filter({ has: page.locator('strong', { hasText: '1.1.1' }) });
  await filaCriterio111.getByRole('link', { name: 'Revisar' }).click();
  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();

  const imagen = page.getByRole('img', { name: 'Falta texto alternativo' });
  await expect(imagen).toBeVisible();
  const enlace = page.locator('a').filter({ has: imagen });
  await expect(enlace).toContainText('(se abre en una pestaña nueva)');
});
