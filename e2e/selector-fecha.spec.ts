import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { crearAuditoria, ETIQUETAS_WCAG, expect, tabularHasta, test } from './utilidades/recorrido';

// Selector de fecha propio (patrón «Date Picker Dialog» de la APG) en
// «Fecha de inicio» — ver specs/25-selector-fecha.md. Se prueba sobre
// «Nueva auditoría» y «Editar auditoría», que es donde se usa.

// Lunes 21 de septiembre de 2026, para que «hoy» y los nombres de los días
// no dependan del día en que se ejecuten los tests. Solo fija la fecha del
// navegador: los temporizadores siguen corriendo.
async function fijarHoy(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(2026, 8, 21, 12, 0));
}

async function rellenarDatosMinimos(page: Page): Promise<void> {
  await page.getByLabel('Nombre de la auditoría').fill('Tienda online');
  await page.getByLabel('Cliente').fill('ACME');
  await page.getByLabel('URL base').fill('https://tienda.example');
}

// Espera a que el calendario esté abierto, con el foco en el día indicado y
// con el fondo ya activo. Sin esto, una tecla mandada justo después de abrir
// llega antes de que el calendario tenga el foco y va al botón.
async function esperarCalendarioAbierto(page: Page, diaConFoco: string): Promise<void> {
  await expect(page.getByRole('dialog').getByRole('gridcell', { name: diaConFoco })).toBeFocused();
  await expect(page.locator('.cdk-overlay-backdrop-showing')).toHaveCount(1);
}

// Nombre accesible de lo que tiene el foco: el aria-label o, si no lo tiene,
// su texto.
async function nombreDelFoco(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const activo = document.activeElement;
    return activo?.getAttribute('aria-label') ?? activo?.textContent?.trim() ?? null;
  });
}

// Violaciones de axe sobre la pantalla con el diálogo abierto.
async function violacionesDeAxe(page: Page): Promise<unknown[]> {
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return resultado.violations.map((violacion) => ({
    regla: violacion.id,
    impacto: violacion.impact,
    ayuda: violacion.help,
    nodos: violacion.nodes.map((nodo) => nodo.target.join(' ')),
  }));
}

