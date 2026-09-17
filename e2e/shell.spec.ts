import { expect, test } from '@playwright/test';

test('la app arranca y muestra el shell principal', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // '/' redirige a la landing pública (/bienvenida) — se navega directamente
  // a una ruta interna del shell, igual que el test unitario equivalente en
  // app.spec.ts ("el shell se muestra en las rutas internas de la app").
  await page.goto('/auditorias');

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Auditorías', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Auditorías');
  expect(consoleErrors).toEqual([]);

  const dbNames = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    return dbs.map((db) => db.name);
  });
  expect(dbNames).toContain('auditorias-a11y');
});
