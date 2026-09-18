import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppDistribucionBarras, type FilaDistribucion } from './distribucion-barras';

function crearFixture(filas: FilaDistribucion[], unidad = 'hallazgos'): ComponentFixture<AppDistribucionBarras> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(AppDistribucionBarras);
  fixture.componentRef.setInput('filas', filas);
  fixture.componentRef.setInput('unidad', unidad);
  fixture.detectChanges();
  return fixture;
}

function barras(fixture: ComponentFixture<AppDistribucionBarras>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('[aria-hidden="true"]'));
}

describe('AppDistribucionBarras', () => {
  it('pinta una fila por elemento, con la etiqueta en texto', () => {
    const fixture = crearFixture([
      { etiqueta: 'Falla', cantidad: 2 },
      { etiqueta: 'Pasa', cantidad: 1 },
    ]);

    const filas: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Falla');
    expect(filas[1].textContent).toContain('Pasa');
  });

  it('las barras son aria-hidden, decorativas', () => {
    const fixture = crearFixture([{ etiqueta: 'Falla', cantidad: 2 }]);

    expect(barras(fixture).length).toBeGreaterThan(0);
  });

  it('la cifra aparece en texto seguida de su unidad, solo audible para lector de pantalla', () => {
    const fixture = crearFixture([{ etiqueta: 'Falla', cantidad: 2 }], 'criterios en falla');

    const fila: HTMLLIElement = fixture.nativeElement.querySelector('li');
    expect(fila.textContent?.replace(/\s+/g, ' ').trim()).toContain('2 criterios en falla');

    const srOnly = fila.querySelector('.sr-only');
    expect(srOnly?.textContent?.trim()).toBe('criterios en falla');
  });

  it('la fila con el máximo ocupa el 100% del ancho de su barra', () => {
    const fixture = crearFixture([
      { etiqueta: 'Falla', cantidad: 4 },
      { etiqueta: 'Pasa', cantidad: 2 },
    ]);

    const barrasInternas: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('li > div > div'));
    expect(barrasInternas[0].style.width).toBe('100%');
    expect(barrasInternas[1].style.width).toBe('50%');
  });

  it('sin filas con cantidad, ninguna barra se divide por cero', () => {
    const fixture = crearFixture([
      { etiqueta: 'Falla', cantidad: 0 },
      { etiqueta: 'Pasa', cantidad: 0 },
    ]);

    const barrasInternas: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('li > div > div'));
    expect(barrasInternas.every((barra) => barra.style.width === '0%')).toBe(true);
  });

  it('aplica el color recibido y omite la clase por defecto', () => {
    const fixture = crearFixture([{ etiqueta: 'Falla', cantidad: 1, color: 'rgb(220, 38, 38)' }]);

    const barraInterna: HTMLElement = fixture.nativeElement.querySelector('li > div > div');
    expect(barraInterna.style.backgroundColor).toBe('rgb(220, 38, 38)');
    expect(barraInterna.classList.contains('bg-violet-700')).toBe(false);
  });

  it('sin color, usa el violeta por defecto', () => {
    const fixture = crearFixture([{ etiqueta: 'Perceptible', cantidad: 1 }]);

    const barraInterna: HTMLElement = fixture.nativeElement.querySelector('li > div > div');
    expect(barraInterna.classList.contains('bg-violet-700')).toBe(true);
  });
});
