import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const IMAGEN_VALIDA = path.join(__dirname, 'fixtures', 'evidencia.png');
const ARCHIVO_NO_VALIDO = path.join(__dirname, 'fixtures', 'evidencia-no-valida.txt');

// Crea una auditoría y una página desde la UI, y abre el criterio 1.1.1 en
// modo revisión con "Falla" ya seleccionado y el formulario de "Nuevo
// hallazgo" abierto — ver specs/16-evidencia-imagen-hallazgo.md.
async function abrirNuevoHallazgo(page: Page): Promise<void> {
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

  const fila = page.locator('tr').filter({ has: page.locator('strong', { hasText: '1.1.1' }) });
  await fila.getByRole('link', { name: /^Revisar/ }).click();
  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();

  await page.getByLabel('Estado').selectOption({ label: 'Falla' });
  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByLabel('Severidad', { exact: true }).selectOption({ label: 'Alta' });
  await page
    .getByLabel('Descripción del hallazgo')
    .fill('El botón de búsqueda no tiene alternativa textual.');
}

// "Guardar revisión" vuelve al checklist también en "Falla": reabre el
// criterio 1.1.1 desde ahí para ver sus hallazgos guardados.
async function reabrirCriterio(page: Page): Promise<void> {
  const fila = page.locator('tr').filter({ has: page.locator('strong', { hasText: '1.1.1' }) });
  await fila.getByRole('link', { name: /^Revisar/ }).click();
  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
}

test('crear un hallazgo con una imagen y su descripción la muestra como miniatura en la tarjeta', async ({
  page,
}) => {
  await abrirNuevoHallazgo(page);

  await page.locator('input[type="file"]').setInputFiles(IMAGEN_VALIDA);
  await page
    .getByLabel('Descripción de la imagen (texto alternativo)')
    .fill('Botón de búsqueda sin texto alternativo');
  // El hallazgo nuevo no tiene botón propio de guardado: "Guardar revisión"
  // (del formulario superior) es también el disparador que lo persiste —
  // ver el comentario de guardarResultado() en criterio-revision.ts.
  await page.getByRole('button', { name: 'Guardar revisión' }).click();

  await expect(page.getByText('Hallazgo añadido.')).toBeVisible();
  await reabrirCriterio(page);
  const imagen = page.getByRole('img', { name: 'Botón de búsqueda sin texto alternativo' });
  await expect(imagen).toBeVisible();
  const enlace = page.locator('a').filter({ has: imagen });
  await expect(enlace).toContainText('(se abre en una pestaña nueva)');
});

test('la miniatura del hallazgo también se ve al expandir su fila en el checklist', async ({
  page,
}) => {
  await abrirNuevoHallazgo(page);

  await page.locator('input[type="file"]').setInputFiles(IMAGEN_VALIDA);
  await page
    .getByLabel('Descripción de la imagen (texto alternativo)')
    .fill('Botón de búsqueda sin texto alternativo');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByText('Hallazgo añadido.')).toBeVisible();

  // "Guardar revisión" ya deja al usuario en el checklist.
  const fila = page.locator('tr').filter({ has: page.locator('strong', { hasText: '1.1.1' }) });
  await fila.getByRole('button', { name: /hallazgos de 1\.1\.1/ }).click();

  const imagen = page.getByRole('img', { name: 'Botón de búsqueda sin texto alternativo' });
  await expect(imagen).toBeVisible();
  await expect(page.locator('a').filter({ has: imagen })).toContainText(
    '(se abre en una pestaña nueva)',
  );
});

test('guardar sin describir una imagen muestra el error y no crea el hallazgo', async ({
  page,
}) => {
  await abrirNuevoHallazgo(page);

  await page.locator('input[type="file"]').setInputFiles(IMAGEN_VALIDA);
  await page.getByRole('button', { name: 'Guardar revisión' }).click();

  await expect(page.getByText('Describe el contenido de la imagen.')).toBeVisible();
  await expect(page.getByText('Hallazgo añadido.')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toBeVisible();
});

test('elegir un archivo que no es una imagen admitida lo rechaza con su motivo', async ({
  page,
}) => {
  await abrirNuevoHallazgo(page);

  await page.locator('input[type="file"]').setInputFiles(ARCHIVO_NO_VALIDO);

  await expect(page.getByText('evidencia-no-valida.txt: formato no admitido')).toBeVisible();
  await expect(page.getByLabel('Descripción de la imagen (texto alternativo)')).toHaveCount(0);
});

test('editar un hallazgo, quitar su imagen y guardar la deja sin miniaturas', async ({ page }) => {
  await abrirNuevoHallazgo(page);
  await page.locator('input[type="file"]').setInputFiles(IMAGEN_VALIDA);
  await page.getByLabel('Descripción de la imagen (texto alternativo)').fill('Icono sin describir');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByText('Hallazgo añadido.')).toBeVisible();
  await reabrirCriterio(page);
  await expect(page.getByRole('img', { name: 'Icono sin describir' })).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByRole('button', { name: 'Quitar imagen 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Quitar imagen 1' }).click();
  await page.getByRole('button', { name: 'Guardar hallazgo' }).click();

  await expect(page.getByText('Hallazgo actualizado.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Icono sin describir' })).toHaveCount(0);
});
