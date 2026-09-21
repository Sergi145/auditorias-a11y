import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Download, Locator, Page } from '@playwright/test';
import {
  abrirCriterio,
  anadirPagina,
  crearAuditoria,
  expect,
  filaCriterio,
  irPorMenu,
  tabularHasta,
  test,
  type Recorrido,
} from './utilidades/recorrido';

// Recorridos de usuario de principio a fin — ver
// specs/22-pruebas-usuario-ux.md. A diferencia del resto de e2e (uno por
// rebanada), aquí se encadenan pantallas como lo haría un auditor real.
// Las comprobaciones funcionales son duras (el recorrido no puede seguir si
// fallan); las de experiencia (axe, foco, anuncios) son "soft" para que un
// mismo recorrido destape todos los problemas de una vez.

const IMAGEN_EVIDENCIA = path.join(__dirname, 'fixtures', 'evidencia.png');

async function tamanoDescarga(descarga: Download): Promise<number> {
  const ruta = await descarga.path();
  return (await readFile(ruta)).byteLength;
}

// Guarda la revisión de un criterio (desde el checklist) en "pasa" o
// "no_aplica". "Guardar revisión" vuelve solo al checklist.
async function revisarSinHallazgo(
  page: Page,
  recorrido: Recorrido,
  codigo: string,
  estado: 'pasa' | 'no_aplica',
): Promise<void> {
  await abrirCriterio(page, codigo);
  await page.getByLabel('Estado').selectOption({ label: estado === 'pasa' ? 'Pasa' : 'No aplica' });
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
  await expect.poll(() => recorrido.anuncios()).toContain('Revisión guardada.');
}

// Revisa 1.1.1 en "falla" con un hallazgo completo: severidad, componente,
// descripción, solución e imagen de evidencia con su texto alternativo.
async function revisarConHallazgoCompleto(page: Page, recorrido: Recorrido): Promise<void> {
  await abrirCriterio(page, '1.1.1');
  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await expect
    .poll(() => recorrido.anuncios())
    .toContainEqual(expect.stringContaining('Se ha abierto la sección Hallazgos'));
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await recorrido.comprobarFoco('tras pulsar «Añadir hallazgo»');
  await page.getByLabel('Severidad', { exact: true }).selectOption({ label: 'Alta' });
  await page.getByLabel('Componente afectado').selectOption({ label: 'Button' });
  await page
    .getByLabel('Descripción del hallazgo')
    .fill('El botón de búsqueda no tiene nombre accesible.');
  await page.getByLabel('Solución').fill('Añadir aria-label="Buscar" al botón.');
  await page.locator('input[type="file"]').setInputFiles(IMAGEN_EVIDENCIA);
  await page
    .getByLabel('Descripción de la imagen (texto alternativo)')
    .fill('Botón con una lupa y sin texto');
  await recorrido.revisarPantalla('Revisión de criterio (hallazgo nuevo abierto)');
  await recorrido.adjuntarArbolAria('Revisión de criterio (hallazgo nuevo abierto)');

  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
  await expect.poll(() => recorrido.anuncios()).toContain('Hallazgo añadido.');
}