test('solo con el teclado: se abre el calendario, se navega con flechas y AvPág, se elige con Intro y el foco vuelve al botón', async ({
  page,
  recorrido,
}) => {
  await fijarHoy(page);
  await page.goto('/auditorias/nueva');
  const fecha = page.getByLabel('Fecha de inicio');
  const dialogo = page.getByRole('dialog');

  await tabularHasta(page, page.getByRole('button', { name: 'Elegir fecha' }));
  await page.keyboard.press('Enter');

  // Se abre con el foco en hoy.
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toHaveAccessibleName('septiembre de 2026');
  await expect(
    dialogo.getByRole('gridcell', { name: 'lunes, 21 de septiembre de 2026' }),
  ).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(
    dialogo.getByRole('gridcell', { name: 'martes, 22 de septiembre de 2026' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(
    dialogo.getByRole('gridcell', { name: 'martes, 29 de septiembre de 2026' }),
  ).toBeFocused();

  // AvPág pasa al mes siguiente, con el mismo día, y el título lo anuncia.
  await page.keyboard.press('PageDown');
  await expect(dialogo).toHaveAccessibleName('octubre de 2026');
  await expect(
    dialogo.getByRole('gridcell', { name: 'jueves, 29 de octubre de 2026' }),
  ).toBeFocused();

  // Intro elige el día, cierra el diálogo y devuelve el foco al botón, que
  // ahora dice qué fecha hay.
  await page.keyboard.press('Enter');
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('29/10/2026');
  await expect(
    page.getByRole('button', { name: 'Cambiar fecha, jueves, 29 de octubre de 2026' }),
  ).toBeFocused();
  await recorrido.comprobarFoco('tras elegir una fecha con el teclado');
});

test('Tab y Mayús+Tab recorren el diálogo en bucle sin salir de él', async ({ page }) => {
  await fijarHoy(page);
  await page.goto('/auditorias/nueva');
  await page.getByRole('button', { name: 'Elegir fecha' }).click();
  await esperarCalendarioAbierto(page, 'lunes, 21 de septiembre de 2026');

  // La rejilla es una sola parada: el foco parte del día activo, pasa por
  // Cancelar y Aceptar, da la vuelta por los cuatro botones de la cabecera y
  // vuelve al día activo.
  expect(await nombreDelFoco(page)).toBe('lunes, 21 de septiembre de 2026');
  const haciaDelante: (string | null)[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    haciaDelante.push(await nombreDelFoco(page));
  }
  expect(haciaDelante).toEqual([
    'Cancelar',
    'Aceptar',
    'Año anterior',
    'Mes anterior',
    'Mes siguiente',
    'Año siguiente',
    'lunes, 21 de septiembre de 2026',
  ]);

  const haciaAtras: (string | null)[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Shift+Tab');
    haciaAtras.push(await nombreDelFoco(page));
  }
  expect(haciaAtras).toEqual([
    'Año siguiente',
    'Mes siguiente',
    'Mes anterior',
    'Año anterior',
    'Aceptar',
    'Cancelar',
    'lunes, 21 de septiembre de 2026',
  ]);
});

test('Esc y un clic fuera cierran el calendario sin cambiar la fecha y devuelven el foco al botón', async ({
  page,
  recorrido,
}) => {
  await page.goto('/auditorias/nueva');
  const fecha = page.getByLabel('Fecha de inicio');
  const dialogo = page.getByRole('dialog');
  await fecha.fill('15/09/2026');
  const boton = page.getByRole('button', {
    name: 'Cambiar fecha, martes, 15 de septiembre de 2026',
  });

  await boton.click();
  await esperarCalendarioAbierto(page, 'martes, 15 de septiembre de 2026');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('15/09/2026');
  await expect(boton).toBeFocused();

  await boton.click();
  await esperarCalendarioAbierto(page, 'martes, 15 de septiembre de 2026');
  await page.keyboard.press('ArrowRight');
  // Sobre el propio fondo y no con page.mouse.click(5, 5): un clic por
  // coordenadas aterrizaba a veces en la página de debajo (la barra lateral)
  // en vez de en el fondo. Un clic sobre el localizador espera a que el fondo
  // reciba el puntero antes de pulsar.
  await page.locator('.cdk-overlay-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('15/09/2026');
  await expect(boton).toBeFocused();
  await recorrido.comprobarFoco('tras cerrar el calendario sin elegir');
});

test('Espacio, un clic en un día y Aceptar también eligen la fecha, cierran y devuelven el foco', async ({
  page,
}) => {
  await fijarHoy(page);
  await page.goto('/auditorias/nueva');
  const fecha = page.getByLabel('Fecha de inicio');
  const dialogo = page.getByRole('dialog');

  // Espacio elige al soltar la tecla. Si eligiera al pulsarla, el foco
  // volvería al botón antes de soltarla y ese Espacio volvería a abrir el
  // calendario: por eso se espera un momento y se comprueba que sigue cerrado.
  await page.getByRole('button', { name: 'Elegir fecha' }).click();
  await esperarCalendarioAbierto(page, 'lunes, 21 de septiembre de 2026');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('22/09/2026');
  const botonElegido = page.getByRole('button', {
    name: 'Cambiar fecha, martes, 22 de septiembre de 2026',
  });
  await expect(botonElegido).toBeFocused();
  await page.waitForTimeout(300);
  await expect(dialogo).toHaveCount(0);

  // Un clic en un día.
  await botonElegido.click();
  await esperarCalendarioAbierto(page, 'martes, 22 de septiembre de 2026');
  await dialogo.getByRole('gridcell', { name: 'jueves, 24 de septiembre de 2026' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('24/09/2026');
  const botonClic = page.getByRole('button', {
    name: 'Cambiar fecha, jueves, 24 de septiembre de 2026',
  });
  await expect(botonClic).toBeFocused();

  // Aceptar elige el día con el foco, no el que estaba seleccionado.
  await botonClic.click();
  await esperarCalendarioAbierto(page, 'jueves, 24 de septiembre de 2026');
  await page.keyboard.press('ArrowLeft');
  await dialogo.getByRole('button', { name: 'Aceptar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(fecha).toHaveValue('23/09/2026');
  await expect(
    page.getByRole('button', { name: 'Cambiar fecha, miércoles, 23 de septiembre de 2026' }),
  ).toBeFocused();
});

test('una fecha que no existe o un campo vacío muestran su error al enviar y el foco va al campo', async ({
  page,
}) => {
  await page.goto('/auditorias/nueva');
  await rellenarDatosMinimos(page);
  const fecha = page.getByLabel('Fecha de inicio');
  const crear = page.getByRole('button', { name: 'Crear auditoría' });

  // Vacío.
  await crear.click();
  await expect(page.getByText('Selecciona una fecha.')).toBeVisible();
  await expect(fecha).toBeFocused();
  await expect(fecha).toHaveAttribute('aria-invalid', 'true');

  // Texto con formato de fecha, pero que no existe.
  await fecha.fill('31/02/2026');
  await crear.click();
  await expect(
    page.getByText('Introduce una fecha válida con el formato dd/mm/aaaa.'),
  ).toBeVisible();
  await expect(fecha).toBeFocused();
  await expect(fecha).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/auditorias\/nueva$/);

  // Corregida, se crea y se guarda tal cual se escribió.
  await fecha.fill('1/9/2026');
  await crear.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tienda online' })).toBeVisible();
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Fecha de inicio')).toHaveValue('01/09/2026');
});

test('al editar, la fecha guardada sale como dd/mm/aaaa, el calendario abre en ese día y el cambio se guarda', async ({
  page,
}) => {
  await crearAuditoria(page, { nombre: 'Auditoría a editar' });
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  const fecha = page.getByLabel('Fecha de inicio');
  const dialogo = page.getByRole('dialog');

  await expect(fecha).toHaveValue('01/01/2026');
  await page.getByRole('button', { name: 'Cambiar fecha, jueves, 1 de enero de 2026' }).click();
  await expect(dialogo).toHaveAccessibleName('enero de 2026');
  const diaActual = dialogo.getByRole('gridcell', { name: 'jueves, 1 de enero de 2026' });
  await expect(diaActual).toBeFocused();
  await expect(diaActual).toHaveAttribute('aria-selected', 'true');

  await dialogo.getByRole('gridcell', { name: 'jueves, 15 de enero de 2026' }).click();
  await expect(fecha).toHaveValue('15/01/2026');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Auditoría actualizada.')).toBeVisible();

  // Vuelve del guardado como ISO y se pinta de nuevo como dd/mm/aaaa.
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Fecha de inicio')).toHaveValue('15/01/2026');
});

test('axe no encuentra violaciones con el calendario abierto', async ({ page }) => {
  await fijarHoy(page);
  await page.goto('/auditorias/nueva');
  await page.getByLabel('Fecha de inicio').fill('15/09/2026');
  await page.getByRole('button', { name: /^Cambiar fecha/ }).click();
  await esperarCalendarioAbierto(page, 'martes, 15 de septiembre de 2026');

  expect(await violacionesDeAxe(page)).toEqual([]);

  // También tras moverse a otro mes, con el título ya cambiado.
  await page.keyboard.press('PageDown');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('octubre de 2026');
  expect(await violacionesDeAxe(page)).toEqual([]);
});

test.describe('Móvil 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('el calendario abierto no desborda, cabe con 16 px de margen, sus días miden al menos 36×36 y se puede elegir uno', async ({
    page,
    recorrido,
  }) => {
    await fijarHoy(page);
    await page.goto('/auditorias/nueva');
    const fecha = page.getByLabel('Fecha de inicio');
    const dialogo = page.getByRole('dialog');

    await page.getByRole('button', { name: 'Elegir fecha' }).click();
    await esperarCalendarioAbierto(page, 'lunes, 21 de septiembre de 2026');

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde, 'scroll horizontal con el calendario abierto').toBeLessThanOrEqual(0);

    const caja = await dialogo.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.x).toBeGreaterThanOrEqual(15.5);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(320 - 15.5);

    const dia = dialogo.getByRole('gridcell', { name: 'martes, 15 de septiembre de 2026' });
    const cajaDia = await dia.boundingBox();
    expect(cajaDia!.width).toBeGreaterThanOrEqual(36);
    expect(cajaDia!.height).toBeGreaterThanOrEqual(36);

    expect(await violacionesDeAxe(page)).toEqual([]);

    await dia.click();
    await expect(dialogo).toHaveCount(0);
    await expect(fecha).toHaveValue('15/09/2026');
    await expect(
      page.getByRole('button', { name: 'Cambiar fecha, martes, 15 de septiembre de 2026' }),
    ).toBeFocused();
    await recorrido.comprobarFoco('tras elegir una fecha a 320 px');
  });
});
