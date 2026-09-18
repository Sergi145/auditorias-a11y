import { TestBed } from '@angular/core/testing';
import { AppToastHost, ToastService } from './toast';

describe('ToastService', () => {
  let servicio: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el mensaje tras una pausa breve y lo oculta a los 5 s', () => {
    servicio.mostrar('Revisión guardada.');
    expect(servicio.mensaje()).toBe('');

    vi.advanceTimersByTime(100);
    expect(servicio.mensaje()).toBe('Revisión guardada.');

    vi.advanceTimersByTime(5000);
    expect(servicio.mensaje()).toBe('');
  });

  it('un mensaje nuevo sustituye al anterior y reinicia el tiempo visible', () => {
    servicio.mostrar('Revisión guardada.');
    vi.advanceTimersByTime(100 + 4000);

    servicio.mostrar('Hallazgo añadido.');
    // Se vacía primero para que el lector anuncie el cambio.
    expect(servicio.mensaje()).toBe('');
    vi.advanceTimersByTime(100 + 4000);
    expect(servicio.mensaje()).toBe('Hallazgo añadido.');

    vi.advanceTimersByTime(1000);
    expect(servicio.mensaje()).toBe('');
  });
});

describe('AppToastHost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pinta el aviso dentro de una región role="status" que siempre está en el DOM', () => {
    const fixture = TestBed.createComponent(AppToastHost);
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent?.trim()).toBe('');

    TestBed.inject(ToastService).mostrar('Hallazgo eliminado.');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBe(region);
    expect(region.textContent?.trim()).toBe('Hallazgo eliminado.');
  });
});
