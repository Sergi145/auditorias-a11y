import { expect, test, type Page } from '@playwright/test';

// Cards con enlace estirado — ver la nota de revisión de
// specs/04-rediseno-tailwind.md: un clic en cualquier zona de la card
// navega al detalle, y los botones secundarios siguen siendo independientes.

async function crearAuditoria(page: Page): Promise<void> {
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Nombre de la auditoría').fill('Auditoría estirada');
  await page.getByLabel('Cliente').fill('Cliente de prueba');
  await page.getByLabel('URL base').fill('https://ejemplo-auditoria.test');
  await page.getByLabel('Fecha de inicio').fill('01/01/2026');
  await page.getByRole('button', { name: 'Crear auditoría' }).click();
  await expect(page).toHaveURL(/\/auditorias\/\d+/);
}

async function crearPlantilla(page: Page): Promise<void> {
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
  await page.getByLabel('Descripción del hallazgo').fill('El logotipo no tiene alt.');
  await page.getByLabel('Guardar esta redacción en la biblioteca de hallazgos').check();
  await page.getByLabel('Título').fill('Logotipo sin alt');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByText('Hallazgo añadido.')).toBeVisible();
}

test('un clic en una zona vacía de la card de auditoría abre la auditoría', async ({ page }) => {
  await crearAuditoria(page);
  await page.goto('/auditorias');

  const card = page.locator('article').filter({ hasText: 'Auditoría estirada' });
  // Esquina inferior derecha: lejos del título, sobre el texto de fallos.
  const caja = (await card.boundingBox())!;
  await page.mouse.click(caja.x + caja.width - 8, caja.y + caja.height - 8);

  await expect(page).toHaveURL(/\/auditorias\/\d+$/);
});

test('el foco del enlace del título se pinta en toda la card', async ({ page }) => {
  await crearAuditoria(page);
  await page.goto('/auditorias');

  const enlace = page.getByRole('link', { name: /Auditoría estirada/ });
  await enlace.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(enlace).toBeFocused();

  const card = page.locator('article').filter({ hasText: 'Auditoría estirada' });
  await expect(card).toHaveCSS('outline-style', 'solid');
  await expect(enlace).toHaveCSS('outline-style', 'none');

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/auditorias\/\d+$/);
});

test('en la biblioteca, la card abre el detalle pero "Eliminar" sigue siendo independiente', async ({
  page,
}) => {
  await crearAuditoria(page);
  await crearPlantilla(page);
  await page.goto('/biblioteca');

  const card = page.locator('article').filter({ hasText: 'Logotipo sin alt' });
  await card.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page).toHaveURL(/\/biblioteca$/);
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  const caja = (await card.boundingBox())!;
  await page.mouse.click(caja.x + 8, caja.y + caja.height - 8);
  await expect(page).toHaveURL(/\/biblioteca\/\d+$/);
});
