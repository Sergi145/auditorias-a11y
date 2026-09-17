import { Injectable, inject } from '@angular/core';
import { EscaneoAxeService, type ResumenEscaneo, type ViolacionAxe } from './escaneo-axe';

// Margen sobre el maxDuration de la función serverless (60s, ver
// vercel.json) — si la función no ha respondido en este plazo, el cliente
// da el escaneo por fallido en vez de esperar indefinidamente.
const TIMEOUT_CLIENTE_MS = 65000;

export type CodigoErrorEscaneoUrl =
  'url-no-valida' | 'url-bloqueada' | 'web-no-accesible' | 'timeout' | 'servicio-no-disponible';

// Códigos que la función puede devolver y que el cliente traduce 1:1. Cualquier
// otro (metodo-no-permitido, error-interno, o un cuerpo/estado que no sea el
// contrato esperado) cae en 'servicio-no-disponible' — ver
// specs/12-escaneo-url.md.
const CODIGOS_ERROR_FUNCION: ReadonlySet<string> = new Set([
  'url-no-valida',
  'url-bloqueada',
  'web-no-accesible',
  'timeout',
]);

export class ErrorEscaneoUrl extends Error {
  constructor(
    readonly codigo: CodigoErrorEscaneoUrl,
    message: string,
  ) {
    super(message);
  }
}

// Ejecuta axe-core sobre la URL en vivo de una página vía la función
// serverless /api/escanear-url (Playwright + axe-core) y aplica sus
// violaciones al checklist con la misma lógica que el modo "Pegar HTML" —
// ver specs/12-escaneo-url.md. El mapeo a criterios WCAG y la persistencia
// viven en EscaneoAxeService.aplicarViolaciones(), compartido por ambos modos.
@Injectable({ providedIn: 'root' })
export class EscaneoUrlService {
  private readonly escaneoAxeService = inject(EscaneoAxeService);

  async ejecutarSobreUrl(paginaId: number, url: string): Promise<ResumenEscaneo> {
    const violaciones = await this.escanear(url);
    return this.escaneoAxeService.aplicarViolaciones(paginaId, violaciones);
  }

  private async escanear(url: string): Promise<ViolacionAxe[]> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_CLIENTE_MS);

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/escanear-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controlador.signal,
      });
    } catch (error) {
      // El propio abort del cliente (temporizador) y un fallo de red lanzan
      // ambos desde fetch(); solo el primero cuenta como 'timeout'.
      if (controlador.signal.aborted) {
        throw new ErrorEscaneoUrl(
          'timeout',
          'El escaneo de la URL se ha cancelado por tardar demasiado.',
        );
      }
      throw new ErrorEscaneoUrl('servicio-no-disponible', mensajeDeError(error));
    } finally {
      clearTimeout(temporizador);
    }

    if (respuesta.ok) return this.violacionesDesdeRespuesta(respuesta);
    throw await this.errorDesdeRespuesta(respuesta);
  }

  private async violacionesDesdeRespuesta(respuesta: Response): Promise<ViolacionAxe[]> {
    const cuerpo = await this.jsonSeguro(respuesta);
    const violaciones =
      cuerpo && typeof cuerpo === 'object'
        ? (cuerpo as { violaciones?: unknown }).violaciones
        : undefined;
    if (!Array.isArray(violaciones)) {
      throw new ErrorEscaneoUrl(
        'servicio-no-disponible',
        'La respuesta del escaneo no tiene el formato esperado.',
      );
    }
    return violaciones as ViolacionAxe[];
  }

  private async errorDesdeRespuesta(respuesta: Response): Promise<ErrorEscaneoUrl> {
    const cuerpo = await this.jsonSeguro(respuesta);
    const error =
      cuerpo && typeof cuerpo === 'object'
        ? (cuerpo as { error?: { codigo?: unknown; mensaje?: unknown } }).error
        : undefined;
    const codigo = error?.codigo;
    if (typeof codigo === 'string' && CODIGOS_ERROR_FUNCION.has(codigo)) {
      const mensaje = typeof error?.mensaje === 'string' ? error.mensaje : codigo;
      return new ErrorEscaneoUrl(codigo as CodigoErrorEscaneoUrl, mensaje);
    }
    return new ErrorEscaneoUrl(
      'servicio-no-disponible',
      `Respuesta inesperada de /api/escanear-url (estado ${respuesta.status}).`,
    );
  }

  // undefined si el cuerpo no es JSON válido (p. ej. el HTML de fallback de
  // `ng serve` cuando la función no existe en local) en vez de propagar el
  // SyntaxError — el llamante ya trata "sin formato esperado" como
  // 'servicio-no-disponible'.
  private async jsonSeguro(respuesta: Response): Promise<unknown> {
    try {
      return await respuesta.json();
    } catch {
      return undefined;
    }
  }
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Texto del toast para cada código de error — ver specs/12-escaneo-url.md
// "Qué entra". url-no-valida y url-bloqueada comparten mensaje: desde la
// perspectiva de quien audita, ambos significan lo mismo ("esta URL no se
// puede escanear"), la distinción es solo para depurar en el servidor.
export function mensajeErrorEscaneoUrl(codigo: CodigoErrorEscaneoUrl): string {
  switch (codigo) {
    case 'url-no-valida':
    case 'url-bloqueada':
      return 'La URL de esta página no se puede escanear: no es una dirección pública válida.';
    case 'web-no-accesible':
      return 'La web no ha respondido correctamente. Comprueba que la URL es accesible públicamente.';
    case 'timeout':
      return 'La web ha tardado demasiado en cargar. Inténtalo de nuevo o usa «Pegar HTML».';
    case 'servicio-no-disponible':
      return 'El servicio de escaneo de URL no está disponible ahora mismo. Puedes usar «Pegar HTML».';
  }
}
