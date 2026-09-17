import { describe, expect, it } from 'vitest';
import { PresupuestoCapturas, selectorSimple } from './captura-evidencia';

describe('selectorSimple', () => {
  it('devuelve el selector de un target simple de un solo elemento', () => {
    expect(selectorSimple(['button.enviar'])).toBe('button.enviar');
  });

  it('descarta un target vacío', () => {
    expect(selectorSimple([])).toBeNull();
  });

  it('descarta un target con más de un selector (shadow DOM)', () => {
    expect(selectorSimple(['mi-componente', 'button'])).toBeNull();
  });

  it('descarta un target con un elemento que es a su vez un array (iframe anidado)', () => {
    expect(selectorSimple([['iframe', 'button']])).toBeNull();
  });

  it('descarta valores que no son un array', () => {
    expect(selectorSimple('button.enviar')).toBeNull();
    expect(selectorSimple(undefined)).toBeNull();
    expect(selectorSimple(null)).toBeNull();
  });

  it('descarta un único selector vacío', () => {
    expect(selectorSimple([''])).toBeNull();
  });
});

describe('PresupuestoCapturas', () => {
  it('admite capturas mientras quepan en el máximo', () => {
    const presupuesto = new PresupuestoCapturas(1000);

    expect(presupuesto.admitir(400)).toBe(true);
    expect(presupuesto.admitir(400)).toBe(true);
  });

  it('rechaza una captura que superaría el máximo acumulado', () => {
    const presupuesto = new PresupuestoCapturas(1000);
    presupuesto.admitir(700);

    expect(presupuesto.admitir(400)).toBe(false);
  });

  it('sigue rechazando capturas más pequeñas una vez agotado el presupuesto', () => {
    const presupuesto = new PresupuestoCapturas(1000);
    presupuesto.admitir(700);
    presupuesto.admitir(400); // rechazada, no debe contabilizarse

    expect(presupuesto.admitir(200)).toBe(true);
    expect(presupuesto.admitir(200)).toBe(false);
  });

  it('admite una captura que encaja exactamente en el máximo', () => {
    const presupuesto = new PresupuestoCapturas(1000);

    expect(presupuesto.admitir(1000)).toBe(true);
  });
});
