import * as axe from 'axe-core';
import { TAGS_WCAG_2_2_A_AA } from './axe-tags';
import { TRADUCCIONES_AXE, textoViolacionEs } from './axe-traducciones';

// Cobertura del diccionario frente a las reglas que de verdad ejecutan los
// dos modos de escaneo: si una actualización de axe-core añade una regla
// WCAG A/AA, este test falla hasta que se traduzca — ver
// specs/19-traduccion-axe.md.
describe('TRADUCCIONES_AXE', () => {
  const idsReglas = axe.getRules(TAGS_WCAG_2_2_A_AA).map((regla) => regla.ruleId);

  it('traduce todas las reglas de axe-core que ejecuta TAGS_WCAG_2_2_A_AA', () => {
    const sinTraducir = idsReglas.filter(
      (id) => !Object.prototype.hasOwnProperty.call(TRADUCCIONES_AXE, id),
    );

    expect(idsReglas.length).toBeGreaterThan(0);
    expect(sinTraducir).toEqual([]);
  });

  it('no tiene traducciones vacías ni con punto final', () => {
    const invalidas = Object.entries(TRADUCCIONES_AXE).filter(
      ([, texto]) => texto.trim() === '' || texto.trim().endsWith('.'),
    );

    expect(invalidas).toEqual([]);
  });
});

describe('textoViolacionEs', () => {
  it('devuelve la traducción de una regla conocida', () => {
    expect(textoViolacionEs({ id: 'image-alt', help: 'Images must have alternative text' })).toBe(
      'Las imágenes deben tener texto alternativo',
    );
  });

  it('devuelve el help original si la regla no está en el diccionario', () => {
    expect(textoViolacionEs({ id: 'regla-desconocida', help: 'Unknown rule help' })).toBe(
      'Unknown rule help',
    );
  });

  it('devuelve el help original si la violación no trae id', () => {
    expect(textoViolacionEs({ help: 'Some help' })).toBe('Some help');
  });

  it('no confunde propiedades heredadas de Object con reglas traducidas', () => {
    expect(textoViolacionEs({ id: 'constructor', help: 'Original' })).toBe('Original');
  });
});
