import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EscaneoAxeService } from './escaneo-axe';
import {
  ErrorEscaneoUrl,
  EscaneoUrlService,
  mensajeErrorEscaneoUrl,
  type CodigoErrorEscaneoUrl,
} from './escaneo-url';

const PAGINA_ID = 1;
const URL_PAGINA = 'https://example.com/';

function respuestaJson(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('EscaneoUrlService', () => {
  let service: EscaneoUrlService;
  let aplicarViolaciones: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    aplicarViolaciones = vi.fn().mockResolvedValue({ criteriosMarcados: 2 });
    TestBed.configureTestingModule({
      providers: [{ provide: EscaneoAxeService, useValue: { aplicarViolaciones } }],
    });
    service = TestBed.inject(EscaneoUrlService);

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('aplica las violaciones recibidas cuando la función responde 200', async () => {
    const violaciones = [{ tags: ['wcag111'], impact: 'critical', help: 'Falta alt' }];
    fetchMock.mockResolvedValue(respuestaJson(200, { violaciones }));

    const resumen = await service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA);

    expect(aplicarViolaciones).toHaveBeenCalledWith(PAGINA_ID, violaciones);
    expect(resumen).toEqual({ criteriosMarcados: 2 });
  });

  it.each<CodigoErrorEscaneoUrl>(['url-no-valida', 'url-bloqueada', 'web-no-accesible', 'timeout'])(
    'traduce el código de error %s que devuelve la función',
    async (codigo) => {
      fetchMock.mockResolvedValue(
        respuestaJson(400, { error: { codigo, mensaje: 'motivo técnico' } }),
      );

      await expect(service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA)).rejects.toMatchObject({
        codigo,
      });
      expect(aplicarViolaciones).not.toHaveBeenCalled();
    },
  );

  it('trata un fetch rechazado (sin red) como servicio no disponible', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA)).rejects.toMatchObject({
      codigo: 'servicio-no-disponible',
    });
  });

  it('trata una respuesta 200 con HTML (ng serve sin función) como servicio no disponible', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    );

    await expect(service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA)).rejects.toMatchObject({
      codigo: 'servicio-no-disponible',
    });
  });

  it('trata un 500 con un código que el cliente no reconoce como servicio no disponible', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson(500, { error: { codigo: 'error-interno', mensaje: 'boom' } }),
    );

    await expect(service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA)).rejects.toMatchObject({
      codigo: 'servicio-no-disponible',
    });
  });

  it('trata un 405 sin cuerpo JSON como servicio no disponible', async () => {
    fetchMock.mockResolvedValue(new Response('Method Not Allowed', { status: 405 }));

    await expect(service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA)).rejects.toMatchObject({
      codigo: 'servicio-no-disponible',
    });
  });

  it('trata el abort del propio temporizador del cliente como timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, opciones: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opciones.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const promesa = service.ejecutarSobreUrl(PAGINA_ID, URL_PAGINA);
    const expectativa = expect(promesa).rejects.toMatchObject({ codigo: 'timeout' });
    await vi.advanceTimersByTimeAsync(65000);
    await expectativa;
  });
});

describe('mensajeErrorEscaneoUrl', () => {
  it.each<CodigoErrorEscaneoUrl>([
    'url-no-valida',
    'url-bloqueada',
    'web-no-accesible',
    'timeout',
    'servicio-no-disponible',
  ])('devuelve un texto no vacío para %s', (codigo) => {
    expect(mensajeErrorEscaneoUrl(codigo)).toBeTruthy();
  });

  it('usa el mismo mensaje para url-no-valida y url-bloqueada, distinto del resto', () => {
    expect(mensajeErrorEscaneoUrl('url-no-valida')).toBe(mensajeErrorEscaneoUrl('url-bloqueada'));
    expect(mensajeErrorEscaneoUrl('web-no-accesible')).not.toBe(mensajeErrorEscaneoUrl('timeout'));
    expect(mensajeErrorEscaneoUrl('timeout')).not.toBe(
      mensajeErrorEscaneoUrl('servicio-no-disponible'),
    );
  });
});

describe('ErrorEscaneoUrl', () => {
  it('expone el código junto con el mensaje', () => {
    const error = new ErrorEscaneoUrl('timeout', 'demasiado lento');
    expect(error.codigo).toBe('timeout');
    expect(error.message).toBe('demasiado lento');
  });
});
