import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';

// Mockea node:dns/promises antes de importar el módulo bajo test: hostPermitido()
// resuelve DNS de verdad, y en tests no queremos ni podemos depender de red —
// ver specs/12-escaneo-url.md.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

import { esIpBloqueada, hostPermitido, validarFormatoUrl } from './validar-url';

// dns.promises.lookup() está sobrecargado (con `{ all: true }` devuelve un
// array; sin opciones, una sola dirección) — vi.mocked() no conserva esa
// sobrecarga, así que se tipa a mano con la única forma que usa hostPermitido().
const lookupMock = lookup as unknown as Mock<
  (hostname: string, options: { all: true }) => Promise<LookupAddress[]>
>;

beforeEach(() => {
  lookupMock.mockReset();
});

describe('esIpBloqueada', () => {
  it.each([
    ['127.0.0.1', 'loopback IPv4'],
    ['10.0.0.1', 'privada 10.0.0.0/8'],
    ['172.16.0.1', 'privada 172.16.0.0/12'],
    ['192.168.1.1', 'privada 192.168.0.0/16'],
    ['169.254.169.254', 'link-local / IP de metadatos'],
    ['100.64.0.1', 'CGNAT 100.64.0.0/10'],
    ['0.0.0.0', 'no especificada IPv4'],
    ['::1', 'loopback IPv6'],
    ['fe80::1', 'link-local IPv6'],
    ['fc00::1', 'dirección única local IPv6'],
    ['::ffff:127.0.0.1', 'IPv4 mapeada en IPv6'],
  ])('bloquea %s (%s)', (ip) => {
    expect(esIpBloqueada(ip)).toBe(true);
  });

  it.each([
    ['8.8.8.8', 'IPv4 pública'],
    ['2001:4860:4860::8888', 'IPv6 pública'],
  ])('permite %s (%s)', (ip) => {
    expect(esIpBloqueada(ip)).toBe(false);
  });

  it('bloquea por seguridad una cadena que no es una IP reconocible', () => {
    expect(esIpBloqueada('256.1.1.1')).toBe(true);
  });
});

describe('validarFormatoUrl', () => {
  it('acepta una URL http válida y expone el objeto URL parseado', () => {
    const resultado = validarFormatoUrl('http://example.com/pagina');
    expect(resultado.valida).toBe(true);
    expect(resultado.valida && resultado.url.hostname).toBe('example.com');
  });

  it('acepta https', () => {
    expect(validarFormatoUrl('https://example.com/').valida).toBe(true);
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/archivo', 'javascript:alert(1)'])(
    'rechaza el protocolo no permitido de %s',
    (url) => {
      expect(validarFormatoUrl(url).valida).toBe(false);
    },
  );

  it('rechaza una URL con credenciales embebidas', () => {
    expect(validarFormatoUrl('http://usuario:clave@example.com/').valida).toBe(false);
  });

  it('rechaza una URL de más de 2048 caracteres', () => {
    const urlLarga = 'http://example.com/' + 'a'.repeat(2048);
    expect(validarFormatoUrl(urlLarga).valida).toBe(false);
  });

  it('rechaza un valor que no es una URL', () => {
    expect(validarFormatoUrl('no-es-una-url').valida).toBe(false);
  });

  it('rechaza un valor que no es una cadena', () => {
    expect(validarFormatoUrl(undefined).valida).toBe(false);
    expect(validarFormatoUrl(123).valida).toBe(false);
  });
});

describe('hostPermitido', () => {
  it('permite una IP literal pública sin resolver DNS', async () => {
    await expect(hostPermitido('8.8.8.8', new Map())).resolves.toBe(true);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('bloquea una IP literal privada sin resolver DNS', async () => {
    await expect(hostPermitido('127.0.0.1', new Map())).resolves.toBe(false);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('permite un host cuyas direcciones resueltas son todas públicas', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }]);
    await expect(hostPermitido('publica.example.com', new Map())).resolves.toBe(true);
  });

  it('bloquea un host si alguna de sus direcciones resueltas es privada', async () => {
    lookupMock.mockResolvedValueOnce([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    await expect(hostPermitido('mixta.example.com', new Map())).resolves.toBe(false);
  });

  it('bloquea un host que no resuelve', async () => {
    lookupMock.mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(hostPermitido('no-existe.example.com', new Map())).resolves.toBe(false);
  });

  it('cachea el veredicto por host dentro de la misma ejecución', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }]);
    const cache = new Map<string, boolean>();

    await hostPermitido('repetida.example.com', cache);
    await hostPermitido('repetida.example.com', cache);

    expect(lookupMock).toHaveBeenCalledTimes(1);
  });
});
