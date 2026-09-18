import { Dialog } from '@angular/cdk/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmacionService, type OpcionesConfirmacion } from './confirmacion';

describe('ConfirmacionService', () => {
  let servicio: ConfirmacionService;
  let overlayContainerElement: HTMLElement;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ConfirmacionService);
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
    applicationRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    TestBed.inject(Dialog).closeAll();
  });

  // dialog.open() adjunta el componente, pero su plantilla y los host
  // bindings del contenedor (role, aria-modal, el foco inicial...) no se
  // aplican hasta el siguiente ciclo de detección de cambios de Angular.
  // Se envuelve en un objeto porque devolver la promesa tal cual desde una
  // función async la encadenaría, y esperaría a que se cierre el modal
  // antes de que "confirmarYEsperar" se resuelva.
  async function confirmarYEsperar(opciones: OpcionesConfirmacion): Promise<{ promesa: Promise<boolean> }> {
    const promesa = servicio.confirmar(opciones);
    await applicationRef.whenStable();
    return { promesa };
  }

  function boton(texto: string): HTMLButtonElement {
    const encontrado = Array.from(overlayContainerElement.querySelectorAll('button')).find(
      (elemento) => elemento.textContent?.trim() === texto,
    );
    if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`);
    return encontrado;
  }

  it('pinta el título, el mensaje y el texto del botón de confirmar', async () => {
    await confirmarYEsperar({
      titulo: 'Título de prueba',
      mensaje: 'Mensaje de prueba',
      textoConfirmar: 'Confirmar acción',
    });

    expect(overlayContainerElement.querySelector('#dialogo-confirmacion-titulo')?.textContent).toContain(
      'Título de prueba',
    );
    expect(overlayContainerElement.querySelector('#dialogo-confirmacion-mensaje')?.textContent).toContain(
      'Mensaje de prueba',
    );
    expect(boton('Confirmar acción')).toBeTruthy();
    expect(boton('Cancelar')).toBeTruthy();
  });

  it('resuelve true al pulsar el botón de confirmar', async () => {
    const { promesa } = await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });

    boton('Eliminar').click();

    expect(await promesa).toBe(true);
  });

  it('resuelve false al pulsar Cancelar', async () => {
    const { promesa } = await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });

    boton('Cancelar').click();

    expect(await promesa).toBe(false);
  });

  it('resuelve false al pulsar Escape, sin depender del diálogo nativo del navegador', async () => {
    const { promesa } = await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });

    const contenedorDialogo = overlayContainerElement.querySelector('[role="alertdialog"]') as HTMLElement;
    contenedorDialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(await promesa).toBe(false);
  });

  it('un clic en el fondo no cierra el modal ni resuelve la promesa', async () => {
    let resuelto: boolean | null = null;
    const { promesa } = await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });
    void promesa.then((resultado) => (resuelto = resultado));

    const backdrop = document.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    backdrop.click();

    expect(resuelto).toBeNull();
    expect(overlayContainerElement.querySelector('#dialogo-confirmacion-titulo')).toBeTruthy();
  });

  it('tiene role="alertdialog", aria-modal y referencia el título y el mensaje', async () => {
    await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });

    const dialogo = overlayContainerElement.querySelector('[role="alertdialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('dialogo-confirmacion-titulo');
    expect(dialogo?.getAttribute('aria-describedby')).toBe('dialogo-confirmacion-mensaje');
  });

  it('el foco inicial está en el botón Cancelar', async () => {
    await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });

    expect(document.activeElement).toBe(boton('Cancelar'));
  });

  it('devuelve el foco al elemento que abrió el modal al cancelar', async () => {
    const botonOrigen = document.createElement('button');
    botonOrigen.textContent = 'Eliminar componente';
    document.body.appendChild(botonOrigen);
    botonOrigen.focus();

    const { promesa } = await confirmarYEsperar({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Eliminar' });
    boton('Cancelar').click();
    await promesa;

    expect(document.activeElement).toBe(botonOrigen);
    botonOrigen.remove();
  });
});
