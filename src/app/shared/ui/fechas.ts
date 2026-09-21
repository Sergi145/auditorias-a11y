// Utilidades de fecha del selector de fecha — ver specs/25-selector-fecha.md.
// Trabajan con fechas de calendario (año, mes, día) y con cadenas ISO
// `aaaa-mm-dd`, nunca con un `Date` en hora local convertido a UTC ni con
// `new Date('aaaa-mm-dd')` (que es medianoche UTC): así el día no se
// desplaza según la zona horaria. Los meses van de 1 a 12.

interface FechaCalendario {
  anio: number;
  mes: number;
  dia: number;
}

const DIAS_EN_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// `timeZone: 'UTC'` porque los `Date` de este módulo se construyen en UTC.
const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const FORMATO_MES_ANIO = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

function diasEnMes(anio: number, mes: number): number {
  return mes === 2 && esBisiesto(anio) ? 29 : DIAS_EN_MES[mes - 1];
}

// null si no es una fecha real del calendario (31/02, mes 13, año 0000…).
function crearFecha(anio: number, mes: number, dia: number): FechaCalendario | null {
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1 || dia > diasEnMes(anio, mes)) {
    return null;
  }
  return { anio, mes, dia };
}

function rellenar(numero: number, longitud: number): string {
  return String(numero).padStart(longitud, '0');
}

function aIso({ anio, mes, dia }: FechaCalendario): string {
  return `${rellenar(anio, 4)}-${rellenar(mes, 2)}-${rellenar(dia, 2)}`;
}

function desdeIso(iso: string): FechaCalendario | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!coincidencia) {
    return null;
  }
  const [, anio, mes, dia] = coincidencia;
  return crearFecha(Number(anio), Number(mes), Number(dia));
}

// setUTCFullYear y no Date.UTC: este último trata los años 0–99 como 1900–1999.
function aDateUtc({ anio, mes, dia }: FechaCalendario): Date {
  const fecha = new Date(0);
  fecha.setUTCFullYear(anio, mes - 1, dia);
  return fecha;
}

function desdeDateUtc(fecha: Date): FechaCalendario {
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1, dia: fecha.getUTCDate() };
}

// 0 = lunes … 6 = domingo (getUTCDay() empieza en domingo).
function indiceDiaSemana(fecha: FechaCalendario): number {
  return (aDateUtc(fecha).getUTCDay() + 6) % 7;
}

// Para las funciones que operan sobre una fecha que ya debería ser válida: un
// ISO no válido es un error de quien llama, no algo que mostrar como vacío.
function requerirFecha(iso: string): FechaCalendario {
  const fecha = desdeIso(iso);
  if (!fecha) {
    throw new RangeError(`Fecha ISO no válida: "${iso}"`);
  }
  return fecha;
}

// `d/m/aaaa` o `dd/mm/aaaa` (año de 4 dígitos, espacios alrededor ignorados)
// → fecha ISO `aaaa-mm-dd`, o null si no es una fecha real.
export function parsearFechaEs(texto: string): string | null {
  const coincidencia = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!coincidencia) {
    return null;
  }
  const [, dia, mes, anio] = coincidencia;
  const fecha = crearFecha(Number(anio), Number(mes), Number(dia));
  return fecha ? aIso(fecha) : null;
}

// `2026-09-21` → `21/09/2026`. Cadena vacía si `iso` no es una fecha ISO real.
export function formatearFechaEs(iso: string): string {
  const fecha = desdeIso(iso);
  return fecha ? `${rellenar(fecha.dia, 2)}/${rellenar(fecha.mes, 2)}/${rellenar(fecha.anio, 4)}` : '';
}

// `2026-09-21` → `lunes, 21 de septiembre de 2026`. Cadena vacía si `iso` no
// es una fecha ISO real.
export function fechaLarga(iso: string): string {
  const fecha = desdeIso(iso);
  return fecha ? FORMATO_FECHA_LARGA.format(aDateUtc(fecha)) : '';
}

// Filas de 7 celdas, de lunes a domingo. Cada celda es la fecha ISO del día o
// null si pertenece a otro mes. `mes` va de 1 a 12.
export function semanasDelMes(anio: number, mes: number): (string | null)[][] {
  const huecosIniciales = indiceDiaSemana({ anio, mes, dia: 1 });
  const celdas: (string | null)[] = [
    ...Array.from({ length: huecosIniciales }, () => null),
    ...Array.from({ length: diasEnMes(anio, mes) }, (_, i) => aIso({ anio, mes, dia: i + 1 })),
  ];
  while (celdas.length % 7 !== 0) {
    celdas.push(null);
  }

  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return semanas;
}

// Lo que necesita el teclado y el título del calendario — ver
// specs/25-selector-fecha.md, paso 3.

export function esFechaIso(iso: string): boolean {
  return desdeIso(iso) !== null;
}

// Hoy en hora local, que es la fecha que ve el usuario. `ahora` solo se
// parametriza para poder probarla.
export function fechaDeHoy(ahora: Date = new Date()): string {
  return aIso({ anio: ahora.getFullYear(), mes: ahora.getMonth() + 1, dia: ahora.getDate() });
}

// 0 = lunes … 6 = domingo. RangeError si `iso` no es una fecha ISO real.
export function diaDeSemana(iso: string): number {
  return indiceDiaSemana(requerirFecha(iso));
}

// RangeError si `iso` no es una fecha ISO real.
export function sumarDias(iso: string, dias: number): string {
  const fecha = aDateUtc(requerirFecha(iso));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aIso(desdeDateUtc(fecha));
}

// Conserva el día del mes; si el mes de destino no lo tiene (31 de enero + 1
// mes), cae en su último día. RangeError si `iso` no es una fecha ISO real.
export function sumarMeses(iso: string, meses: number): string {
  const { anio, mes, dia } = requerirFecha(iso);
  const total = anio * 12 + (mes - 1) + meses;
  const anioDestino = Math.floor(total / 12);
  const mesDestino = total - anioDestino * 12 + 1;
  return aIso({
    anio: anioDestino,
    mes: mesDestino,
    dia: Math.min(dia, diasEnMes(anioDestino, mesDestino)),
  });
}

// Igual que sumarMeses: 29/02/2028 + 1 año = 28/02/2029.
export function sumarAnios(iso: string, anios: number): string {
  return sumarMeses(iso, anios * 12);
}

// `septiembre de 2026`. `mes` va de 1 a 12.
export function nombreMesAnio(anio: number, mes: number): string {
  return FORMATO_MES_ANIO.format(aDateUtc({ anio, mes, dia: 1 }));
}