// Recorrido 1 como función: se ejecuta en escritorio, a 320 px y (en otra
// versión, solo teclado) más abajo.
async function recorridoPrimeraAuditoria(page: Page, recorrido: Recorrido): Promise<void> {
  const titulos = new Map<string, string>();
  const anotarTitulo = async (pantalla: string) => titulos.set(pantalla, await page.title());

  // Bienvenida
  await page.goto('/bienvenida');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await recorrido.revisarPantalla('Bienvenida');
  await anotarTitulo('Bienvenida');

  // Nueva auditoría
  await page.getByRole('link', { name: 'Empezar una auditoría' }).first().click();
  await expect(page.getByLabel('Nombre de la auditoría')).toBeVisible();
  await recorrido.revisarPantalla('Nueva auditoría');
  await anotarTitulo('Nueva auditoría');

  await page.getByLabel('Nombre de la auditoría').fill('Tienda online');
  await page.getByLabel('Cliente').fill('ACME');
  await page.getByLabel('URL base').fill('https://tienda.example');
  await page.getByLabel('Fecha de inicio').fill('01/09/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();

  // Detalle de la auditoría
  await expect(page.getByRole('heading', { level: 1, name: 'Tienda online' })).toBeVisible();
  await recorrido.comprobarFoco('tras crear la auditoría');
  // El aviso llega 100 ms después de crear (PAUSA_ANUNCIO_MS de ToastService),
  // así que se espera a que aparezca en vez de leerlo a la primera.
  await expect
    .poll(() => recorrido.anuncios(), { message: 'crear la auditoría debería anunciarse' })
    .not.toEqual([]);
  await recorrido.revisarPantalla('Detalle de auditoría');
  await anotarTitulo('Detalle de auditoría');

  // Dos páginas
  await anadirPagina(page, 'Inicio', 'https://tienda.example/');
  await recorrido.revisarPantalla('Detalle de auditoría (con páginas)');
  await anadirPagina(page, 'Carrito', 'https://tienda.example/carrito');

  // Checklist de la primera página
  await page.getByRole('link', { name: 'Inicio' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toBeVisible();
  await expect(filaCriterio(page, '1.1.1')).toBeVisible();
  await recorrido.revisarPantalla('Checklist de página');
  await anotarTitulo('Checklist de página');

  // Tres criterios: Falla con hallazgo completo, No aplica y Pasa
  await revisarConHallazgoCompleto(page, recorrido);
  await revisarSinHallazgo(page, recorrido, '1.2.1', 'no_aplica');
  await revisarSinHallazgo(page, recorrido, '1.3.1', 'pasa');

  await expect(filaCriterio(page, '1.1.1')).toContainText('Falla');
  await expect(filaCriterio(page, '1.2.1')).toContainText('No aplica');
  await expect(filaCriterio(page, '1.3.1')).toContainText('Pasa');

  // El hallazgo y su evidencia se ven al reabrir el criterio
  await abrirCriterio(page, '1.1.1');
  await anotarTitulo('Revisión de criterio');
  await expect(page.getByText('El botón de búsqueda no tiene nombre accesible.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Botón con una lupa y sin texto' })).toBeVisible();
  await recorrido.revisarPantalla('Revisión de criterio (con hallazgo guardado)');
  await page.getByRole('link', { name: 'Volver al checklist' }).click();

  // Progreso
  await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
  const estados = page.locator('li');
  await expect(estados.filter({ hasText: /^Falla/ }).locator('span.tabular-nums')).toHaveText(
    '1 criterios',
  );
  await expect(estados.filter({ hasText: /^Pasa/ }).locator('span.tabular-nums')).toHaveText(
    '1 criterios',
  );
  await expect(estados.filter({ hasText: /^No aplica/ }).locator('span.tabular-nums')).toHaveText(
    '1 criterios',
  );
  await recorrido.revisarPantalla('Progreso');
  await anotarTitulo('Progreso');

  // Exportación
  await page.goBack();
  await page.getByRole('link', { name: 'Exportar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Exportar informe' })).toBeVisible();
  await recorrido.revisarPantalla('Exportar informe');
  await anotarTitulo('Exportar informe');

  const [excel] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar a Excel' }).click(),
  ]);
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
  expect(await tamanoDescarga(excel)).toBeGreaterThan(0);

  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar a PDF' }).click(),
  ]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await tamanoDescarga(pdf)).toBeGreaterThan(0);

  // El título de la pestaña debería identificar cada pantalla (WCAG 2.4.2).
  const distintos = new Set(titulos.values());
  expect
    .soft(
      distintos.size,
      `títulos de pestaña por pantalla: ${JSON.stringify(Object.fromEntries(titulos))}`,
    )
    .toBe(titulos.size);
}

test.describe('Recorrido 1 — primera auditoría', () => {
  test('de la bienvenida a la exportación, pasando por checklist, hallazgo con evidencia y progreso', async ({
    page,
    recorrido,
  }) => {
    await recorridoPrimeraAuditoria(page, recorrido);
  });
});

