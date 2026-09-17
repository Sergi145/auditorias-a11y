import { codigosCriterioParaTags, severidadDesdeImpacto } from './axe-wcag-mapping';

describe('codigosCriterioParaTags', () => {
  it('mapea el tag de una regla de contraste a 1.4.3', () => {
    expect(codigosCriterioParaTags(['cat.color', 'wcag2aa', 'wcag143'])).toEqual(['1.4.3']);
  });

  it('mapea el tag de una regla de alternativa textual a 1.1.1', () => {
    expect(codigosCriterioParaTags(['cat.text-alternatives', 'wcag2a', 'wcag111'])).toEqual(['1.1.1']);
  });

  it('devuelve varios códigos si hay varios tags wcagNNN reconocidos', () => {
    expect(codigosCriterioParaTags(['wcag111', 'wcag412'])).toEqual(['1.1.1', '4.1.2']);
  });

  it('devuelve una lista vacía si ningún tag coincide con el catálogo', () => {
    expect(codigosCriterioParaTags(['best-practice', 'cat.aria'])).toEqual([]);
  });
});

describe('severidadDesdeImpacto', () => {
  it('mapea critical a crítica', () => {
    expect(severidadDesdeImpacto('critical')).toBe('critica');
  });

  it('mapea serious a alta', () => {
    expect(severidadDesdeImpacto('serious')).toBe('alta');
  });

  it('mapea moderate a media', () => {
    expect(severidadDesdeImpacto('moderate')).toBe('media');
  });

  it('mapea minor a baja', () => {
    expect(severidadDesdeImpacto('minor')).toBe('baja');
  });

  it('mapea null a media, no a baja', () => {
    expect(severidadDesdeImpacto(null)).toBe('media');
  });

  it('mapea undefined a media', () => {
    expect(severidadDesdeImpacto(undefined)).toBe('media');
  });
});
