import { expect, test, type Locator, type Page } from '@playwright/test';

// Etiquetas WCAG cubiertas por el catálogo del producto (specs/03-catalogo-wcag.md
// es A/AA de WCAG 2.2) — mismo criterio que specs/14-panel-progreso.md.
const ETIQUETAS_AXE = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

const ETIQUETAS: Record<string, string> = {
  pasa: 'Pasa',
  falla: 'Falla',
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

// Crea una auditoría con una página desde la UI y deja al usuario en el
// checklist de esa página — ver e2e/evidencia-hallazgo.spec.ts.
async function crearAuditoriaConPagina(page: Page): Promise<void> {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill('Auditoría de prueba');
  await page.getByLabel('Cliente').fill('Cliente de prueba');
  await page.getByLabel('URL base').fill('https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('01/01/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();

  await page.getByRole('link', { name: 'Añadir página' }).click();
  await page.getByLabel('Nombre de la página').fill('Página de prueba');
  await page.getByLabel('URL', { exact: true }).fill('https://pagina-a-auditar.test/');
  await page.getByRole('button', { name: 'Añadir página' }).click();

  await page.getByRole('link', { name: 'Página de prueba' }).click();
}

// Abre el criterio indicado desde el checklist y guarda su revisión. En
// "falla" añade un hallazgo con la severidad dada. En ambos estados
// guardarResultado() navega solo de vuelta al checklist — ver
// criterio-revision.ts.
async function revisarCriterio(
  page: Page,
  codigo: string,
  opciones: { estado: 'falla' | 'pasa'; severidad?: string },
): Promise<void> {
  const fila = page.locator('tr').filter({ has: page.locator('strong', { hasText: codigo }) });
  await fila.getByRole('link', { name: /^Revisar/ }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(codigo.replace('.', '\\.')) }),
  ).toBeVisible();

  // Los desplegables muestran etiquetas legibles (specs/22-informe-ux.md P6).
  await page.getByLabel('Estado').selectOption({ label: ETIQUETAS[opciones.estado] });

  if (opciones.estado === 'falla') {
    await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
    await page
      .getByLabel('Severidad', { exact: true })
      .selectOption({ label: ETIQUETAS[opciones.severidad!] });
    await page.getByLabel('Descripción del hallazgo').fill(`Hallazgo de prueba en ${codigo}.`);
  }

  await page.getByRole('button', { name: 'Guardar revisión' }).click();

  if (opciones.estado === 'falla') {
    // guardarResultado() muestra "Revisión guardada." y, si hay un hallazgo
    // nuevo pendiente, encadena guardarHallazgo(), que sustituye el toast
    // por "Hallazgo añadido." — es ese el que queda visible al terminar.
    await expect(page.getByText('Hallazgo añadido.')).toBeVisible();
  } else {
    await expect(page.getByText('Revisión guardada.')).toBeVisible();
  }
}

// Localiza la cifra + unidad de una fila de AppDistribucionBarras (bloques
// "Estado de los criterios", "Fallos por principio WCAG" y "Páginas con más
// incidencias") a partir de su etiqueta — ver
// src/app/shared/ui/distribucion-barras.ts. hasText con una cadena hace una
// búsqueda insensible a mayúsculas: "Falla" (sin anclar) también
// encontraría la fila del ranking, cuya unidad oculta es "criterios en
// falla" — se ancla al principio del texto de la fila, donde vive la
// etiqueta.
function cifraDistribucion(page: Page, etiqueta: string): Locator {
  return page
    .locator('li')
    .filter({ hasText: new RegExp(`^${etiqueta}`) })
    .locator('span.tabular-nums');
}

// Localiza la cifra de una tarjeta del bloque "Fallos por severidad" (sin
// cambios de esta rebanada: no usa AppDistribucionBarras) a partir de su
// etiqueta — la cifra es el <p> justo anterior al de la etiqueta.
function cifraSeveridad(page: Page, etiqueta: string): Locator {
  return page.getByText(etiqueta, { exact: true }).locator('xpath=preceding-sibling::p[1]');
}

test('el panel de progreso desglosa los criterios por estado, severidad y principio WCAG', async ({
  page,
}) => {
  await crearAuditoriaConPagina(page);

  // Total de criterios del catálogo, leído de forma independiente (una fila
  // por criterio en el checklist, sin filtros) — evita fijar a mano el
  // tamaño del catálogo WCAG en el test, ver specs/14-panel-progreso.md.
  // Se espera a la primera fila porque el checklist se rellena de forma
  // asíncrona (liveQuery sobre Dexie): count() no espera, es una foto fija.
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const totalCriterios = await page.locator('tbody tr').count();

  await revisarCriterio(page, '1.1.1', { estado: 'falla', severidad: 'alta' }); // Perceptible
  await revisarCriterio(page, '2.1.1', { estado: 'falla', severidad: 'critica' }); // Operable
  await revisarCriterio(page, '3.1.1', { estado: 'pasa' }); // Comprensible

  await page.getByRole('link', { name: 'Volver a la auditoría' }).click();
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Progreso' })).toBeVisible();

  await expect(page.locator('h2')).toHaveText([
    'Estado de los criterios',
    'Fallos por severidad',
    'Fallos por principio WCAG',
    'Páginas con más incidencias',
  ]);

  await expect(cifraDistribucion(page, 'Falla')).toHaveText('2 criterios');
  await expect(cifraDistribucion(page, 'Pasa')).toHaveText('1 criterios');
  await expect(cifraDistribucion(page, 'No aplica')).toHaveText('0 criterios');
  await expect(cifraDistribucion(page, 'Por revisar')).toHaveText(
    `${totalCriterios - 3} criterios`,
  );

  await expect(cifraSeveridad(page, 'Crítica')).toHaveText('1');
  await expect(cifraSeveridad(page, 'Alta')).toHaveText('1');
  await expect(cifraSeveridad(page, 'Media')).toHaveText('0');
  await expect(cifraSeveridad(page, 'Baja')).toHaveText('0');

  await expect(cifraDistribucion(page, 'Perceptible')).toHaveText('1 hallazgos');
  await expect(cifraDistribucion(page, 'Operable')).toHaveText('1 hallazgos');
  await expect(cifraDistribucion(page, 'Comprensible')).toHaveText('0 hallazgos');
  await expect(cifraDistribucion(page, 'Robusto')).toHaveText('0 hallazgos');

  await expect(cifraDistribucion(page, 'Página de prueba')).toHaveText('2 criterios en falla');

  await page.addScriptTag({ path: require.resolve('axe-core') });
  const resultado = await page.evaluate(
    async (etiquetas) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- axe se inyecta como global desde axe-core
      (window as any).axe.run(document, { runOnly: { type: 'tag', values: etiquetas } }),
    ETIQUETAS_AXE,
  );
  expect(resultado.violations).toEqual([]);
});

test('una auditoría sin páginas muestra el panel con los cinco bloques a cero', async ({
  page,
}) => {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill('Auditoría vacía');
  await page.getByLabel('Cliente').fill('Cliente de prueba');
  await page.getByLabel('URL base').fill('https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('01/01/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();

  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Progreso' })).toBeVisible();

  await expect(cifraDistribucion(page, 'Falla')).toHaveText('0 criterios');
  await expect(cifraSeveridad(page, 'Crítica')).toHaveText('0');
  await expect(cifraDistribucion(page, 'Perceptible')).toHaveText('0 hallazgos');
  await expect(page.getByText('Todavía no hay hallazgos registrados.')).toHaveCount(2);
  await expect(page.getByText('Esta auditoría todavía no tiene páginas.')).toBeVisible();
});
