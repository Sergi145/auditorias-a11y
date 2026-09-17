// Cálculo del área a capturar alrededor del elemento que incumple una
// violación de axe-core — ver specs/18-captura-con-contexto.md. Función
// pura (sin Playwright) para poder testearla: quien habla con el navegador
// es escanear-url.ts, igual que en api/_lib/captura-evidencia.ts.

export interface Rectangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OpcionesRecorte {
  // Aire alrededor del elemento, para que se vea dónde está dentro de la página.
  margen: number;
  // Suelo del recorte: un elemento diminuto (un enlace de 77×13 px) da una
  // miniatura ilegible si se recorta pegado a él — ver specs/18.
  minimoAncho: number;
  minimoAlto: number;
}

export const RECORTE_POR_DEFECTO: OpcionesRecorte = {
  margen: 48,
  minimoAncho: 480,
  minimoAlto: 320,
};

// Devuelve el recorte (en coordenadas del viewport, las mismas que usa
// page.screenshot({ clip })) centrado en el elemento: su caja más `margen`
// por cada lado, nunca menor que el mínimo ni mayor que el viewport, y
// siempre dentro de él. `null` si el elemento no tiene superficie que
// capturar.
export function recorteConContexto(
  elemento: Rectangulo,
  viewport: { width: number; height: number },
  opciones: OpcionesRecorte = RECORTE_POR_DEFECTO,
): Rectangulo | null {
  if (elemento.width <= 0 || elemento.height <= 0) return null;

  const width = dimension(elemento.width, opciones.margen, opciones.minimoAncho, viewport.width);
  const height = dimension(elemento.height, opciones.margen, opciones.minimoAlto, viewport.height);

  return {
    x: origen(elemento.x, elemento.width, width, viewport.width),
    y: origen(elemento.y, elemento.height, height, viewport.height),
    width,
    height,
  };
}

function dimension(
  tamanoElemento: number,
  margen: number,
  minimo: number,
  tamanoViewport: number,
): number {
  return Math.round(Math.min(Math.max(tamanoElemento + margen * 2, minimo), tamanoViewport));
}

// Centra el recorte en el elemento y lo empuja dentro del viewport si se
// sale por algún borde (elemento pegado al borde de la página, o a medio
// entrar tras el scroll).
function origen(
  posicionElemento: number,
  tamanoElemento: number,
  tamanoRecorte: number,
  tamanoViewport: number,
): number {
  const centrado = posicionElemento + tamanoElemento / 2 - tamanoRecorte / 2;
  return Math.round(Math.min(Math.max(centrado, 0), tamanoViewport - tamanoRecorte));
}
