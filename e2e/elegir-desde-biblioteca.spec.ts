import { expect, test, type Page } from '@playwright/test';

const REDACCION = 'La imagen del logotipo no tiene texto alternativo.';

// Crea una auditoría y una página desde la UI, abre el criterio 1.1.1 y
// guarda un hallazgo marcando "Guardar esta redacción en la biblioteca",
// para que la biblioteca tenga al menos una entrada que elegir — ver
// specs/21-elegir-desde-biblioteca.md.
async function prepararCriterioConPlantilla(page: Page, componente?: string): Promise<void> {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill('Auditoría de prueba');
  await page.getByLabel('Cliente').fill('Cliente de prueba');
  await page.getByLabel('URL base').fill('https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('2026-01-01');
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
  if (componente) await page.getByLabel('Componente afectado').selectOption({ label: componente });
  await page.getByLabel('Descripción del hallazgo').fill(REDACCION);
  await page.getByLabel('Guardar esta redacción en la biblioteca de hallazgos').check();
  await page.getByLabel('Título').fill('Logotipo sin alt');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByText('Hallazgo añadido.')).toBeVisible();

  // "Guardar revisión" vuelve al checklist: se reabre el criterio.
  await fila.getByRole('link', { name: /^Revisar/ }).click();
  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
}

test('"Ver en la biblioteca" lleva al listado y "Usar esta redacción" rellena un hallazgo nuevo', async ({
  page,
}) => {
  await prepararCriterioConPlantilla(page);

  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();

  await expect(page).toHaveURL(/\/biblioteca\?/);
  await expect(page.getByRole('heading', { name: 'Elige una redacción' })).toBeVisible();
  await expect(page.getByLabel('Criterio')).toHaveValue('1.1.1');

  await page.getByRole('button', { name: 'Usar esta redacción' }).click();

  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
  await expect(page.getByLabel('Estado')).toHaveValue(/falla/);
  await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toBeVisible();
  await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue(REDACCION);
  await expect(page.getByLabel('Severidad', { exact: true })).toHaveValue(/alta/);
  // ?plantilla se retira de la URL para que recargar no la vuelva a aplicar.
  await expect(page).not.toHaveURL(/plantilla=/);
});

test('elegir una redacción desde un hallazgo existente vuelve a ese hallazgo en edición', async ({
  page,
}) => {
  await prepararCriterioConPlantilla(page);

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Descripción del hallazgo').fill('Texto provisional');
  await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
  await page.getByRole('button', { name: 'Usar esta redacción' }).click();

  await expect(page.getByRole('button', { name: 'Guardar hallazgo' })).toBeVisible();
  await expect(page.getByLabel('Descripción del hallazgo')).toHaveValue(REDACCION);
  await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toHaveCount(0);
});

test('"Volver al criterio sin elegir" regresa sin tocar el formulario', async ({ page }) => {
  await prepararCriterioConPlantilla(page);

  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByRole('link', { name: 'Ver en la biblioteca' }).click();
  await page.getByRole('link', { name: 'Volver al criterio sin elegir' }).click();

  await expect(page.getByRole('heading', { name: /1\.1\.1/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuevo hallazgo' })).toHaveCount(0);
});

test('fuera del modo selección, la biblioteca no ofrece "Usar esta redacción"', async ({
  page,
}) => {
  await prepararCriterioConPlantilla(page);

  await page.goto('/biblioteca');
  await expect(page.getByRole('heading', { name: 'Logotipo sin alt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar esta redacción' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Elige una redacción' })).toHaveCount(0);
});

test('al usar una sugerencia, las sugerencias desaparecen y el foco pasa a la descripción', async ({
  page,
}) => {
  await prepararCriterioConPlantilla(page, 'Button');

  await page.getByRole('button', { name: 'Añadir hallazgo' }).click();
  await page.getByLabel('Componente afectado').selectOption({ label: 'Button' });
  await expect(page.getByText('Hallazgos sugeridos de la biblioteca')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Logotipo sin alt' })).toBeVisible();

  await page.getByRole('button', { name: 'Usar esta redacción' }).click();

  const descripcion = page.getByLabel('Descripción del hallazgo');
  await expect(descripcion).toHaveValue(REDACCION);
  await expect(descripcion).toBeFocused();
  await expect(page.getByText('Hallazgos sugeridos de la biblioteca')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Logotipo sin alt' })).toHaveCount(0);
  await expect(page.getByText('Redacción «Logotipo sin alt» aplicada al hallazgo.')).toBeVisible();
});
