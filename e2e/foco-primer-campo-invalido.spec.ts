import { expect, test } from '@playwright/test';
import { crearAuditoria } from './utilidades/recorrido';

// Al enviar un formulario con datos inválidos, el foco pasa al primer campo
// erróneo — mismo comportamiento que «Nueva auditoría». Ver la nota de
// revisión de 2026-09-21 en specs/05-auditorias-paginas.md.
test('«Añadir página»: al enviar con errores el foco va al primer campo inválido', async ({
  page,
}) => {
  await crearAuditoria(page, { nombre: 'Auditoría de foco' });
  await page.getByRole('link', { name: 'Añadir página' }).click();

  const nombre = page.getByLabel('Nombre de la página');
  const url = page.getByLabel('URL', { exact: true });
  const enviar = page.getByRole('button', { name: 'Añadir página' });

  // Todo vacío: el primer campo erróneo es el nombre.
  await enviar.click();
  await expect(nombre).toBeFocused();
  await expect(nombre).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Introduce un nombre.')).toBeVisible();

  // Nombre correcto, URL sin esquema: el foco salta a la URL.
  await nombre.fill('Inicio');
  await url.fill('tienda.example');
  await enviar.click();
  await expect(url).toBeFocused();
  await expect(url).toHaveAttribute('aria-invalid', 'true');
  await expect(nombre).not.toHaveAttribute('aria-invalid', 'true');

  // Con todo correcto se añade la página y se vuelve al detalle.
  await url.fill('https://tienda.example/');
  await enviar.click();
  await expect(page.getByText('Página añadida.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
});

test('«Editar página»: al guardar con errores el foco va al primer campo inválido', async ({
  page,
}) => {
  await crearAuditoria(page, { nombre: 'Auditoría de foco' });
  await page.getByRole('link', { name: 'Añadir página' }).click();
  await page.getByLabel('Nombre de la página').fill('Inicio');
  await page.getByLabel('URL', { exact: true }).fill('https://tienda.example/');
  await page.getByRole('button', { name: 'Añadir página' }).click();
  await page.getByRole('link', { name: 'Inicio' }).click();
  await page.getByRole('link', { name: 'Editar' }).first().click();

  const nombre = page.getByLabel('Nombre de la página');
  await expect(nombre).toHaveValue('Inicio');
  await nombre.fill('');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(nombre).toBeFocused();
});
