import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Evidencia } from '../../core/models';
import { EvidenciasMiniaturas } from './evidencias-miniaturas';

function evidencia(id: number, descripcion: string): Evidencia {
  return {
    id,
    hallazgo_id: 1,
    tipo: 'captura',
    archivo: new Blob([new Uint8Array(4)], { type: 'image/png' }),
    descripcion,
  };
}

function crearFixture(evidencias: Evidencia[]): ComponentFixture<EvidenciasMiniaturas> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(EvidenciasMiniaturas);
  fixture.componentRef.setInput('evidencias', evidencias);
  fixture.detectChanges();
  return fixture;
}

function imagenes(fixture: ComponentFixture<EvidenciasMiniaturas>): HTMLImageElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('img'));
}

describe('EvidenciasMiniaturas', () => {
  it('pinta una miniatura enlazada por evidencia, con su descripción como alt', () => {
    const fixture = crearFixture([evidencia(1, 'Botón sin contraste'), evidencia(2, 'Imagen sin alt')]);

    const enlaces: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ul[aria-label="Evidencias del hallazgo"] a'),
    );
    expect(enlaces.length).toBe(2);
    expect(enlaces.every((enlace) => enlace.target === '_blank')).toBe(true);
    expect(imagenes(fixture).map((img) => img.alt)).toEqual([
      'Botón sin contraste',
      'Imagen sin alt',
    ]);
  });

  it('no pinta ninguna lista cuando el hallazgo no tiene evidencias', () => {
    const fixture = crearFixture([]);

    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  // Una URL por Evidencia y no una nueva en cada repintado: sin cachearlas,
  // cada ciclo de detección de cambios dejaría una Blob URL sin revocar.
  it('reutiliza la misma URL de objeto entre repintados', () => {
    const fixture = crearFixture([evidencia(1, 'Botón sin contraste')]);
    const urlInicial = imagenes(fixture)[0].src;

    fixture.detectChanges();

    expect(imagenes(fixture)[0].src).toBe(urlInicial);
  });

  it('revoca sus URL de objeto al destruirse', () => {
    const revocadas: string[] = [];
    const revokeOriginal = URL.revokeObjectURL;
    URL.revokeObjectURL = (url: string) => revocadas.push(url) && undefined;

    try {
      const fixture = crearFixture([evidencia(1, 'Botón sin contraste')]);
      const url = imagenes(fixture)[0].src;

      fixture.destroy();

      expect(revocadas).toEqual([url]);
    } finally {
      URL.revokeObjectURL = revokeOriginal;
    }
  });
});
