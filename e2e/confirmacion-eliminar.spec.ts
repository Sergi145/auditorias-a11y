import { expect, test } from '@playwright/test';

// Modal de confirmación propio en vez de window.confirm() — ver
// specs/19-modal-confirmacion.md. Se prueba sobre componentes-listado,
// pero ConfirmacionService es el mismo que usan las otras 5 pantallas que
// confirman una eliminación.
test('confirmar la eliminación de un componente con el modal propio, sin el diálogo nativo del navegador', async ({
  page,
}) => {
  let dialogoNativoVisto = false;
  page.on('dialog', () => {
    dialogoNativoVisto = true;
  });

  await page.goto('/componentes');
  await page.getByLabel('Nuevo componente').fill('Acordeón de prueba');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByText('Componente añadido.')).toBeVisible();

  const botonEliminar = page.getByRole('button', { name: 'Eliminar', exact: true });
  const chipComponente = page.getByText('Acordeón de prueba', { exact: true });

  // Abrir el modal: aparece como alertdialog con su nombre accesible y el
  // foco en Cancelar.
  await botonEliminar.click();
  const dialogo = page.getByRole('alertdialog', { name: '¿Eliminar el componente?' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByText('«Acordeón de prueba» se eliminará.')).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  // Un clic en el fondo no cierra el modal ni elimina nada.
  await page.mouse.click(5, 5);
  await expect(dialogo).toBeVisible();
  await expect(chipComponente).toBeVisible();

  // Cancelar: no elimina nada y devuelve el foco al botón que abrió el modal.
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).not.toBeVisible();
  await expect(chipComponente).toBeVisible();
  await expect(botonEliminar).toBeFocused();

  // Reabrir y cerrar con Escape: tampoco elimina nada.
  await botonEliminar.click();
  await expect(dialogo).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogo).not.toBeVisible();
  await expect(chipComponente).toBeVisible();

  // Confirmar: elimina el componente y muestra el toast.
  await botonEliminar.click();
  await dialogo.getByRole('button', { name: 'Eliminar componente' }).click();
  await expect(dialogo).not.toBeVisible();
  await expect(page.getByText('Componente eliminado.')).toBeVisible();
  await expect(chipComponente).toHaveCount(0);

  expect(dialogoNativoVisto).toBe(false);
});
