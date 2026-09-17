import { agruparViolacionesPorCriterio, type ViolacionAxe } from './escaneo-axe';

// EscaneoAxeService.ejecutarSobreHtml() depende de que el iframe aislado
// ejecute el script inyectado (axe.source + axe.run) y responda por
// postMessage — jsdom no ejecuta scripts dentro de un iframe con srcdoc por
// defecto, así que ese flujo de extremo a extremo no se puede probar aquí de
// forma fiable. La lógica de agregación/persistencia que sí depende de este
// módulo (agruparViolacionesPorCriterio) se prueba abajo sin DOM; el resto
// se verifica manualmente en un navegador real — ver specs/11-escaneo-axe.md
// "Riesgos identificados".
function violacion(datos: Partial<ViolacionAxe> & Pick<ViolacionAxe, 'tags'>): ViolacionAxe {
  return { impact: 'moderate', help: 'Ayuda de la regla', ...datos };
}

describe('agruparViolacionesPorCriterio', () => {
  it('mapea una violación a su criterio con severidad y notas', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag2aa', 'wcag143'], impact: 'serious', help: 'Contraste insuficiente' }),
    ]);

    expect(agrupado.get('1.4.3')).toEqual({ severidad: 'alta', notas: 'Contraste insuficiente' });
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
    });
  });

  it('mantiene entradas separadas para criterios distintos', () => {
    const agrupado = agruparViolacionesPorCriterio([
      violacion({ tags: ['wcag111'], help: 'Falta alt' }),
      violacion({ tags: ['wcag143'], help: 'Contraste' }),
    ]);

    expect([...agrupado.keys()].sort()).toEqual(['1.1.1', '1.4.3']);
  });
});
