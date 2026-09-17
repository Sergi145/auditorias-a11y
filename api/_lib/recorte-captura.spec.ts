import { describe, expect, it } from 'vitest';
import { recorteConContexto } from './recorte-captura';

const VIEWPORT = { width: 1280, height: 800 };

describe('recorteConContexto', () => {
  it('centra el recorte mínimo en un elemento diminuto', () => {
    // Un enlace de 32×32 en mitad de la página: sin mínimo, la miniatura
    // sería ilegible — ver specs/18-captura-con-contexto.md.
    const recorte = recorteConContexto({ x: 569, y: 400, width: 32, height: 32 }, VIEWPORT);

    expect(recorte).toEqual({ x: 345, y: 256, width: 480, height: 320 });
  });

  it('da margen alrededor de un elemento mayor que el mínimo', () => {
    const recorte = recorteConContexto({ x: 100, y: 100, width: 600, height: 400 }, VIEWPORT);

    // 600 + 48×2 = 696 de ancho, 400 + 48×2 = 496 de alto, centrado en el elemento.
    expect(recorte).toEqual({ x: 52, y: 52, width: 696, height: 496 });
  });

  it('no se sale del viewport con un elemento pegado a una esquina', () => {
    const recorte = recorteConContexto({ x: 0, y: 0, width: 20, height: 20 }, VIEWPORT);

    expect(recorte).toEqual({ x: 0, y: 0, width: 480, height: 320 });
  });

  it('no se sale del viewport con un elemento pegado al borde opuesto', () => {
    const recorte = recorteConContexto({ x: 1260, y: 780, width: 20, height: 20 }, VIEWPORT);

    expect(recorte).toEqual({ x: 800, y: 480, width: 480, height: 320 });
  });

  it('recorta al viewport un elemento más grande que él (html, body, contenedores)', () => {
    const recorte = recorteConContexto({ x: 0, y: 0, width: 1280, height: 5000 }, VIEWPORT);

    expect(recorte).toEqual({ x: 0, y: 0, width: 1280, height: 800 });
  });

  it('descarta un elemento sin superficie', () => {
    expect(recorteConContexto({ x: 10, y: 10, width: 0, height: 20 }, VIEWPORT)).toBeNull();
    expect(recorteConContexto({ x: 10, y: 10, width: 20, height: 0 }, VIEWPORT)).toBeNull();
  });

  it('respeta unas opciones de recorte a medida', () => {
    const recorte = recorteConContexto({ x: 600, y: 400, width: 10, height: 10 }, VIEWPORT, {
      margen: 10,
      minimoAncho: 100,
      minimoAlto: 100,
    });

    expect(recorte).toEqual({ x: 555, y: 355, width: 100, height: 100 });
  });
});
