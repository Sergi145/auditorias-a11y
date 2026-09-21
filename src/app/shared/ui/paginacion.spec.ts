import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppPaginacion, calcularPaginasVisibles, type HuecoPaginacion } from './paginacion';

// Recorre todas las combinaciones (página actual, total) y devuelve las que
// incumplen la propiedad, para que el fallo diga cuáles son.
function casosQueFallan(
  totalMax: number,
  cumple: (huecos: HuecoPaginacion[], actual: number, total: number) => boolean,
  totalMin = 1,
): string[] {
  const fallos: string[] = [];
  for (let total = totalMin; total <= totalMax; total++) {
    for (let actual = 1; actual <= total; actual++) {
      if (!cumple(calcularPaginasVisibles(actual, total), actual, total)) {
        fallos.push(`${actual} de ${total}`);
      }
    }
  }
  return fallos;
}

describe('calcularPaginasVisibles', () => {
  it('sin páginas devuelve una lista vacía', () => {
    expect(calcularPaginasVisibles(1, 0)).toEqual([]);
  });

  it('con una sola página devuelve solo la 1', () => {
    expect(calcularPaginasVisibles(1, 1)).toEqual([1]);
  });

  it('con 5 páginas o menos las muestra todas, sin saltos', () => {
    expect(calcularPaginasVisibles(1, 2)).toEqual([1, 2]);
    expect(calcularPaginasVisibles(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cerca del principio: 1 2 3 … última', () => {
    expect(calcularPaginasVisibles(1, 10)).toEqual([1, 2, 3, 'salto', 10]);
    expect(calcularPaginasVisibles(2, 10)).toEqual([1, 2, 3, 'salto', 10]);
    expect(calcularPaginasVisibles(3, 10)).toEqual([1, 2, 3, 'salto', 10]);
  });

  it('cerca del final: 1 … antepenúltima penúltima última', () => {
    expect(calcularPaginasVisibles(8, 10)).toEqual([1, 'salto', 8, 9, 10]);
    expect(calcularPaginasVisibles(9, 10)).toEqual([1, 'salto', 8, 9, 10]);
    expect(calcularPaginasVisibles(10, 10)).toEqual([1, 'salto', 8, 9, 10]);
  });

  it('en medio: 1 … actual … última', () => {
    expect(calcularPaginasVisibles(4, 10)).toEqual([1, 'salto', 4, 'salto', 10]);
    expect(calcularPaginasVisibles(5, 10)).toEqual([1, 'salto', 5, 'salto', 10]);
    expect(calcularPaginasVisibles(7, 10)).toEqual([1, 'salto', 7, 'salto', 10]);
  });

  it('con 6 páginas no hay ventana central: solo los dos extremos', () => {
    expect(calcularPaginasVisibles(3, 6)).toEqual([1, 2, 3, 'salto', 6]);
    expect(calcularPaginasVisibles(4, 6)).toEqual([1, 'salto', 4, 5, 6]);
  });

  it('con 7 páginas la 4 queda en medio', () => {
    expect(calcularPaginasVisibles(4, 7)).toEqual([1, 'salto', 4, 'salto', 7]);
  });

  it('nunca supera 5 huecos', () => {
    expect(casosQueFallan(30, (huecos) => huecos.length <= 5)).toEqual([]);
  });

  it('siempre incluye la primera, la actual y la última', () => {
    expect(
      casosQueFallan(
        30,
        (huecos, actual, total) =>
          huecos.includes(1) && huecos.includes(actual) && huecos.includes(total),
      ),
    ).toEqual([]);
  });

  it('un salto nunca oculta una sola página', () => {
    expect(
      casosQueFallan(
        30,
        (huecos) =>
          huecos.every((hueco, i) => {
            if (hueco !== 'salto') {
              return true;
            }
            return (huecos[i + 1] as number) - (huecos[i - 1] as number) > 2;
          }),
        6,
      ),
    ).toEqual([]);
  });

  it('los números van en orden creciente y sin repetir', () => {
    expect(
      casosQueFallan(30, (huecos) => {
        const numeros = huecos.filter((hueco): hueco is number => hueco !== 'salto');
        return numeros.every((numero, i) => i === 0 || numero > numeros[i - 1]);
      }),
    ).toEqual([]);
  });

  it('una página actual fuera de rango se ajusta al extremo más cercano', () => {
    expect(calcularPaginasVisibles(0, 10)).toEqual([1, 2, 3, 'salto', 10]);
    expect(calcularPaginasVisibles(99, 10)).toEqual([1, 'salto', 8, 9, 10]);
  });
});

function crearFixture(
  total: number,
  paginaActual: number,
  porPagina = 9,
): ComponentFixture<AppPaginacion> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(AppPaginacion);
  fixture.componentRef.setInput('total', total);
  fixture.componentRef.setInput('porPagina', porPagina);
  fixture.componentRef.setInput('paginaActual', paginaActual);
  fixture.componentRef.setInput('etiqueta', 'Paginación de auditorías');
  fixture.detectChanges();
  return fixture;
}

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();
}

// Un control por <li> visible para lectores de pantalla: enlaces y extremos
// inactivos, sin los "…" (aria-hidden).
function controles(fixture: ComponentFixture<AppPaginacion>): Element[] {
  return Array.from(fixture.nativeElement.querySelectorAll('li:not([aria-hidden="true"]) > *'));
}