test.describe('Recorrido 5 — persistencia', () => {
  test('recargar a mitad del trabajo no pierde nada ya guardado', async ({ page, recorrido }) => {
    await crearAuditoria(page, { nombre: 'Auditoría persistente' });
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Auditoría persistente' }),
    ).toBeVisible();

    await anadirPagina(page, 'Inicio', 'https://tienda.example/');
    await page.reload();
    await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();

    await page.getByRole('link', { name: 'Inicio' }).click();
    await revisarConHallazgoCompleto(page, recorrido);
    await revisarSinHallazgo(page, recorrido, '1.3.1', 'pasa');

    // Checklist tras recargar
    await page.reload();
    await expect(filaCriterio(page, '1.1.1')).toContainText('Falla');
    await expect(filaCriterio(page, '1.3.1')).toContainText('Pasa');

    // Revisión del criterio tras recargar: estado, hallazgo y evidencia
    await abrirCriterio(page, '1.1.1');
    await page.reload();
    await expect(page.getByLabel('Estado')).toHaveValue(/falla/);
    await expect(page.getByText('El botón de búsqueda no tiene nombre accesible.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Botón con una lupa y sin texto' })).toBeVisible();

    // Estado de la auditoría (select del detalle) tras recargar
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
    const estadoAuditoria = page.getByLabel('Estado de la auditoría');
    await estadoAuditoria.selectOption('completada');
    await page.reload();
    // El dato sí se guarda en Dexie; lo que falla es cómo lo muestra el select.
    await expect
      .soft(estadoAuditoria, 'el estado guardado de la auditoría se muestra al volver')
      .toHaveValue('completada');

    // Progreso tras recargar
    await page.getByRole('link', { name: 'Progreso' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
    await page.reload();
    const estados = page.locator('li');
    await expect(estados.filter({ hasText: /^Falla/ }).locator('span.tabular-nums')).toHaveText(
      '1 criterios',
    );
    await expect(estados.filter({ hasText: /^Pasa/ }).locator('span.tabular-nums')).toHaveText(
      '1 criterios',
    );
  });
});

// Tarjeta de una plantilla en /biblioteca, localizada por su título.
function tarjetaPlantilla(page: Page, titulo: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titulo }) });
}

// Desde el detalle de la auditoría: abre la página indicada y, en ella, el criterio.
async function abrirCriterioDePagina(page: Page, pagina: string, codigo: string): Promise<void> {
  await page.getByRole('link', { name: pagina }).click();
  await expect(page.getByRole('heading', { level: 1, name: pagina })).toBeVisible();
  await abrirCriterio(page, codigo);
}

const REDACCION = 'La imagen del logotipo no tiene texto alternativo.';

// Auditoría con dos páginas; en "Inicio" guarda un hallazgo de 1.1.1 con
// componente Button marcando "Guardar esta redacción en la biblioteca".
// Termina en el detalle de la auditoría.
async function prepararBiblioteca(page: Page, recorrido: Recorrido): Promise<void> {
  await crearAuditoria(page, { nombre: 'Auditoría con biblioteca' });
  await anadirPagina(page, 'Inicio', 'https://tienda.example/');
  await anadirPagina(page, 'Carrito', 'https://tienda.example/carrito');

  await abrirCriterioDePagina(page, 'Inicio', '1.1.1');
  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByLabel('Severidad', { exact: true }).selectOption({ label: 'Alta' });
  await page.getByLabel('Componente afectado').selectOption({ label: 'Button' });
  await page.getByLabel('Descripción del hallazgo').fill(REDACCION);
  await page.getByLabel('Guardar esta redacción en la biblioteca de hallazgos').check();
  await page.getByLabel('Título').fill('Logotipo sin alt');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect.poll(() => recorrido.anuncios()).toContain('Hallazgo añadido.');
  await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
}

