import { agruparViolacionesPorCriterio, type ViolacionAxe } from './escaneo-axe';

// EscaneoAxeService.ejecutarSobreHtml() depende de que el iframe aislado
// ejecute el script inyectado (axe.source + axe.run) y responda por
// postMessage — jsdom no ejecuta scripts dentro de un iframe con srcdoc por
// defecto, así que ese flujo de extremo a extremo no se puede probar aquí de
// forma fiable. La lógica de agregación/persistencia que sí depende de este
// módulo (agruparViolacionesPorCriterio) se prueba abajo sin DOM; el resto
// se verifica manualmente en un navegador real — ver specs/11-escaneo-axe.md
// "Riesgos identificados".
//
// Por defecto el id es de una regla que no está en TRADUCCIONES_AXE, así que
// las notas usan el help tal cual (fallback) y los tests de agrupación no
// dependen del texto de las traducciones — ver specs/19-traduccion-axe.md.
function violacion(datos: Partial<ViolacionAxe> & Pick<ViolacionAxe, 'tags'>): ViolacionAxe {
  return { id: 'regla-sin-traduccion', impact: 'moderate', help: 'Ayuda de la regla', ...datos };
}

describe('agruparViolacionesPorCriterio', () => {
  it('mapea una violación a su criterio con severidad y notas', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag2aa', 'wcag143'], impact: 'serious', help: 'Contraste insuficiente' }),
    ]);

    expect(agrupado.get('1.4.3')).toEqual({
      severidad: 'alta',
      notas: 'Contraste insuficiente',
      capturas: [],
    });
  });

  it('ignora violaciones sin ningún tag reconocido del catálogo', () => {
    const agrupado = agruparViolacionesPorCriterio([violacion({ tags: ['best-practice'] })]);

    expect(agrupado.size).toBe(0);
  });

  it('agrega varias violaciones que mapean al mismo criterio en un único hallazgo', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag111'], impact: 'moderate', help: 'Primer problema' }),
      violacion({ tags: ['wcag111'], impact: 'critical', help: 'Segundo problema' }),
    ]);

    expect(agrupado.get('1.1.1')).toEqual({
      severidad: 'critica',
      notas: 'Primer problema\nSegundo problema',
      capturas: [],
    });
  });

  it('mantiene entradas separadas para criterios distintos', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag111'], help: 'Falta alt' }),
      violacion({ tags: ['wcag143'], help: 'Contraste' }),
    ]);

    expect([...agrupado.keys()].sort()).toEqual(['1.1.1', '1.4.3']);
  });

  it('agrega la captura de una violación con capturaPng (modo URL en vivo)', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag111'], help: 'Falta alt', capturaPng: 'data:image/png;base64,AAA' }),
    ]);

    expect(agrupado.get('1.1.1')?.capturas).toEqual([
      { dataUrl: 'data:image/png;base64,AAA', descripcion: 'Falta alt' },
    ]);
  });

  it('agrega varias capturas de distintas violaciones del mismo criterio', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag111'], help: 'Falta alt en logo', capturaPng: 'data:image/png;base64,AAA' }),
      violacion({ tags: ['wcag111'], help: 'Falta alt en icono', capturaPng: 'data:image/png;base64,BBB' }),
    ]);

    expect(agrupado.get('1.1.1')?.capturas).toEqual([
      { dataUrl: 'data:image/png;base64,AAA', descripcion: 'Falta alt en logo' },
      { dataUrl: 'data:image/png;base64,BBB', descripcion: 'Falta alt en icono' },
    ]);
  });

  it('deja capturas vacías cuando ninguna violación trae capturaPng (modo Pegar HTML)', () => {
    const agrupado = agruparViolacionesPorCriterio([violacion({ tags: ['wcag111'], help: 'Falta alt' })]);

    expect(agrupado.get('1.1.1')?.capturas).toEqual([]);
  });
});

describe('agruparViolacionesPorCriterio — textos en español (spec 19)', () => {
  it('guarda las notas traducidas al español según el id de la regla', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({
        id: 'image-alt',
        tags: ['wcag2a', 'wcag111'],
        impact: 'critical',
        help: 'Images must have alternative text',
      }),
      violacion({
        id: 'role-img-alt',
        tags: ['wcag2a', 'wcag111'],
        impact: 'serious',
        help: '[role="img"] and [role="image"] elements must have alternative text',
      }),
    ]);

    expect(agrupado.get('1.1.1')).toEqual({
      severidad: 'critica',
      notas:
        'Las imágenes deben tener texto alternativo\n' +
        'Los elementos con [role="img"] y [role="image"] deben tener texto alternativo',
      capturas: [],
    });
  });

  it('guarda en español la descripción de las capturas (modo URL en vivo)', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({
        id: 'color-contrast',
        tags: ['wcag2aa', 'wcag143'],
        help: 'Elements must meet minimum color contrast ratio thresholds',
        capturaPng: 'data:image/png;base64,AAA',
      }),
    ]);

    expect(agrupado.get('1.4.3')).toEqual({
      severidad: 'media',
      notas: 'Los elementos deben cumplir la relación de contraste de color mínima',
      capturas: [
        {
          dataUrl: 'data:image/png;base64,AAA',
          descripcion: 'Los elementos deben cumplir la relación de contraste de color mínima',
        },
      ],
    });
  });

  it('usa el help original en inglés si el id de la regla no tiene traducción', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({
        id: 'regla-futura-de-axe',
        tags: ['wcag111'],
        help: 'Some future rule help',
        capturaPng: 'data:image/png;base64,AAA',
      }),
    ]);

    expect(agrupado.get('1.1.1')?.notas).toBe('Some future rule help');
    expect(agrupado.get('1.1.1')?.capturas).toEqual([
      { dataUrl: 'data:image/png;base64,AAA', descripcion: 'Some future rule help' },
    ]);
  });

  it('usa el help original si la violación llega sin id (respuesta antigua de la función)', () => {
    const sinId = { tags: ['wcag111'], impact: 'minor', help: 'Images must have alternative text' };

    const agrupado = agruparViolacionesPorCriterio([sinId as unknown as ViolacionAxe]);

    expect(agrupado.get('1.1.1')?.notas).toBe('Images must have alternative text');
  });
});