function enlace(
  fixture: ComponentFixture<AppPaginacion>,
  nombre: string,
): HTMLAnchorElement | undefined {
  const enlaces: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
  return enlaces.find((a) => texto(a) === nombre);
}

describe('AppPaginacion', () => {
  it('no se pinta si todo cabe en una página', () => {
    const fixture = crearFixture(9, 1);

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('se pinta con más elementos que los de una página', () => {
    const fixture = crearFixture(10, 1);

    expect(fixture.nativeElement.querySelector('nav')).not.toBeNull();
  });

  it('el <nav> tiene el nombre accesible recibido', () => {
    const fixture = crearFixture(10, 1);

    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe(
      'Paginación de auditorías',
    );
  });

  it('cada número tiene el nombre accesible "Página N"', () => {
    const fixture = crearFixture(27, 1);

    expect(controles(fixture).map(texto)).toEqual([
      'Página anterior',
      'Página 1',
      'Página 2',
      'Página 3',
      'Página siguiente',
    ]);
  });

  it('solo la página actual lleva aria-current="page"', () => {
    const fixture = crearFixture(27, 2);

    const actuales: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('[aria-current]'),
    );
    expect(actuales.length).toBe(1);
    expect(actuales[0].getAttribute('aria-current')).toBe('page');
    expect(texto(actuales[0])).toBe('Página 2');
  });

  it('en la página 1, "Página anterior" es un texto inactivo: aria-disabled, sin href y fuera del orden de tabulación', () => {
    const fixture = crearFixture(27, 1);

    expect(enlace(fixture, 'Página anterior')).toBeUndefined();
    const anterior = controles(fixture)[0];
    expect(texto(anterior)).toBe('Página anterior');
    expect(anterior.tagName).toBe('SPAN');
    expect(anterior.getAttribute('aria-disabled')).toBe('true');
    expect(anterior.hasAttribute('href')).toBe(false);
    expect(anterior.hasAttribute('tabindex')).toBe(false);
    expect(enlace(fixture, 'Página siguiente')).toBeDefined();
  });

  it('en la última página, "Página siguiente" es un texto inactivo', () => {
    const fixture = crearFixture(27, 3);

    expect(enlace(fixture, 'Página siguiente')).toBeUndefined();
    const controlesPintados = controles(fixture);
    const siguiente = controlesPintados[controlesPintados.length - 1];
    expect(texto(siguiente)).toBe('Página siguiente');
    expect(siguiente.tagName).toBe('SPAN');
    expect(siguiente.getAttribute('aria-disabled')).toBe('true');
    expect(siguiente.hasAttribute('tabindex')).toBe(false);
    expect(enlace(fixture, 'Página anterior')).toBeDefined();
  });

  it('en una página intermedia, ambos extremos son enlaces', () => {
    const fixture = crearFixture(27, 2);

    expect(enlace(fixture, 'Página anterior')).toBeDefined();
    expect(enlace(fixture, 'Página siguiente')).toBeDefined();
    expect(fixture.nativeElement.querySelector('[aria-disabled]')).toBeNull();
  });

  it('la página 1 se enlaza sin `pagina`; las demás con ?pagina=N', () => {
    const fixture = crearFixture(27, 2);

    expect(enlace(fixture, 'Página 1')?.getAttribute('href')).toBe('/');
    expect(enlace(fixture, 'Página 3')?.getAttribute('href')).toBe('/?pagina=3');
    expect(enlace(fixture, 'Página anterior')?.getAttribute('href')).toBe('/');
    expect(enlace(fixture, 'Página siguiente')?.getAttribute('href')).toBe('/?pagina=3');
  });

  it('con muchas páginas, los saltos son "…" ocultos a lectores de pantalla', () => {
    const fixture = crearFixture(90, 5);

    const saltos: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('li[aria-hidden="true"]'),
    );
    expect(saltos.length).toBe(2);
    expect(saltos.every((salto) => texto(salto) === '…')).toBe(true);
    expect(controles(fixture).map(texto)).toEqual([
      'Página anterior',
      'Página 1',
      'Página 5',
      'Página 10',
      'Página siguiente',
    ]);
  });

  it('el texto de "Página anterior"/"Página siguiente" está en sr-only por debajo de `sm`', () => {
    const fixture = crearFixture(27, 2);

    for (const nombre of ['Página anterior', 'Página siguiente']) {
      const etiqueta = enlace(fixture, nombre)?.querySelector('span');
      expect(etiqueta?.classList.contains('sr-only')).toBe(true);
      expect(etiqueta?.classList.contains('sm:not-sr-only')).toBe(true);
    }
  });

  it('una página actual fuera de rango se ajusta a la última', () => {
    const fixture = crearFixture(27, 99);

    expect(texto(fixture.nativeElement.querySelector('[aria-current="page"]'))).toBe('Página 3');
    expect(enlace(fixture, 'Página siguiente')).toBeUndefined();
  });

  it('se actualiza al cambiar la página actual', () => {
    const fixture = crearFixture(27, 1);

    fixture.componentRef.setInput('paginaActual', 2);
    fixture.detectChanges();

    expect(texto(fixture.nativeElement.querySelector('[aria-current="page"]'))).toBe('Página 2');
  });
});
