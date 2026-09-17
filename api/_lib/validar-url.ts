import net from 'node:net';
import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';

// Validación de formato + anti-SSRF para /api/escanear-url — ver
// specs/12-escaneo-url.md. El prefijo `_` en `_lib` evita que Vercel exponga
// este directorio como sus propios endpoints.

const PROTOCOLOS_PERMITIDOS = new Set(['http:', 'https:']);
const LONGITUD_MAXIMA_URL = 2048;

export type ResultadoValidacionFormato = { valida: true; url: URL } | { valida: false };

// Solo comprueba forma: protocolo http(s), longitud razonable y sin
// credenciales embebidas (user:pass@host) — no resuelve DNS ni decide si el
// host es alcanzable, eso lo hace hostPermitido().
export function validarFormatoUrl(valor: unknown): ResultadoValidacionFormato {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > LONGITUD_MAXIMA_URL) {
    return { valida: false };
  }

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return { valida: false };
  }

  if (!PROTOCOLOS_PERMITIDOS.has(url.protocol)) return { valida: false };
  if (url.username !== '' || url.password !== '') return { valida: false };

  return { valida: true, url };
}

// Resuelve TODAS las direcciones del host (no solo la primera) y lo permite
// solo si ninguna es una IP bloqueada — una web pública puede resolver a
// varias IPs, y basta con que una apunte a una red interna para descartar el
// host entero. Si el host ya es una IP literal, no hace falta resolverlo.
// `cache` vive por ejecución (una petición de escaneo): evita repetir la
// misma resolución DNS para el mismo host en cada redirección/subrecurso.
export async function hostPermitido(host: string, cache: Map<string, boolean>): Promise<boolean> {
  const limpio = quitarCorchetes(host);

  const enCache = cache.get(limpio);
  if (enCache !== undefined) return enCache;

  const permitido = await calcularHostPermitido(limpio);
  cache.set(limpio, permitido);
  return permitido;
}

async function calcularHostPermitido(host: string): Promise<boolean> {
  if (net.isIP(host)) return !esIpBloqueada(host);

  let direcciones: LookupAddress[];
  try {
    direcciones = await lookup(host, { all: true });
  } catch {
    return false; // host que no resuelve: no se puede confirmar que sea seguro
  }

  if (direcciones.length === 0) return false;
  return direcciones.every((direccion) => !esIpBloqueada(direccion.address));
}

function quitarCorchetes(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

// true para loopback, redes privadas, link-local (incluida la IP de
// metadatos 169.254.169.254), CGNAT, multicast, reservadas y "no
// especificada", en IPv4 e IPv6 (incluidas las IPv4 mapeadas en IPv6, ej.
// ::ffff:127.0.0.1) — ver specs/12-escaneo-url.md "Qué entra".
export function esIpBloqueada(ip: string): boolean {
  const limpia = quitarCorchetes(ip);
  const version = net.isIP(limpia);
  if (version === 4) return esIpv4Bloqueada(limpia);
  if (version === 6) return esIpv6Bloqueada(limpia);
  return true; // no es una IP reconocible: se bloquea por seguridad
}

function ipv4ABytes(ip: string): number[] | null {
  const partes = ip.split('.');
  if (partes.length !== 4) return null;
  const bytes = partes.map(Number);
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return null;
  return bytes;
}

function ipv4BytesBloqueados(bytes: number[]): boolean {
  const [a, b] = bytes;
  if (a === 0) return true; // 0.0.0.0/8, "no especificada"
  if (a === 10) return true; // 10.0.0.0/8, privada
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10, CGNAT
  if (a === 127) return true; // 127.0.0.0/8, loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16, link-local (incluye la IP de metadatos)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12, privada
  if (a === 192 && b === 168) return true; // 192.168.0.0/16, privada
  if (a >= 224) return true; // 224.0.0.0/4 y superiores: multicast y reservada
  return false;
}

function esIpv4Bloqueada(ip: string): boolean {
  const bytes = ipv4ABytes(ip);
  return bytes ? ipv4BytesBloqueados(bytes) : true; // formato irreconocible: bloquear por seguridad
}

// Expande una dirección IPv6 (con posible "::" y/o IPv4 embebida al final,
// ej. "::ffff:127.0.0.1") a sus 8 grupos de 16 bits, para poder comparar
// rangos por aritmética simple en vez de por texto.
function ipv6AGrupos(ip: string): number[] | null {
  const partes = ip.split('::');
  if (partes.length > 2) return null; // "::" no puede aparecer más de una vez

  const izquierda = gruposDeLado(partes[0]);
  const derecha = partes.length === 2 ? gruposDeLado(partes[1]) : [];
  if (izquierda === null || derecha === null) return null;

  const totalSinComprimir = izquierda.length + derecha.length;
  if (partes.length === 1) {
    if (totalSinComprimir !== 8) return null;
  } else if (totalSinComprimir >= 8) {
    return null; // "::" tiene que comprimir al menos un grupo
  }

  const relleno = partes.length === 2 ? new Array(8 - totalSinComprimir).fill('0') : [];
  const todos = [...izquierda, ...relleno, ...derecha];
  if (todos.length !== 8) return null;

  const numeros = todos.map((grupo) => (grupo === '' ? NaN : parseInt(grupo, 16)));
  if (numeros.some((numero) => Number.isNaN(numero) || numero < 0 || numero > 0xffff)) return null;
  return numeros;
}

function gruposDeLado(lado: string): string[] | null {
  if (lado === '') return [];
  const grupos = lado.split(':');
  const ultimo = grupos[grupos.length - 1];
  if (!ultimo.includes('.')) return grupos;

  const hex = ipv4AGruposHex(ultimo);
  if (!hex) return null;
  grupos.splice(grupos.length - 1, 1, ...hex);
  return grupos;
}

function ipv4AGruposHex(ipv4: string): [string, string] | null {
  const bytes = ipv4ABytes(ipv4);
  if (!bytes) return null;
  const alto = ((bytes[0] << 8) | bytes[1]).toString(16);
  const bajo = ((bytes[2] << 8) | bytes[3]).toString(16);
  return [alto, bajo];
}

function esIpv6Bloqueada(ip: string): boolean {
  const grupos = ipv6AGrupos(ip);
  if (!grupos) return true; // formato irreconocible: bloquear por seguridad

  // IPv4 mapeada en IPv6 (::ffff:a.b.c.d): se evalúa como esa IPv4.
  if (grupos.slice(0, 5).every((grupo) => grupo === 0) && grupos[5] === 0xffff) {
    const a = grupos[6] >> 8;
    const b = grupos[6] & 0xff;
    const c = grupos[7] >> 8;
    const d = grupos[7] & 0xff;
    return ipv4BytesBloqueados([a, b, c, d]);
  }

  if (grupos.every((grupo) => grupo === 0)) return true; // :: — no especificada
  if (grupos.slice(0, 7).every((grupo) => grupo === 0) && grupos[7] === 1) return true; // ::1 — loopback
  if ((grupos[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 — direcciones únicas locales
  if ((grupos[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 — link-local

  return false;
}
