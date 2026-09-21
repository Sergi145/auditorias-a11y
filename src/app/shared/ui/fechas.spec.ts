/// <reference types="node" />
import {
  diaDeSemana,
  esFechaIso,
  fechaDeHoy,
  fechaLarga,
  formatearFechaEs,
  nombreMesAnio,
  parsearFechaEs,
  semanasDelMes,
  sumarAnios,
  sumarDias,
  sumarMeses,
} from './fechas';

// Cambia la zona horaria del proceso mientras dura `fn` (Node la relee al
// asignar TZ). Antes comprueba que el cambio surte efecto: si no, el test
// pasaría sin probar nada.
function enZonaHoraria(zona: string, desfaseEsperado: number, fn: () => void): void {
  const anterior = process.env['TZ'];
  process.env['TZ'] = zona;
  try {
    expect(new Date(2026, 8, 21, 12).getTimezoneOffset()).toBe(desfaseEsperado);
    fn();
  } finally {
    if (anterior === undefined) {
      delete process.env['TZ'];
    } else {
      process.env['TZ'] = anterior;
    }
  }
}

describe('parsearFechaEs', () => {
  it('convierte dd/mm/aaaa a ISO', () => {
    expect(parsearFechaEs('21/09/2026')).toBe('2026-09-21');
  });

  it('acepta día y mes de una cifra', () => {
    expect(parsearFechaEs('1/9/2026')).toBe('2026-09-01');
    expect(parsearFechaEs('01/9/2026')).toBe('2026-09-01');
  });

  it('ignora los espacios alrededor', () => {
    expect(parsearFechaEs('  01/09/2026 ')).toBe('2026-09-01');
  });

  it('acepta el 29 de febrero solo en años bisiestos', () => {
    expect(parsearFechaEs('29/02/2028')).toBe('2028-02-29');
    expect(parsearFechaEs('29/02/2000')).toBe('2000-02-29');
    expect(parsearFechaEs('29/02/2027')).toBeNull();
    expect(parsearFechaEs('29/02/2100')).toBeNull();
  });

  it('rechaza los días que el mes no tiene', () => {
    expect(parsearFechaEs('31/02/2026')).toBeNull();
    expect(parsearFechaEs('31/04/2026')).toBeNull();
    expect(parsearFechaEs('30/04/2026')).toBe('2026-04-30');
    expect(parsearFechaEs('00/09/2026')).toBeNull();
  });

  it('rechaza un mes fuera de 1–12', () => {
    expect(parsearFechaEs('01/13/2026')).toBeNull();
    expect(parsearFechaEs('01/00/2026')).toBeNull();
  });

  it('rechaza texto que no tiene el formato dd/mm/aaaa', () => {
    for (const texto of [
      '',
      'hola',
      '2026-09-21',
      '1-9-2026',
      '01/09/26',
      '01/09/20266',
      '01/09',
      '01 / 09 / 2026',
      '001/09/2026',
      '01/09/0000',
    ]) {
      expect(parsearFechaEs(texto), texto).toBeNull();
    }
  });
});

