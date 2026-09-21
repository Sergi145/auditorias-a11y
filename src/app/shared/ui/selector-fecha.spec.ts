import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AppSelectorFecha } from './selector-fecha';

// «Hoy» de todos los tests: lunes 21 de septiembre de 2026. Solo se falsea
// Date, para no interferir con los temporizadores que usa Angular.
const HOY = '2026-09-21';

@Component({
  imports: [ReactiveFormsModule, AppSelectorFecha],
  template: `
    <app-selector-fecha
      [formControl]="control"
      inputId="campo-fecha"
      describedBy="campo-fecha-desc"
      [invalido]="invalido()"
      [required]="requerido()"
    />
  `,
})
class Anfitrion {
  readonly control = new FormControl<string | null>('');
  readonly invalido = signal(false);
  readonly requerido = signal(false);
}

describe('AppSelectorFecha', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let overlay: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21, 12, 0));
  });

  afterEach(() => {
    TestBed.inject(Dialog).closeAll();
    vi.useRealTimers();
  });

  // Con `movil` el BreakpointObserver responde que la pantalla es de móvil
  // (jsdom no tiene matchMedia, así que por defecto no lo es).
  async function crear(opciones: { movil?: boolean; valor?: string | null } = {}): Promise<Anfitrion> {
    TestBed.configureTestingModule({
      providers: opciones.movil
        ? [{ provide: BreakpointObserver, useValue: { observe: () => of({ matches: true, breakpoints: {} }) } }]
        : [],
    });
    fixture = TestBed.createComponent(Anfitrion);
    if (opciones.valor !== undefined) {
      fixture.componentInstance.control.setValue(opciones.valor);
    }
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  function entrada(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function boton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  async function estabilizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function escribir(texto: string): Promise<void> {
    entrada().value = texto;
    entrada().dispatchEvent(new Event('input', { bubbles: true }));
    await estabilizar();
  }

  async function salirDelCampo(): Promise<void> {
    entrada().dispatchEvent(new Event('blur'));
    await estabilizar();
  }

  function calendario(): HTMLElement | null {
    return overlay.querySelector('[role="dialog"]');
  }

  function celda(iso: string): HTMLElement {
    const encontrada = overlay.querySelector<HTMLElement>(`td[data-fecha="${iso}"]`);
    if (!encontrada) throw new Error(`No se encontró el día ${iso}`);
    return encontrada;
  }

  function botonDelCalendario(nombre: string): HTMLButtonElement {
    const encontrado = Array.from(overlay.querySelectorAll('button')).find(
      (elemento) => (elemento.getAttribute('aria-label') ?? elemento.textContent?.trim()) === nombre,
    );
    if (!encontrado) throw new Error(`No se encontró el botón "${nombre}"`);
    return encontrado;
  }

  async function pulsarEnElCalendario(tecla: string): Promise<void> {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: tecla, keyCode: tecla === 'Escape' ? 27 : 0, bubbles: true, cancelable: true }),
    );
    await estabilizar();
  }

  describe('valor y texto', () => {
    it('writeValue muestra la fecha ISO como dd/mm/aaaa', async () => {
      const anfitrion = await crear();

      anfitrion.control.setValue('2026-09-21');
      await estabilizar();

      expect(entrada().value).toBe('21/09/2026');
    });

    it('writeValue con null o vacío deja el campo vacío', async () => {
      const anfitrion = await crear({ valor: '2026-09-21' });

      anfitrion.control.setValue(null);
      await estabilizar();
      expect(entrada().value).toBe('');

      anfitrion.control.setValue('2026-09-21');
      anfitrion.control.reset();
      await estabilizar();
      expect(entrada().value).toBe('');
    });

    it('un valor de fuera que no es una fecha ISO se muestra tal cual y sale como no válido', async () => {
      const anfitrion = await crear({ valor: '2026-02-31' });

      expect(entrada().value).toBe('2026-02-31');
      expect(anfitrion.control.errors).toEqual({ fechaInvalida: true });
    });

    it('escribir una fecha válida emite su ISO y marca el control como sucio', async () => {
      const anfitrion = await crear();
      expect(anfitrion.control.dirty).toBe(false);

      await escribir('1/9/2026');

      expect(anfitrion.control.value).toBe('2026-09-01');
      expect(anfitrion.control.errors).toBeNull();
      expect(anfitrion.control.dirty).toBe(true);
    });

    it('escribir una fecha que no existe deja el valor vacío y el error fechaInvalida', async () => {
      const anfitrion = await crear();

      await escribir('31/02/2026');

      expect(anfitrion.control.value).toBe('');
      expect(anfitrion.control.errors).toEqual({ fechaInvalida: true });
      expect(anfitrion.control.invalid).toBe(true);
    });

    it('un texto que no es una fecha también es fechaInvalida', async () => {
      const anfitrion = await crear();

      for (const texto of ['hola', '01/09/26', '2026-09-01', '1/9']) {
        await escribir(texto);
        expect(anfitrion.control.value, texto).toBe('');
        expect(anfitrion.control.errors, texto).toEqual({ fechaInvalida: true });
      }
    });

    it('vaciar el campo deja el valor vacío y sin error de formato', async () => {
      const anfitrion = await crear({ valor: '2026-09-21' });

      await escribir('');

      expect(anfitrion.control.value).toBe('');
      expect(anfitrion.control.errors).toBeNull();
    });

    it('corregir un texto no válido quita el error', async () => {
      const anfitrion = await crear();

      await escribir('31/02/2026');
      await escribir('28/02/2026');

      expect(anfitrion.control.value).toBe('2026-02-28');
      expect(anfitrion.control.errors).toBeNull();
    });

    it('con required, el campo vacío tiene el error required y el texto no válido, los dos', async () => {
      const anfitrion = await crear();
      anfitrion.requerido.set(true);
      await estabilizar();

      expect(anfitrion.control.errors).toEqual({ required: true });

      await escribir('31/02/2026');

      expect(anfitrion.control.errors).toEqual({ required: true, fechaInvalida: true });
    });

    it('los espacios alrededor no cuentan', async () => {
      const anfitrion = await crear();

      await escribir(' 1/9/2026 ');

      expect(anfitrion.control.value).toBe('2026-09-01');
    });
  });

  describe('al salir del campo', () => {
    it('una fecha válida se reescribe con ceros y el control queda tocado', async () => {
      const anfitrion = await crear();
      await escribir('1/9/2026');
      expect(anfitrion.control.touched).toBe(false);

      await salirDelCampo();

      expect(entrada().value).toBe('01/09/2026');
      expect(anfitrion.control.value).toBe('2026-09-01');
      expect(anfitrion.control.touched).toBe(true);
    });

    it('un texto no válido se deja como está para que el usuario lo corrija', async () => {
      const anfitrion = await crear();
      await escribir('31/02/2026');

      await salirDelCampo();

      expect(entrada().value).toBe('31/02/2026');
      expect(anfitrion.control.touched).toBe(true);
      expect(anfitrion.control.errors).toEqual({ fechaInvalida: true });
    });

    it('un campo vacío queda tocado sin más cambios', async () => {
      const anfitrion = await crear();

      await salirDelCampo();

      expect(entrada().value).toBe('');
      expect(anfitrion.control.touched).toBe(true);
    });
  });

  describe('botón del calendario', () => {
    it('sin fecha se llama «Elegir fecha»', async () => {
      await crear();

      expect(boton().getAttribute('aria-label')).toBe('Elegir fecha');
    });

    it('con fecha se llama «Cambiar fecha» seguido de la fecha larga', async () => {
      await crear({ valor: '2026-09-21' });

      expect(boton().getAttribute('aria-label')).toBe('Cambiar fecha, lunes, 21 de septiembre de 2026');
    });

    it('el nombre sigue a lo que se escribe, y vuelve a «Elegir fecha» si el texto no es válido', async () => {
      await crear();

      await escribir('15/09/2026');
      expect(boton().getAttribute('aria-label')).toBe('Cambiar fecha, martes, 15 de septiembre de 2026');

      await escribir('31/02/2026');
      expect(boton().getAttribute('aria-label')).toBe('Elegir fecha');
    });

    it('es un botón de tipo button, avisa de que abre un diálogo y su icono está oculto', async () => {
      await crear();

      expect(boton().getAttribute('type')).toBe('button');
      expect(boton().getAttribute('aria-haspopup')).toBe('dialog');
      expect(boton().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('input de texto', () => {
    it('recibe el id, el aria-describedby y el estado inválido del campo', async () => {
      const anfitrion = await crear();

      expect(entrada().id).toBe('campo-fecha');
      expect(entrada().getAttribute('aria-describedby')).toBe('campo-fecha-desc');
      expect(entrada().getAttribute('aria-invalid')).toBe('false');

      anfitrion.invalido.set(true);
      await estabilizar();

      expect(entrada().getAttribute('aria-invalid')).toBe('true');
    });

    it('es de texto, con teclado numérico y sin autocompletar', async () => {
      await crear();

      expect(entrada().type).toBe('text');
      expect(entrada().getAttribute('inputmode')).toBe('numeric');
      expect(entrada().getAttribute('autocomplete')).toBe('off');
    });

    it('con required se anuncia como obligatorio', async () => {
      const anfitrion = await crear();
      expect(entrada().hasAttribute('aria-required')).toBe(false);

      anfitrion.requerido.set(true);
      await estabilizar();

      expect(entrada().getAttribute('aria-required')).toBe('true');
    });

    it('enfocar() pone el foco en el input de texto', async () => {
      await crear();
      const selector = fixture.debugElement.query((elemento) => elemento.name === 'app-selector-fecha');

      (selector.componentInstance as AppSelectorFecha).enfocar();

      expect(document.activeElement).toBe(entrada());
    });

    it('deshabilitar el control deshabilita el input y el botón', async () => {
      const anfitrion = await crear();

      anfitrion.control.disable();
      await estabilizar();
      expect(entrada().disabled).toBe(true);
      expect(boton().disabled).toBe(true);

      anfitrion.control.enable();
      await estabilizar();
      expect(entrada().disabled).toBe(false);
      expect(boton().disabled).toBe(false);
    });
  });

  describe('calendario', () => {
    it('al pulsar el botón se abre un diálogo con el foco en el día del control', async () => {
      await crear({ valor: '2026-09-15' });

      boton().click();
      await estabilizar();

      expect(calendario()).toBeTruthy();
      expect(overlay.querySelector('h2')?.textContent?.trim()).toBe('septiembre de 2026');
      expect(document.activeElement).toBe(celda('2026-09-15'));
    });

    it('sin fecha abre en hoy', async () => {
      await crear();

      boton().click();
      await estabilizar();

      expect(document.activeElement).toBe(celda(HOY));
    });

    it('abre en la fecha que se acaba de escribir, sin haber salido del campo', async () => {
      await crear();
      await escribir('5/10/2026');

      boton().click();
      await estabilizar();

      expect(overlay.querySelector('h2')?.textContent?.trim()).toBe('octubre de 2026');
      expect(document.activeElement).toBe(celda('2026-10-05'));
    });

    it('con un texto que no es una fecha, abre en hoy', async () => {
      await crear();
      await escribir('31/02/2026');

      boton().click();
      await estabilizar();

      expect(document.activeElement).toBe(celda(HOY));
    });

    it('elegir un día con un clic rellena el campo, ensucia y toca el control, y devuelve el foco al botón', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      expect(anfitrion.control.dirty).toBe(false);
      expect(anfitrion.control.touched).toBe(false);
      boton().click();
      await estabilizar();

      celda('2026-09-24').click();
      await estabilizar();

      expect(calendario()).toBeNull();
      expect(entrada().value).toBe('24/09/2026');
      expect(anfitrion.control.value).toBe('2026-09-24');
      expect(anfitrion.control.dirty).toBe(true);
      expect(anfitrion.control.touched).toBe(true);
      expect(document.activeElement).toBe(boton());
      expect(boton().getAttribute('aria-label')).toBe('Cambiar fecha, jueves, 24 de septiembre de 2026');
    });

    it('elegir un día con el teclado (flechas e Intro) funciona igual', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      boton().click();
      await estabilizar();

      await pulsarEnElCalendario('ArrowDown');
      await pulsarEnElCalendario('Enter');

      expect(calendario()).toBeNull();
      expect(anfitrion.control.value).toBe('2026-09-22');
      expect(entrada().value).toBe('22/09/2026');
      expect(document.activeElement).toBe(boton());
    });

    it('elegir un día cambiando de mes con los botones del calendario y Aceptar', async () => {
      const anfitrion = await crear({ valor: '2026-01-31' });
      boton().click();
      await estabilizar();

      botonDelCalendario('Mes siguiente').click();
      await estabilizar();
      botonDelCalendario('Aceptar').click();
      await estabilizar();

      expect(anfitrion.control.value).toBe('2026-02-28');
      expect(entrada().value).toBe('28/02/2026');
    });

    it('al elegir sobre un campo que tenía texto no válido, lo sustituye y quita el error', async () => {
      const anfitrion = await crear();
      await escribir('31/02/2026');
      expect(anfitrion.control.invalid).toBe(true);
      boton().click();
      await estabilizar();

      celda(HOY).click();
      await estabilizar();

      expect(entrada().value).toBe('21/09/2026');
      expect(anfitrion.control.errors).toBeNull();
    });

    it('Cancelar cierra sin cambiar nada y devuelve el foco al botón', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      boton().click();
      await estabilizar();
      await pulsarEnElCalendario('ArrowRight');

      botonDelCalendario('Cancelar').click();
      await estabilizar();

      expect(calendario()).toBeNull();
      expect(entrada().value).toBe('15/09/2026');
      expect(anfitrion.control.value).toBe('2026-09-15');
      expect(anfitrion.control.dirty).toBe(false);
      expect(document.activeElement).toBe(boton());
    });

    it('Esc cierra sin cambiar nada y devuelve el foco al botón', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      boton().click();
      await estabilizar();

      await pulsarEnElCalendario('Escape');

      expect(calendario()).toBeNull();
      expect(anfitrion.control.value).toBe('2026-09-15');
      expect(anfitrion.control.dirty).toBe(false);
      expect(document.activeElement).toBe(boton());
    });

    it('un clic fuera del calendario cierra sin cambiar nada y devuelve el foco al botón', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      boton().click();
      await estabilizar();

      document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
      await estabilizar();

      expect(calendario()).toBeNull();
      expect(anfitrion.control.value).toBe('2026-09-15');
      expect(anfitrion.control.dirty).toBe(false);
      expect(document.activeElement).toBe(boton());
    });

    it('Aceptar sin haber movido nada conserva la fecha', async () => {
      const anfitrion = await crear({ valor: '2026-09-15' });
      boton().click();
      await estabilizar();

      botonDelCalendario('Aceptar').click();
      await estabilizar();

      expect(anfitrion.control.value).toBe('2026-09-15');
      expect(anfitrion.control.dirty).toBe(true);
    });
  });

  describe('posición del calendario', () => {
    it('en escritorio va anclado al botón, con un fondo transparente que recoge el clic fuera', async () => {
      await crear();

      boton().click();
      await estabilizar();

      expect(overlay.querySelector('.cdk-overlay-connected-position-bounding-box')).toBeTruthy();
      expect(overlay.querySelector('.cdk-global-overlay-wrapper')).toBeNull();
      const fondo = document.querySelector('.cdk-overlay-backdrop');
      expect(fondo?.classList.contains('cdk-overlay-transparent-backdrop')).toBe(true);
      expect(fondo?.classList.contains('bg-black/40')).toBe(false);
    });

    it('en móvil va centrado, con el fondo oscuro del modal de confirmación', async () => {
      await crear({ movil: true });

      boton().click();
      await estabilizar();

      expect(overlay.querySelector('.cdk-global-overlay-wrapper [role="dialog"]')).toBeTruthy();
      expect(overlay.querySelector('.cdk-overlay-connected-position-bounding-box')).toBeNull();
      const fondo = document.querySelector('.cdk-overlay-backdrop');
      expect(fondo?.classList.contains('bg-black/40')).toBe(true);
      expect(fondo?.classList.contains('cdk-overlay-transparent-backdrop')).toBe(false);
    });

    it('en los dos casos deja 16 px de margen por lado como máximo', async () => {
      await crear();

      boton().click();
      await estabilizar();

      const panel = overlay.querySelector<HTMLElement>('.cdk-overlay-pane');
      expect(panel?.style.maxWidth).toBe('calc(100vw - 2rem)');
    });
  });
});
