// Funciones puras para la captura de evidencia del escaneo de URL en vivo —
// ver specs/13-captura-evidencia-escaneo.md. Sin Playwright: la parte que
// habla con el navegador vive en escanear-url.ts, que sí se verifica a mano
// en el despliegue (mismo patrón que api/_lib/validar-url.ts).

// El `target` de un axe.NodeResult puede ser un selector simple (`string[]`
// de un elemento, caso normal), un selector fragmentado por shadow DOM
// (`string[]` de más de un elemento) o, si el nodo está en un iframe, un
// array donde algún elemento es a su vez un array. Solo el caso simple tiene
// un selector CSS de nivel superior que Playwright puede resolver
// directamente con page.locator() — los demás se descartan (ver specs/13-
// captura-evidencia-escaneo.md "Qué NO entra todavía").
export function selectorSimple(target: unknown): string | null {
  if (!Array.isArray(target) || target.length !== 1) return null;
  const [selector] = target;
  return typeof selector === 'string' && selector.length > 0 ? selector : null;
}

// Acumula el tamaño (en base64) de las capturas ya admitidas en una misma
// ejecución de escanear-url.ts y decide si una nueva todavía cabe dentro del
// presupuesto, para no superar el límite de respuesta de Vercel — ver specs/
// 13-captura-evidencia-escaneo.md "Decisiones tomadas y descartadas".
export class PresupuestoCapturas {
  private usado = 0;

  constructor(private readonly maximoBytes: number) {}

  admitir(longitudBase64: number): boolean {
    if (this.usado + longitudBase64 > this.maximoBytes) return false;
    this.usado += longitudBase64;
    return true;
  }
}