// Recorrido 2 como función: se ejecuta en escritorio y a 320 px.
async function recorridoReutilizarRedacciones(page: Page, recorrido: Recorrido): Promise<void> {
  await prepararBiblioteca(page, recorrido);

  // Otra página, mismo criterio: la redacción aparece sugerida al elegir el componente.
  await abrirCriterioDePagina(page, 'Carrito', '1.1.1');
  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByLabel('Componente afectado').selectOption({ label: 'Button' });
  await expect(page.getByRole('heading', { name: 'Logotipo sin alt' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar esta redacción' }).click();
  await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue(REDACCION);
  await recorrido.comprobarFoco('tras «Usar esta redacción» en una sugerencia');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect.poll(() => recorrido.anuncios()).toContain('Hallazgo añadido.');

  // Segundo hallazgo en el mismo criterio, eligiendo desde la biblioteca.
  await abrirCriterio(page, '1.1.1');
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
  await expect(page.getByRole('heading', { name: 'Elige una redacción' })).toBeVisible();
  await recorrido.revisarPantalla('Biblioteca en modo «elegir redacción»');
  await tarjetaPlantilla(page, 'Logotipo sin alt')
    .getByRole('button', { name: 'Usar esta redacción' })
    .click();
  await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toBeVisible();
  await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue(REDACCION);
  await recorrido.comprobarFoco('al volver de la biblioteca con la redacción aplicada');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();

  // La biblioteca cuenta los dos usos (el hallazgo original no cuenta como uso).
  await irPorMenu(page, 'Biblioteca de hallazgos');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Biblioteca de hallazgos' }),
  ).toBeVisible();
  await expect(tarjetaPlantilla(page, 'Logotipo sin alt')).toContainText('Usado 2 veces');
  await recorrido.revisarPantalla('Biblioteca de hallazgos');

  // Editar la plantilla y comprobar que persiste.
  await page.getByRole('link', { name: 'Logotipo sin alt' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Logotipo sin alt' })).toBeVisible();
  await recorrido.revisarPantalla('Detalle de plantilla');
  await page.getByLabel('Título').fill('Logotipo sin texto alternativo');
  await page.getByLabel('Recomendación de solución').fill('Añadir alt con el nombre de la marca.');
  const anunciosAntes = (await recorrido.anuncios()).length;
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect
    .poll(async () => (await recorrido.anuncios()).length, {
      message: 'guardar la plantilla debería anunciarse',
    })
    .toBeGreaterThan(anunciosAntes);
  await page.goto('/biblioteca');
  await expect(tarjetaPlantilla(page, 'Logotipo sin texto alternativo')).toContainText(
    'Usado 2 veces',
  );
}

test.describe('Recorrido 2 — reutilizar redacciones', () => {
  test('una redacción guardada se reutiliza desde la sugerencia y desde la biblioteca, y cuenta sus usos', async ({
    page,
    recorrido,
  }) => {
    await recorridoReutilizarRedacciones(page, recorrido);
  });
});

test.describe('Recorrido 6 — volver atrás con el navegador', () => {
  test('«Atrás» desde la biblioteca en modo selección y tras aplicar una redacción no duplica nada', async ({
    page,
    recorrido,
  }) => {
    await prepararBiblioteca(page, recorrido);
    await abrirCriterioDePagina(page, 'Carrito', '1.1.1');
    const urlCriterio = page.url();

    // Ir a la biblioteca y volver con «Atrás» sin elegir nada.
    await page.getByLabel('Estado').selectOption({ label: 'Falla' });
    await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
    await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
    await expect(page.getByRole('heading', { name: 'Elige una redacción' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(urlCriterio);
    await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toHaveCount(0);

    // Elegir una redacción, guardar, y moverse con «Atrás» / «Adelante».
    await page.getByLabel('Estado').selectOption({ label: 'Falla' });
    await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
    await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
    await page.getByRole('button', { name: 'Usar esta redacción' }).click();
    await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue(REDACCION);
    await page.getByRole('button', { name: 'Guardar revisión' }).click();
    await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();

    await page.goBack(); // criterio (ya sin ?plantilla)
    await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
    await expect(page).not.toHaveURL(/plantilla=/);
    // No se vuelve a abrir un hallazgo nuevo con la redacción aplicada.
    await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toHaveCount(0);
    await page.goBack(); // biblioteca en modo selección
    await page.goForward();
    await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(1);

    // En la biblioteca sigue contando un único uso.
    await page.goto('/biblioteca');
    await expect(tarjetaPlantilla(page, 'Logotipo sin alt')).toContainText('Usado 1 veces');
  });

  test('«Atrás» a un hallazgo ya eliminado (?hallazgo=) o a una auditoría borrada no deja la pantalla rota', async ({
    page,
    recorrido,
  }) => {
    await prepararBiblioteca(page, recorrido);
    await page.getByRole('link', { name: 'Inicio' }).click();

    // Editar desde el collapse del checklist abre el criterio con ?hallazgo=ID.
    await page.getByRole('button', { name: 'Ver hallazgos de 1.1.1' }).click();
    await page.getByRole('link', { name: 'Editar', exact: true }).click();
    await expect(page).toHaveURL(/hallazgo=\d+/);
    await expect(page.getByRole('button', { name: 'Guardar hallazgo' })).toBeVisible();
    const urlEdicion = page.url();

    // Se elimina el hallazgo y se vuelve con «Atrás» a su URL de edición.
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await page.getByRole('button', { name: 'Ver hallazgos de 1.1.1' }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar hallazgo' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(urlEdicion);
    await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar hallazgo' })).toHaveCount(0);

    // Se elimina la auditoría y se vuelve con «Atrás» a su detalle.
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
    const urlAuditoria = page.url();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar auditoría' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditorías' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(urlAuditoria);
    await expect(page.getByText('No se ha encontrado la auditoría.')).toBeVisible();
  });
});

// HTML con una imagen sin alt (1.1.1) y un idioma sin declarar (3.1.1), que
// axe detecta en el iframe aislado del escaneo — ver specs/11-escaneo-axe.md.
const HTML_CON_FALLOS = `<!doctype html><html><head><title>Tienda</title></head>
<body><main><h1>Tienda</h1><img src="logo.png"><p>Bienvenido.</p></main></body></html>`;

async function escanearHtml(page: Page, recorrido: Recorrido): Promise<void> {
  await page.getByRole('link', { name: /^Escanear automáticamente/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Escaneo automático' })).toBeVisible();
  await page.getByLabel('HTML de la página').fill(HTML_CON_FALLOS);
  await page.getByRole('button', { name: 'Ejecutar escaneo' }).click();
  await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
  await expect
    .poll(async () => (await recorrido.anuncios()).some((a) => a.startsWith('Escaneo completado')))
    .toBe(true);
}

test.describe('Recorrido 3 — escaneo automático', () => {
  test('el escaneo de HTML prerrellena el checklist y la revisión manual prevalece sobre un re-escaneo', async ({
    page,
    recorrido,
  }) => {
    await crearAuditoria(page, { nombre: 'Auditoría con escaneo' });
    await anadirPagina(page, 'Inicio', 'https://tienda.example/');
    await page.getByRole('link', { name: 'Inicio' }).click();

    await page.getByRole('link', { name: /^Escanear automáticamente/ }).click();
    await recorrido.revisarPantalla('Escaneo automático');
    await page.goBack();
    await escanearHtml(page, recorrido);

    // 1.1.1 queda como "Falla" con el chip "Automático" y un hallazgo.
    const fila111 = filaCriterio(page, '1.1.1');
    await expect(fila111).toContainText('Falla');
    await expect(fila111).toContainText('Automático');
    await recorrido.revisarPantalla('Checklist tras el escaneo');

    // El auditor lo revisa a mano: el hallazgo automático se ve en el criterio…
    await abrirCriterio(page, '1.1.1');
    await expect(page.getByLabel('Estado')).toHaveValue(/falla/);
    await expect(page.getByRole('button', { name: 'Editar' })).not.toHaveCount(0);
    await recorrido.revisarPantalla('Revisión de criterio (hallazgo automático)');
    // …y decide que en realidad pasa (p. ej. la imagen es decorativa en el sitio real).
    await page.getByLabel('Estado').selectOption({ label: 'Pasa' });
    await page.getByRole('button', { name: 'Guardar revisión' }).click();
    await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
    await expect(fila111).toContainText('Pasa');
    await expect(fila111).not.toContainText('Automático');

    // Un segundo escaneo del mismo HTML no pisa la decisión manual.
    await escanearHtml(page, recorrido);
    await expect(fila111).toContainText('Pasa');
    await expect(fila111).not.toContainText('Automático');
  });
});

// Auditoría con una página y un hallazgo "alta" en 1.1.1; termina en el checklist.
async function prepararAuditoriaConHallazgo(page: Page, recorrido: Recorrido): Promise<void> {
  await crearAuditoria(page, { nombre: 'Auditoría a corregir' });
  await anadirPagina(page, 'Inicio', 'https://tienda.example/');
  await page.getByRole('link', { name: 'Inicio' }).click();
  await abrirCriterio(page, '1.1.1');
  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByLabel('Severidad', { exact: true }).selectOption({ label: 'Alta' });
  await page.getByLabel('Descripción del hallazgo').fill('Texto con una errata.');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect.poll(() => recorrido.anuncios()).toContain('Hallazgo añadido.');
}

test.describe('Recorrido 4 — hallazgo incompleto', () => {
  test('guardar la revisión con un hallazgo nuevo incompleto avisa del error y no dice que se guardó', async ({
    page,
    recorrido,
  }) => {
    await crearAuditoria(page, { nombre: 'Auditoría con errores' });
    await anadirPagina(page, 'Inicio', 'https://tienda.example/');
    await page.getByRole('link', { name: 'Inicio' }).click();
    await abrirCriterio(page, '1.1.1');
    await page.getByLabel('Estado').selectOption({ label: 'Falla' });
    await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
    // Se escribe la descripción pero se olvida la severidad (obligatoria).
    await page.getByLabel('Descripción del hallazgo').fill('Falta el texto alternativo.');
    await page.getByRole('button', { name: 'Guardar revisión' }).click();

    const severidad = page.getByLabel('Severidad', { exact: true });
    await expect(severidad).toHaveAttribute('aria-invalid', 'true');
    await expect(severidad).toBeFocused();
    await expect(page.getByText('Selecciona una severidad.')).toBeVisible();
    expect(await recorrido.anuncios()).not.toContain('Revisión guardada.');

    // No se ha guardado nada: el checklist sigue «Por revisar» y sin hallazgos.
    await page.getByRole('button', { name: 'Descartar hallazgo' }).click();
    await expect(page.getByRole('button', { name: 'Añadir hallazgo' })).toBeFocused();
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await expect(filaCriterio(page, '1.1.1')).toContainText('Por revisar');
  });
});

// ---------------------------------------------------------------------------
// Avisos visibles (P4) y aviso de cambios sin guardar (P8) — ver
// specs/22-informe-ux.md.
// ---------------------------------------------------------------------------

async function abrirHallazgoNuevo(page: Page): Promise<void> {
  await crearAuditoria(page, { nombre: 'Auditoría de avisos' });
  await anadirPagina(page, 'Inicio', 'https://tienda.example/');
  await page.getByRole('link', { name: 'Inicio' }).click();
  await abrirCriterio(page, '1.1.1');
  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
}

test.describe('Avisos y cambios sin guardar', () => {
  test('las confirmaciones se ven en pantalla, además de anunciarse, y desaparecen solas', async ({
    page,
  }) => {
    await crearAuditoria(page, { nombre: 'Auditoría de avisos' });
    const aviso = page.getByRole('status').filter({ hasText: 'Auditoría creada.' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toBeHidden({ timeout: 8000 });
  });

  test('salir con un hallazgo a medio redactar pregunta antes, y cancelar lo conserva', async ({
    page,
  }) => {
    await abrirHallazgoNuevo(page);
    await page.getByLabel('Descripción del hallazgo').fill('Texto a medio escribir');

    const volver = page.getByRole('link', { name: 'Volver al checklist' });
    await volver.click();
    const dialogo = page.getByRole('alertdialog', { name: '¿Salir sin guardar el hallazgo?' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toHaveCount(0);
    await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue('Texto a medio escribir');
    await expect(volver).toBeFocused();

    await volver.click();
    await dialogo.getByRole('button', { name: 'Salir sin guardar' }).click();
    await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
  });

  test('sin cambios en el hallazgo abierto, o yendo a «Ver en la biblioteca», no pregunta', async ({
    page,
  }) => {
    await abrirHallazgoNuevo(page);
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();

    await abrirCriterio(page, '1.1.1');
    await page.getByLabel('Estado').selectOption({ label: 'Falla' });
    await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
    await page.getByLabel('Descripción del hallazgo').fill('Texto a medio escribir');
    await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
    await expect(page.getByRole('heading', { name: 'Elige una redacción' })).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
});

test.describe('Recorrido 4 — corregir y borrar', () => {
  test('editar auditoría, página y hallazgo, y eliminarlos con el modal, actualiza todo sin recargar', async ({
    page,
    recorrido,
  }) => {
    await prepararAuditoriaConHallazgo(page, recorrido);

    // Editar el hallazgo desde el propio criterio.
    await abrirCriterio(page, '1.1.1');
    await page.getByRole('button', { name: 'Editar' }).click();
    await recorrido.comprobarFoco('al abrir un hallazgo en edición');
    await page.getByLabel('Descripción del hallazgo').fill('Texto corregido.');
    await page.getByRole('button', { name: 'Guardar hallazgo' }).click();
    await expect(page.getByText('Texto corregido.')).toBeVisible();
    await recorrido.comprobarFoco('tras guardar un hallazgo editado');

    // Editar la página.
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await page.getByRole('link', { name: /^Editar página/ }).click();
    await recorrido.revisarPantalla('Editar página');
    await page.getByLabel('Nombre de la página').fill('Portada');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Portada' })).toBeVisible();
    await expect.poll(() => recorrido.anuncios()).toContain('Página actualizada.');

    // Editar la auditoría.
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
    await page.getByRole('link', { name: 'Editar', exact: true }).click();
    await recorrido.revisarPantalla('Editar auditoría');
    await page.getByLabel('Nombre de la auditoría').fill('Auditoría corregida');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Auditoría corregida' }),
    ).toBeVisible();
    await expect.poll(() => recorrido.anuncios()).toContain('Auditoría actualizada.');

    // El progreso refleja el hallazgo "alta"…
    await page.getByRole('link', { name: 'Progreso' }).click();
    const cifraAlta = page
      .getByText('Alta', { exact: true })
      .locator('xpath=preceding-sibling::p[1]');
    await expect(cifraAlta).toHaveText('1');
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();

    // …y eliminar el hallazgo desde el criterio lo pone a 0 sin recargar.
    await page.getByRole('link', { name: 'Portada' }).click();
    await abrirCriterio(page, '1.1.1');
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar hallazgo' }).click();
    await expect(page.getByText('Texto corregido.')).toHaveCount(0);
    await expect.poll(() => recorrido.anuncios()).toContain('Hallazgo eliminado.');
    await recorrido.comprobarFoco('tras eliminar un hallazgo');
    await page.getByRole('link', { name: 'Volver al checklist' }).click();
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
    await page.getByRole('link', { name: 'Progreso' }).click();
    await expect(cifraAlta).toHaveText('0');
    await page.getByRole('link', { name: 'Volver a la auditoría' }).click();

    // Eliminar la página: desaparece del detalle.
    await page.getByRole('link', { name: 'Portada' }).click();
    await page.getByRole('button', { name: /^Eliminar página/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar página' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Auditoría corregida' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Portada' })).toHaveCount(0);
    await recorrido.comprobarFoco('tras eliminar una página');

    // Eliminar la auditoría: desaparece del listado.
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar auditoría' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditorías' })).toBeVisible();
    await expect(page.getByText('Auditoría corregida')).toHaveCount(0);
    await recorrido.comprobarFoco('tras eliminar una auditoría');
    await recorrido.revisarPantalla('Listado de auditorías (vacío)');
  });
});

// ---------------------------------------------------------------------------
// Variante solo teclado del recorrido 1: sin un solo clic. Cada campo y
// botón se alcanza con Tab / Shift+Tab y se activa con Enter o Espacio.
// ---------------------------------------------------------------------------

// Escribe en el campo indicado tras llegar a él con Tab.
async function escribirConTeclado(page: Page, campo: Locator, texto: string): Promise<void> {
  await tabularHasta(page, campo);
  await page.keyboard.type(texto);
  await expect(campo).toHaveValue(texto);
}

// Elige una opción de un <select> nativo tecleando el principio de su texto,
// como hace un usuario de teclado con el desplegable cerrado.
async function elegirConTeclado(page: Page, select: Locator, valor: string): Promise<void> {
  await tabularHasta(page, select);
  await page.keyboard.type(valor);
  await expect(select).toHaveValue(new RegExp(valor));
}

// Llega con Tab al control y lo activa con la tecla indicada.
async function activarConTeclado(page: Page, control: Locator, tecla = 'Enter'): Promise<void> {
  await tabularHasta(page, control);
  await page.keyboard.press(tecla);
}

test.describe('Recorrido 1 — solo teclado', () => {
  test('la primera auditoría completa se puede hacer sin ratón y el foco nunca se pierde', async ({
    page,
    recorrido,
  }) => {
    await page.goto('/bienvenida');
    await activarConTeclado(
      page,
      page.getByRole('link', { name: 'Empezar una auditoría' }).first(),
    );
    await expect(page.getByLabel('Nombre de la auditoría')).toBeVisible();
    await recorrido.comprobarFoco('al llegar a «Nueva auditoría»');

    await escribirConTeclado(page, page.getByLabel('Nombre de la auditoría'), 'Tienda online');
    await escribirConTeclado(page, page.getByLabel('Cliente'), 'ACME');
    await escribirConTeclado(page, page.getByLabel('URL base'), 'https://tienda.example');
    const fecha = page.getByLabel('Fecha de inicio');
    await tabularHasta(page, fecha);
    await page.keyboard.type('01/09/2026');
    await expect(fecha).toHaveValue('01/09/2026');
    await activarConTeclado(page, page.getByRole('button', { name: 'Crear auditoría' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Tienda online' })).toBeVisible();
    await recorrido.comprobarFoco('al llegar al detalle de la auditoría');

    // Esc cierra el modal de confirmación y devuelve el foco a quien lo abrió.
    const eliminar = page.getByRole('button', { name: 'Eliminar', exact: true });
    await activarConTeclado(page, eliminar);
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(eliminar).toBeFocused();

    // Página
    await activarConTeclado(page, page.getByRole('link', { name: 'Añadir página' }));
    await recorrido.comprobarFoco('al llegar a «Añadir página»');
    await escribirConTeclado(page, page.getByLabel('Nombre de la página'), 'Inicio');
    await escribirConTeclado(
      page,
      page.getByLabel('URL', { exact: true }),
      'https://tienda.example/',
    );
    await activarConTeclado(page, page.getByRole('button', { name: 'Añadir página' }));
    await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await recorrido.comprobarFoco('al volver al detalle tras añadir la página');

    // Checklist y criterio
    await activarConTeclado(page, page.getByRole('link', { name: 'Inicio' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toBeVisible();
    await recorrido.comprobarFoco('al llegar al checklist');
    await activarConTeclado(
      page,
      filaCriterio(page, '1.1.1').getByRole('link', { name: /^Revisar/ }),
    );
    await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
    await recorrido.comprobarFoco('al llegar a la revisión del criterio');

    await elegirConTeclado(page, page.getByLabel('Estado'), 'falla');
    await activarConTeclado(page, page.getByRole('button', { name: 'Añadir hallazgo' }));
    await recorrido.comprobarFoco('tras abrir «Nuevo hallazgo»');
    await elegirConTeclado(page, page.getByLabel('Severidad', { exact: true }), 'alta');
    await escribirConTeclado(
      page,
      page.getByLabel('Descripción del hallazgo'),
      'Logotipo sin alt.',
    );

    // Adjuntar imagen: Enter abre el selector de archivos del sistema. Se
    // empieza a escuchar `filechooser` antes de tabular hasta el botón:
    // Playwright activa la interceptación del selector de forma asíncrona al
    // añadir el listener, y si el Enter llega antes se abre el selector
    // nativo (que headless cancela) en vez de emitirse el evento.
    const selectorAbierto = page.waitForEvent('filechooser');
    await tabularHasta(page, page.getByRole('button', { name: 'Adjuntar imagen' }));
    await page.keyboard.press('Enter');
    const selector = await selectorAbierto;
    await selector.setFiles(IMAGEN_EVIDENCIA);
    await recorrido.comprobarFoco('tras elegir la imagen de evidencia');
    await escribirConTeclado(
      page,
      page.getByLabel('Descripción de la imagen (texto alternativo)'),
      'Logotipo de la tienda',
    );

    await activarConTeclado(page, page.getByRole('button', { name: 'Guardar revisión' }));
    await expect(page.getByRole('columnheader', { name: 'Criterio' })).toBeVisible();
    await expect(filaCriterio(page, '1.1.1')).toContainText('Falla');
    await recorrido.comprobarFoco('al volver al checklist tras guardar');

    // Progreso y exportación
    await activarConTeclado(page, page.getByRole('link', { name: 'Volver a la auditoría' }));
    await activarConTeclado(page, page.getByRole('link', { name: 'Progreso' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
    await recorrido.comprobarFoco('al llegar al progreso');
    await activarConTeclado(page, page.getByRole('link', { name: 'Volver a la auditoría' }));
    await activarConTeclado(page, page.getByRole('link', { name: 'Exportar' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Exportar informe' })).toBeVisible();
    await recorrido.comprobarFoco('al llegar a «Exportar informe»');

    await tabularHasta(page, page.getByRole('button', { name: 'Exportar a Excel' }));
    const [excel] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);
    expect(await tamanoDescarga(excel)).toBeGreaterThan(0);
    await tabularHasta(page, page.getByRole('button', { name: 'Exportar a PDF' }));
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Space')]);
    expect(await tamanoDescarga(pdf)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Variante móvil (320 × 640, WCAG 1.4.10): recorridos 1 y 2 con reflow,
// objetivos táctiles y axe en cada pantalla (ver revisarPantalla), y el menú
// de navegación plegado.
// ---------------------------------------------------------------------------

test.describe('Móvil 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('el menú de navegación plegado se abre, navega y se cierra con Esc', async ({
    page,
    recorrido,
  }) => {
    await page.goto('/auditorias');
    const abrirMenu = page.getByRole('button', { name: 'Abrir menú de navegación' });
    await expect(abrirMenu).toBeVisible();
    await recorrido.revisarPantalla('Listado de auditorías (móvil)');

    await abrirMenu.click();
    await recorrido.revisarPantalla('Menú de navegación abierto');
    await page.keyboard.press('Escape');
    await expect(abrirMenu).toBeFocused();

    await irPorMenu(page, 'Componentes');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/componentes/);
    await recorrido.revisarPantalla('Componentes');
  });

  test('recorrido 1 — primera auditoría', async ({ page, recorrido }) => {
    await recorridoPrimeraAuditoria(page, recorrido);
  });

  test('recorrido 2 — reutilizar redacciones', async ({ page, recorrido }) => {
    await recorridoReutilizarRedacciones(page, recorrido);
  });
});
