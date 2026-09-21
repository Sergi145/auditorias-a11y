import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AppCalendarioDialogo, ID_TITULO_CALENDARIO, opcionesCalendario } from './calendario-dialogo';

// «Hoy» de todos los tests: lunes 21 de septiembre de 2026. Solo se falsea
// Date, para no interferir con los temporizadores que usa Angular.
const HOY = '2026-09-21';

describe('AppCalendarioDialogo', () => {
  let dialog: Dialog;
  let overlay: HTMLElement;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21, 12, 0));

    TestBed.configureTestingModule({});
    dialog = TestBed.inject(Dialog);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    applicationRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    dialog.closeAll();
    vi.useRealTimers();
  });

  // dialog.open() adjunta el componente, pero su plantilla, los atributos del
  // contenedor y el foco inicial no se aplican hasta el siguiente ciclo de
  // detección de cambios (mismo motivo que en confirmacion.spec.ts).
  async function abrir(
    fecha: string | null,
  ): Promise<{ ref: DialogRef<string | undefined, AppCalendarioDialogo> }> {
    const ref = dialog.open<string | undefined, string | null, AppCalendarioDialogo>(
      AppCalendarioDialogo,
      opcionesCalendario(fecha),
    );
    await applicationRef.whenStable();
    return { ref };
  }

  function celda(iso: string): HTMLElement {
    const encontrada = overlay.querySelector<HTMLElement>(`td[data-fecha="${iso}"]`);
    if (!encontrada) throw new Error(`No se encontró el día ${iso}`);
    return encontrada;
  }

  function boton(nombre: string): HTMLButtonElement {
    const encontrado = Array.from(overlay.querySelectorAll('button')).find(
      (elemento) => (elemento.getAttribute('aria-label') ?? elemento.textContent?.trim()) === nombre,
    );
    if (!encontrado) throw new Error(`No se encontró el botón "${nombre}"`);
    return encontrado;
  }

  function titulo(): string {
    return overlay.querySelector('h2')?.textContent?.trim() ?? '';
  }

  function fechaConFoco(): string | null | undefined {
    return document.activeElement?.getAttribute('data-fecha');
  }

  // Manda una tecla al elemento que tiene el foco, como haría el navegador.
  async function pulsar(
    tecla: string,
    opciones: { shift?: boolean; alt?: boolean } = {},
  ): Promise<KeyboardEvent> {
    const evento = new KeyboardEvent('keydown', {
      key: tecla,
      shiftKey: opciones.shift ?? false,
      altKey: opciones.alt ?? false,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(evento);
    await applicationRef.whenStable();
    return evento;
  }

  async function soltar(tecla: string): Promise<KeyboardEvent> {
    const evento = new KeyboardEvent('keyup', { key: tecla, bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(evento);
    await applicationRef.whenStable();
    return evento;
  }

  describe('estructura y ARIA', () => {
    it('el contenedor es un diálogo modal etiquetado por el mes y el año', async () => {
      await abrir('2026-09-15');

      const dialogo = overlay.querySelector('[role="dialog"]');
      expect(dialogo).toBeTruthy();
      expect(dialogo?.getAttribute('aria-modal')).toBe('true');
      expect(dialogo?.getAttribute('aria-labelledby')).toBe(ID_TITULO_CALENDARIO);

      const encabezado = overlay.querySelector(`#${ID_TITULO_CALENDARIO}`);
      expect(encabezado?.tagName).toBe('H2');
      expect(encabezado?.textContent?.trim()).toBe('septiembre de 2026');
      expect(encabezado?.getAttribute('aria-live')).toBe('polite');
    });

    it('la rejilla es un grid etiquetado por el mismo título', async () => {
      await abrir('2026-09-15');

      const rejilla = overlay.querySelector('table');
      expect(rejilla?.getAttribute('role')).toBe('grid');
      expect(rejilla?.getAttribute('aria-labelledby')).toBe(ID_TITULO_CALENDARIO);
    });

    it('tiene 7 encabezados de columna, de lunes a domingo, con el nombre completo en abbr', async () => {
      await abrir('2026-09-15');

      const encabezados = Array.from(overlay.querySelectorAll('th[scope="col"]'));
      expect(encabezados.map((th) => th.textContent?.trim())).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
      expect(encabezados.map((th) => th.querySelector('abbr')?.getAttribute('title'))).toEqual([
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado',
        'domingo',
      ]);
    });

    it('cada día tiene la fecha larga como nombre accesible', async () => {
      await abrir('2026-09-15');

      expect(celda('2026-09-15').getAttribute('aria-label')).toBe('martes, 15 de septiembre de 2026');
      expect(celda('2026-09-15').textContent?.trim()).toBe('15');
      expect(celda('2026-09-21').getAttribute('aria-label')).toBe('lunes, 21 de septiembre de 2026');
    });

    it('septiembre tiene 30 días, y las celdas de otros meses están vacías y no son enfocables', async () => {
      await abrir('2026-09-15');

      expect(overlay.querySelectorAll('td[data-fecha]').length).toBe(30);
      const vacias = Array.from(overlay.querySelectorAll('td:not([data-fecha])'));
      expect(vacias.length).toBe(5);
      for (const vacia of vacias) {
        expect(vacia.textContent?.trim()).toBe('');
        expect(vacia.hasAttribute('tabindex')).toBe(false);
        expect(vacia.hasAttribute('aria-label')).toBe(false);
      }
    });

    it('solo el día seleccionado lleva aria-selected y solo hoy lleva aria-current', async () => {
      await abrir('2026-09-15');

      const seleccionados = overlay.querySelectorAll('td[aria-selected]');
      expect(seleccionados.length).toBe(1);
      expect(seleccionados[0]).toBe(celda('2026-09-15'));
      expect(seleccionados[0].getAttribute('aria-selected')).toBe('true');

      const actuales = overlay.querySelectorAll('td[aria-current]');
      expect(actuales.length).toBe(1);
      expect(actuales[0]).toBe(celda(HOY));
      expect(actuales[0].getAttribute('aria-current')).toBe('date');
    });

    it('sin fecha seleccionada, ningún día lleva aria-selected', async () => {
      await abrir(null);

      expect(overlay.querySelectorAll('td[aria-selected]').length).toBe(0);
    });

    it('si hoy no está en el mes que se ve, ningún día lleva aria-current', async () => {
      await abrir('2026-11-10');

      expect(overlay.querySelectorAll('td[aria-current]').length).toBe(0);
    });

    it('el día seleccionado y el de hoy se distinguen sin depender solo del color', async () => {
      await abrir('2026-09-15');

      // Seleccionado: relleno. Hoy: borde de color. El resto: borde transparente.
      expect(celda('2026-09-15').className).toContain('bg-violet-700');
      expect(celda(HOY).className).toContain('border-violet-700');
      expect(celda(HOY).className).not.toContain('bg-violet-700');
      expect(celda('2026-09-16').className).toContain('border-transparent');
      expect(celda('2026-09-16').className).not.toContain('bg-violet-700');
    });

    it('la rejilla es una sola parada de tabulación, y el orden de Tab es cabecera, rejilla, Cancelar, Aceptar', async () => {
      await abrir('2026-09-15');

      expect(overlay.querySelectorAll('td[tabindex="0"]').length).toBe(1);
      expect(overlay.querySelectorAll('td[tabindex="-1"]').length).toBe(29);

      // Sin las anclas invisibles de la trampa de foco del CDK, que llevan
      // tabindex="0" pero solo devuelven el foco al otro extremo del diálogo.
      const paradas = Array.from(overlay.querySelectorAll('button, [tabindex="0"]:not(.cdk-focus-trap-anchor)')).map(
        (elemento) => elemento.getAttribute('aria-label') ?? elemento.textContent?.trim(),
      );
      expect(paradas).toEqual([
        'Año anterior',
        'Mes anterior',
        'Mes siguiente',
        'Año siguiente',
        'martes, 15 de septiembre de 2026',
        'Cancelar',
        'Aceptar',
      ]);
    });
  });

  describe('foco inicial', () => {
    it('va al día seleccionado', async () => {
      await abrir('2026-09-15');

      expect(document.activeElement).toBe(celda('2026-09-15'));
    });

    it('va a hoy si no hay fecha', async () => {
      await abrir(null);

      expect(document.activeElement).toBe(celda(HOY));
    });

    it('va a hoy si la fecha no es válida', async () => {
      await abrir('2026-02-31');

      expect(document.activeElement).toBe(celda(HOY));
    });

    it('abre en el mes de la fecha seleccionada', async () => {
      await abrir('2028-02-29');

      expect(titulo()).toBe('febrero de 2028');
      expect(document.activeElement).toBe(celda('2028-02-29'));
    });

    it('devuelve el foco al elemento que abrió el diálogo al cerrarse', async () => {
      const botonOrigen = document.createElement('button');
      botonOrigen.textContent = 'Elegir fecha';
      document.body.appendChild(botonOrigen);
      botonOrigen.focus();

      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);
      boton('Cancelar').click();
      await cierre;

      expect(document.activeElement).toBe(botonOrigen);
      botonOrigen.remove();
    });
  });

  describe('teclado en la rejilla', () => {
    const CASOS: { desde: string; tecla: string; shift?: boolean; hasta: string; titulo: string }[] = [
      { desde: '2026-09-15', tecla: 'ArrowRight', hasta: '2026-09-16', titulo: 'septiembre de 2026' },
      { desde: '2026-09-15', tecla: 'ArrowLeft', hasta: '2026-09-14', titulo: 'septiembre de 2026' },
      { desde: '2026-09-15', tecla: 'ArrowDown', hasta: '2026-09-22', titulo: 'septiembre de 2026' },
      { desde: '2026-09-15', tecla: 'ArrowUp', hasta: '2026-09-08', titulo: 'septiembre de 2026' },
      // Cambio de mes y de año al salirse por los bordes.
      { desde: '2026-09-30', tecla: 'ArrowRight', hasta: '2026-10-01', titulo: 'octubre de 2026' },
      { desde: '2026-10-01', tecla: 'ArrowLeft', hasta: '2026-09-30', titulo: 'septiembre de 2026' },
      { desde: '2026-09-28', tecla: 'ArrowDown', hasta: '2026-10-05', titulo: 'octubre de 2026' },
      { desde: '2026-10-03', tecla: 'ArrowUp', hasta: '2026-09-26', titulo: 'septiembre de 2026' },
      { desde: '2026-12-31', tecla: 'ArrowRight', hasta: '2027-01-01', titulo: 'enero de 2027' },
      // Inicio y Fin: lunes y domingo de esa semana (16/09/2026 es miércoles).
      { desde: '2026-09-16', tecla: 'Home', hasta: '2026-09-14', titulo: 'septiembre de 2026' },
      { desde: '2026-09-16', tecla: 'End', hasta: '2026-09-20', titulo: 'septiembre de 2026' },
      { desde: '2026-09-14', tecla: 'Home', hasta: '2026-09-14', titulo: 'septiembre de 2026' },
      { desde: '2026-09-20', tecla: 'End', hasta: '2026-09-20', titulo: 'septiembre de 2026' },
      // El lunes o el domingo pueden caer en el mes vecino.
      { desde: '2026-09-02', tecla: 'Home', hasta: '2026-08-31', titulo: 'agosto de 2026' },
      { desde: '2026-09-30', tecla: 'End', hasta: '2026-10-04', titulo: 'octubre de 2026' },
      // RePág y AvPág: mismo día del mes, o el último si no existe.
      { desde: '2026-09-15', tecla: 'PageDown', hasta: '2026-10-15', titulo: 'octubre de 2026' },
      { desde: '2026-09-15', tecla: 'PageUp', hasta: '2026-08-15', titulo: 'agosto de 2026' },
      { desde: '2026-12-15', tecla: 'PageDown', hasta: '2027-01-15', titulo: 'enero de 2027' },
      { desde: '2026-01-15', tecla: 'PageUp', hasta: '2025-12-15', titulo: 'diciembre de 2025' },
      { desde: '2026-01-31', tecla: 'PageDown', hasta: '2026-02-28', titulo: 'febrero de 2026' },
      { desde: '2028-01-31', tecla: 'PageDown', hasta: '2028-02-29', titulo: 'febrero de 2028' },
      { desde: '2026-03-31', tecla: 'PageUp', hasta: '2026-02-28', titulo: 'febrero de 2026' },
      // Mayús + RePág / AvPág: mismo día del año, o el 28 de febrero.
      { desde: '2026-09-15', tecla: 'PageDown', shift: true, hasta: '2027-09-15', titulo: 'septiembre de 2027' },
      { desde: '2026-09-15', tecla: 'PageUp', shift: true, hasta: '2025-09-15', titulo: 'septiembre de 2025' },
      { desde: '2028-02-29', tecla: 'PageDown', shift: true, hasta: '2029-02-28', titulo: 'febrero de 2029' },
      { desde: '2028-02-29', tecla: 'PageUp', shift: true, hasta: '2027-02-28', titulo: 'febrero de 2027' },
    ];

    for (const caso of CASOS) {
      const tecla = caso.shift ? `Mayús + ${caso.tecla}` : caso.tecla;
      it(`${tecla} desde ${caso.desde} lleva el foco a ${caso.hasta}`, async () => {
        await abrir(caso.desde);

        const evento = await pulsar(caso.tecla, { shift: caso.shift });

        expect(fechaConFoco()).toBe(caso.hasta);
        expect(titulo()).toBe(caso.titulo);
        expect(evento.defaultPrevented).toBe(true);
        // Sigue habiendo una sola parada de tabulación, y es el día con el foco.
        expect(overlay.querySelectorAll('td[tabindex="0"]').length).toBe(1);
        expect(overlay.querySelector('td[tabindex="0"]')).toBe(document.activeElement);
      });
    }

    it('mover el foco no cambia el día seleccionado ni el de hoy', async () => {
      await abrir('2026-09-15');

      await pulsar('ArrowRight');
      await pulsar('ArrowRight');

      expect(celda('2026-09-15').getAttribute('aria-selected')).toBe('true');
      expect(celda('2026-09-17').hasAttribute('aria-selected')).toBe(false);
      expect(celda(HOY).getAttribute('aria-current')).toBe('date');
    });

    it('al volver de otro mes, el día seleccionado sigue marcado', async () => {
      await abrir('2026-09-15');

      await pulsar('PageDown');
      expect(overlay.querySelectorAll('td[aria-selected]').length).toBe(0);
      await pulsar('PageUp');

      expect(celda('2026-09-15').getAttribute('aria-selected')).toBe('true');
    });

    it('no captura las combinaciones con Alt, Ctrl o Meta (Alt + ← es «atrás» en el navegador)', async () => {
      await abrir('2026-09-15');

      const evento = await pulsar('ArrowLeft', { alt: true });

      expect(evento.defaultPrevented).toBe(false);
      expect(fechaConFoco()).toBe('2026-09-15');
    });

    it('no captura Mayús + flecha ni otras teclas', async () => {
      await abrir('2026-09-15');

      const conMayus = await pulsar('ArrowRight', { shift: true });
      const otra = await pulsar('a');

      expect(conMayus.defaultPrevented).toBe(false);
      expect(otra.defaultPrevented).toBe(false);
      expect(fechaConFoco()).toBe('2026-09-15');
    });
  });

  describe('elegir y cancelar', () => {
    it('Intro elige el día con el foco y cierra', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      await pulsar('ArrowRight');
      await pulsar('Enter');

      expect(await cierre).toBe('2026-09-16');
    });

    it('Espacio elige el día con el foco al soltarlo, no al pulsarlo', async () => {
      const { ref } = await abrir('2026-09-15');
      let cerrado = false;
      ref.closed.subscribe(() => (cerrado = true));
      const cierre = firstValueFrom(ref.closed);

      const alPulsar = await pulsar(' ');
      expect(alPulsar.defaultPrevented).toBe(true);
      expect(cerrado).toBe(false);

      await soltar(' ');
      expect(await cierre).toBe('2026-09-15');
    });

    it('un clic en un día lo elige y cierra', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      celda('2026-09-24').click();

      expect(await cierre).toBe('2026-09-24');
    });

    it('un clic en una celda vacía o en el encabezado no cierra', async () => {
      const { ref } = await abrir('2026-09-15');
      let cerrado = false;
      ref.closed.subscribe(() => (cerrado = true));

      overlay.querySelector<HTMLElement>('td:not([data-fecha])')?.click();
      overlay.querySelector<HTMLElement>('th')?.click();

      expect(cerrado).toBe(false);
    });

    it('Aceptar elige el día con el foco, no el que estaba seleccionado al abrir', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      await pulsar('ArrowDown');
      boton('Aceptar').click();

      expect(await cierre).toBe('2026-09-22');
    });

    it('Aceptar sin haber movido nada devuelve la fecha con la que se abrió', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      boton('Aceptar').click();

      expect(await cierre).toBe('2026-09-15');
    });

    it('Aceptar sin fecha previa devuelve hoy', async () => {
      const { ref } = await abrir(null);
      const cierre = firstValueFrom(ref.closed);

      boton('Aceptar').click();

      expect(await cierre).toBe(HOY);
    });

    it('Cancelar cierra sin resultado', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      await pulsar('ArrowRight');
      boton('Cancelar').click();

      expect(await cierre).toBeUndefined();
    });

    it('Esc cierra sin resultado', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
      );

      expect(await cierre).toBeUndefined();
    });

    it('un clic fuera del diálogo cierra sin resultado', async () => {
      const { ref } = await abrir('2026-09-15');
      const cierre = firstValueFrom(ref.closed);

      document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();

      expect(await cierre).toBeUndefined();
    });
  });

  describe('botones de mes y año', () => {
    it('Mes siguiente y Mes anterior cambian el mes y conservan el día, sin mover el foco del botón', async () => {
      await abrir('2026-09-15');
      const siguiente = boton('Mes siguiente');
      siguiente.focus();

      siguiente.click();
      await applicationRef.whenStable();

      expect(titulo()).toBe('octubre de 2026');
      expect(overlay.querySelector('td[tabindex="0"]')).toBe(celda('2026-10-15'));
      expect(document.activeElement).toBe(siguiente);

      boton('Mes anterior').click();
      await applicationRef.whenStable();
      boton('Mes anterior').click();
      await applicationRef.whenStable();

      expect(titulo()).toBe('agosto de 2026');
      expect(overlay.querySelector('td[tabindex="0"]')).toBe(celda('2026-08-15'));
    });

    it('Año siguiente y Año anterior cambian el año, sin mover el foco del botón', async () => {
      await abrir('2026-09-15');
      const anterior = boton('Año anterior');
      anterior.focus();

      anterior.click();
      await applicationRef.whenStable();

      expect(titulo()).toBe('septiembre de 2025');
      expect(overlay.querySelector('td[tabindex="0"]')).toBe(celda('2025-09-15'));
      expect(document.activeElement).toBe(anterior);

      boton('Año siguiente').click();
      await applicationRef.whenStable();
      boton('Año siguiente').click();
      await applicationRef.whenStable();

      expect(titulo()).toBe('septiembre de 2027');
    });

    it('al cambiar de mes, el día activo cae en el último día si el mes no tiene ese día', async () => {
      await abrir('2026-01-31');

      boton('Mes siguiente').click();
      await applicationRef.whenStable();

      expect(titulo()).toBe('febrero de 2026');
      expect(overlay.querySelector('td[tabindex="0"]')).toBe(celda('2026-02-28'));
    });

    it('el título se puede anunciar: es la región aria-live y cambia con el mes', async () => {
      await abrir('2026-09-15');

      boton('Mes siguiente').click();
      await applicationRef.whenStable();

      const encabezado = overlay.querySelector(`#${ID_TITULO_CALENDARIO}`);
      expect(encabezado?.getAttribute('aria-live')).toBe('polite');
      expect(encabezado?.textContent?.trim()).toBe('octubre de 2026');
    });
  });

  describe('mensaje de ayuda', () => {
    function ayuda(): string {
      return overlay.querySelector('p[aria-live="polite"]')?.textContent?.trim() ?? '';
    }

    it('aparece mientras el foco está en la rejilla y se vacía al salir de ella', async () => {
      await abrir('2026-09-15');
      expect(ayuda()).toBe('Usa las flechas para moverte entre los días.');

      boton('Cancelar').focus();
      await applicationRef.whenStable();

      expect(ayuda()).toBe('');

      celda('2026-09-15').focus();
      await applicationRef.whenStable();

      expect(ayuda()).toBe('Usa las flechas para moverte entre los días.');
    });

    it('sigue visible al mover el foco de un día a otro', async () => {
      await abrir('2026-09-15');

      await pulsar('PageDown');

      expect(ayuda()).toBe('Usa las flechas para moverte entre los días.');
    });
  });
});