describe('formatearFechaEs', () => {
  it('convierte ISO a dd/mm/aaaa', () => {
    expect(formatearFechaEs('2026-09-21')).toBe('21/09/2026');
    expect(formatearFechaEs('2026-01-05')).toBe('05/01/2026');
  });

  it('devuelve cadena vacía si no es una fecha ISO real', () => {
    for (const iso of ['', 'hola', '2026-02-31', '21/09/2026', '2026-9-21']) {
      expect(formatearFechaEs(iso), iso).toBe('');
    }
  });

  it('es la inversa de parsearFechaEs', () => {
    expect(parsearFechaEs(formatearFechaEs('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('fechaLarga', () => {
  it('escribe el día de la semana, el día, el mes y el año en español', () => {
    expect(fechaLarga('2026-09-21')).toBe('lunes, 21 de septiembre de 2026');
    expect(fechaLarga('2026-01-01')).toBe('jueves, 1 de enero de 2026');
    expect(fechaLarga('2028-02-29')).toBe('martes, 29 de febrero de 2028');
  });

  it('devuelve cadena vacía si no es una fecha ISO real', () => {
    for (const iso of ['', 'hola', '2026-02-31', '21/09/2026']) {
      expect(fechaLarga(iso), iso).toBe('');
    }
  });
});

describe('semanasDelMes', () => {
  it('reparte septiembre de 2026 (empieza en martes) de lunes a domingo', () => {
    const semanas = semanasDelMes(2026, 9);

    expect(semanas).toEqual([
      [null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
      ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'],
      ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'],
      ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'],
      ['2026-09-28', '2026-09-29', '2026-09-30', null, null, null, null],
    ]);
  });

  it('un mes de 28 días que empieza en lunes ocupa exactamente 4 filas, sin huecos', () => {
    const semanas = semanasDelMes(2027, 2);

    expect(semanas.length).toBe(4);
    expect(semanas.flat().every((celda) => celda !== null)).toBe(true);
    expect(semanas[0][0]).toBe('2027-02-01');
    expect(semanas[3][6]).toBe('2027-02-28');
  });

  it('un mes que empieza en domingo lleva 6 huecos delante', () => {
    const semanas = semanasDelMes(2026, 2);

    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-02-01']);
  });

  it('un mes de 31 días que empieza en sábado ocupa 6 filas', () => {
    const semanas = semanasDelMes(2026, 8);

    expect(semanas.length).toBe(6);
    expect(semanas[0][5]).toBe('2026-08-01');
    expect(semanas[5][0]).toBe('2026-08-31');
  });

  it('febrero solo tiene día 29 en año bisiesto', () => {
    const dias = (anio: number) => semanasDelMes(anio, 2).flat().filter((celda) => celda !== null);

    expect(dias(2028)).toContain('2028-02-29');
    expect(dias(2028).length).toBe(29);
    expect(dias(2027).length).toBe(28);
    expect(dias(2100).length).toBe(28);
  });

  it('cada fila tiene 7 celdas y los días del mes van seguidos y en orden', () => {
    for (const anio of [2026, 2028]) {
      for (let mes = 1; mes <= 12; mes++) {
        const semanas = semanasDelMes(anio, mes);
        const dias = semanas.flat().filter((celda): celda is string => celda !== null);
        const prefijo = `${anio}-${String(mes).padStart(2, '0')}-`;

        expect(semanas.every((semana) => semana.length === 7), `${anio}-${mes}`).toBe(true);
        expect(dias.every((dia) => dia.startsWith(prefijo)), `${anio}-${mes}`).toBe(true);
        expect(dias, `${anio}-${mes}`).toEqual([...dias].sort());
        expect(new Set(dias).size, `${anio}-${mes}`).toBe(dias.length);
        expect(dias[0], `${anio}-${mes}`).toBe(`${prefijo}01`);
      }
    }
  });

  it('diciembre acaba el día 31 del mismo año', () => {
    const dias = semanasDelMes(2026, 12).flat().filter((celda) => celda !== null);

    expect(dias[dias.length - 1]).toBe('2026-12-31');
  });
});

describe('esFechaIso', () => {
  it('acepta una fecha ISO real y rechaza el resto', () => {
    expect(esFechaIso('2026-09-21')).toBe(true);
    expect(esFechaIso('2028-02-29')).toBe(true);
    for (const iso of ['', 'hola', '2026-02-31', '2027-02-29', '21/09/2026', '2026-9-21', '0000-01-01']) {
      expect(esFechaIso(iso), iso).toBe(false);
    }
  });
});

describe('fechaDeHoy', () => {
  it('es la fecha local de `ahora`, con ceros a la izquierda', () => {
    expect(fechaDeHoy(new Date(2026, 8, 21, 23, 59))).toBe('2026-09-21');
    expect(fechaDeHoy(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('sin argumento devuelve una fecha ISO real', () => {
    expect(esFechaIso(fechaDeHoy())).toBe(true);
  });
});

describe('diaDeSemana', () => {
  it('0 es lunes y 6 es domingo', () => {
    expect(diaDeSemana('2026-09-21')).toBe(0);
    expect(diaDeSemana('2026-09-23')).toBe(2);
    expect(diaDeSemana('2026-09-27')).toBe(6);
  });

  it('lanza RangeError si no es una fecha ISO real', () => {
    expect(() => diaDeSemana('2026-02-31')).toThrow(RangeError);
  });
});

describe('sumarDias', () => {
  it('suma y resta días dentro del mes', () => {
    expect(sumarDias('2026-09-15', 1)).toBe('2026-09-16');
    expect(sumarDias('2026-09-15', -1)).toBe('2026-09-14');
    expect(sumarDias('2026-09-15', 7)).toBe('2026-09-22');
    expect(sumarDias('2026-09-15', 0)).toBe('2026-09-15');
  });

  it('cruza los límites de mes y de año', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
    expect(sumarDias('2026-10-01', -1)).toBe('2026-09-30');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('respeta los bisiestos', () => {
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2028-02-29', 1)).toBe('2028-03-01');
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('lanza RangeError si no es una fecha ISO real', () => {
    expect(() => sumarDias('hola', 1)).toThrow(RangeError);
  });
});

describe('sumarMeses', () => {
  it('conserva el día del mes', () => {
    expect(sumarMeses('2026-09-15', 1)).toBe('2026-10-15');
    expect(sumarMeses('2026-09-15', -1)).toBe('2026-08-15');
  });

  it('cruza el límite de año en los dos sentidos', () => {
    expect(sumarMeses('2026-12-15', 1)).toBe('2027-01-15');
    expect(sumarMeses('2026-01-15', -1)).toBe('2025-12-15');
    expect(sumarMeses('2026-01-15', 14)).toBe('2027-03-15');
    expect(sumarMeses('2026-01-15', -13)).toBe('2024-12-15');
  });

  it('si el mes de destino no tiene ese día, va a su último día', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2028-01-31', 1)).toBe('2028-02-29');
    expect(sumarMeses('2026-03-31', -1)).toBe('2026-02-28');
    expect(sumarMeses('2026-05-31', 1)).toBe('2026-06-30');
    expect(sumarMeses('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('lanza RangeError si no es una fecha ISO real', () => {
    expect(() => sumarMeses('2027-02-29', 1)).toThrow(RangeError);
  });
});

describe('sumarAnios', () => {
  it('conserva el día y el mes', () => {
    expect(sumarAnios('2026-09-15', 1)).toBe('2027-09-15');
    expect(sumarAnios('2026-09-15', -1)).toBe('2025-09-15');
  });

  it('el 29 de febrero cae en el 28 si el año de destino no es bisiesto', () => {
    expect(sumarAnios('2028-02-29', 1)).toBe('2029-02-28');
    expect(sumarAnios('2028-02-29', -1)).toBe('2027-02-28');
    expect(sumarAnios('2028-02-29', 4)).toBe('2032-02-29');
  });
});

describe('nombreMesAnio', () => {
  it('escribe el mes en español y el año', () => {
    expect(nombreMesAnio(2026, 9)).toBe('septiembre de 2026');
    expect(nombreMesAnio(2027, 1)).toBe('enero de 2027');
    expect(nombreMesAnio(2028, 12)).toBe('diciembre de 2028');
  });
});

describe('zona horaria', () => {
  // Desfase (minutos) de cada zona el 21/09/2026. Los Ángeles y Auckland caen
  // cada una a un lado del meridiano de Greenwich: con `new Date('aaaa-mm-dd')`
  // o `toISOString()` el día se desplazaría en una u otra.
  const ZONAS: { zona: string; desfase: number }[] = [
    { zona: 'America/Los_Angeles', desfase: 420 },
    { zona: 'Pacific/Auckland', desfase: -720 },
    { zona: 'Europe/Madrid', desfase: -120 },
    { zona: 'UTC', desfase: 0 },
  ];

  for (const { zona, desfase } of ZONAS) {
    it(`no desplaza el día en ${zona}`, () => {
      enZonaHoraria(zona, desfase, () => {
        expect(fechaLarga('2026-09-21')).toBe('lunes, 21 de septiembre de 2026');
        expect(fechaLarga('2026-03-29')).toBe('domingo, 29 de marzo de 2026');
        expect(fechaLarga('2026-10-25')).toBe('domingo, 25 de octubre de 2026');
        expect(formatearFechaEs('2026-09-21')).toBe('21/09/2026');
        expect(parsearFechaEs('21/09/2026')).toBe('2026-09-21');
        expect(sumarDias('2026-03-28', 1)).toBe('2026-03-29');
        expect(sumarDias('2026-03-29', 1)).toBe('2026-03-30');
        expect(sumarDias('2026-10-25', -1)).toBe('2026-10-24');
        expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
        expect(diaDeSemana('2026-09-21')).toBe(0);
        expect(nombreMesAnio(2026, 9)).toBe('septiembre de 2026');
        expect(fechaDeHoy(new Date(2026, 8, 21, 23, 59))).toBe('2026-09-21');
        expect(semanasDelMes(2026, 9)[3][0]).toBe('2026-09-21');
        expect(semanasDelMes(2026, 9)[0]).toEqual([
          null,
          '2026-09-01',
          '2026-09-02',
          '2026-09-03',
          '2026-09-04',
          '2026-09-05',
          '2026-09-06',
        ]);
      });
    });
  }
});
