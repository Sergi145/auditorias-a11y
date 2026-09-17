# 12 — Escaneo automático de URL en vivo (función serverless en Vercel)

**Estado:** Approved
**Depende de:** Spec 05 (Auditorías y páginas — `Pagina.url` real, validada como `http(s)://`), Spec 11 (Escaneo axe — `EscaneoAxeService`, `agruparViolacionesPorCriterio`, persistencia automática de `Resultado`/`Hallazgo` y pestaña "URL en vivo" ya maquetada)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Habilitar la pestaña "URL en vivo" de `pagina-escaneo` para que una función
serverless en Vercel (Playwright + axe-core) escanee la `url` de la página y
el cliente aplique sus violaciones al checklist exactamente igual que el modo
"Pegar HTML" de `specs/11-escaneo-axe.md`.

## Qué entra

- **Dependencias nuevas**: `playwright-core` (misma versión que el
  `@playwright/test` ya instalado) y `@sparticuz/chromium` (Chromium
  comprimido para el entorno Lambda de Vercel).
- **`src/app/core/axe-tags.ts`**: se extrae ahí la constante
  `TAGS_WCAG_2_2_A_AA` (hoy privada en `escaneo-axe.ts`), en un archivo sin
  imports, para que cliente y función ejecuten axe-core con las mismas reglas.
- **`EscaneoAxeService.aplicarViolaciones(paginaId, violaciones)`** pasa de
  privado a público, sin cambiar su comportamiento: es el punto de entrada
  común de ambos modos.
- **`api/_lib/validar-url.ts`** (funciones puras más una que resuelve DNS; el
  prefijo `_` evita que Vercel la exponga como endpoint):
  - `esIpBloqueada(ip: string): boolean` — `true` para loopback, redes
    privadas, link-local (incluida la IP de metadatos `169.254.169.254`),
    CGNAT, multicast, reservadas y "no especificadas", en IPv4 e IPv6
    (incluidas IPv4 mapeadas en IPv6). Rangos: `0.0.0.0/8`, `10.0.0.0/8`,
    `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`,
    `192.168.0.0/16`, `224.0.0.0/4` y superiores, `::`, `::1`, `fc00::/7`,
    `fe80::/10`, `::ffff:<IPv4 bloqueada>`.
  - `validarFormatoUrl(url: unknown)` — solo `http:`/`https:`, longitud
    máxima 2048 caracteres, sin credenciales en la URL (`user:pass@`).
  - `hostPermitido(host: string, cache: Map<string, boolean>): Promise<boolean>`
    — resuelve **todas** las direcciones del host (`dns.lookup` con
    `all: true`) y lo bloquea si cualquiera de ellas está bloqueada. Si el
    host ya es una IP literal, no se resuelve. Cachea el veredicto por host
    durante una misma ejecución.
- **`api/_lib/navegador.ts`**: `lanzarNavegador()` — si
  `process.env.VERCEL` está definido, lanza Chromium de `playwright-core` con
  `executablePath`/`args` de `@sparticuz/chromium`; si no (local con
  `vercel dev`), lanza el Chromium que ya instala Playwright para los e2e.
- **`api/escanear-url.ts`** (firma Web estándar de Vercel,
  `export async function POST(request: Request): Promise<Response>`):
  1. Lee `{ url }` del cuerpo JSON (cuerpo máximo 4 KB). Valida con
     `validarFormatoUrl` → `400 url-no-valida`. Comprueba el host inicial con
     `hostPermitido` → `400 url-bloqueada`.
  2. Lanza el navegador con un contexto de viewport 1280×800 y
     `serviceWorkers: 'block'`.
  3. `page.route('**/*', ...)`: para **cada** petición del navegador
     (navegación principal, redirecciones, iframes y subrecursos) comprueba
     el protocolo (`http`/`https`/`data`/`blob`) y `hostPermitido`; si no pasa,
     `route.abort('blockedbyclient')`. Si la petición abortada era la
     navegación del documento principal, marca la ejecución como bloqueada.
  4. `page.goto(url, { waitUntil: 'load', timeout: 20000 })` y después
     `page.waitForTimeout(1500)` para dar margen al renderizado de las SPA.
     Timeout de navegación → `504 timeout`. Navegación principal bloqueada
     (p. ej. una redirección a una IP privada) → `400 url-bloqueada`. Otro
     error de red o una respuesta del documento principal `>= 400` →
     `502 web-no-accesible`.
  5. Inyecta axe-core (`page.addScriptTag({ content: axe.source })`) y
     ejecuta `axe.run(document, { runOnly: { type: 'tag', values:
     TAGS_WCAG_2_2_A_AA } })` dentro de la página (`page.evaluate`).
  6. Responde `200 { violaciones }` con cada violación recortada a `tags`,
     `impact` y `help`, cerrando siempre el navegador (`finally`). Cualquier
     otro error → `500 error-interno`. Cualquier método distinto de `POST` →
     `405 metodo-no-permitido`.
- **`vercel.json`**: `buildCommand: "npm run build"`,
  `outputDirectory: "dist/auditorias-a11y/browser"`, `maxDuration: 60` para
  `api/escanear-url.ts` y un rewrite de SPA (`/((?!api/).*)` → `/index.html`)
  para que las rutas profundas de Angular funcionen al recargar.
- **`api/tsconfig.json`** (tipos de Node, `module`/`moduleResolution` para
  Node). **`vitest.api.config.ts`** con el nuevo script `npm run test:api`
  para los tests de `api/` (los de `src/` siguen con `npm test`).
  **`eslint.config.js`** incluye `api/**/*.ts`. `.gitignore` añade `.vercel`.
- **`src/app/core/escaneo-url.ts`** (`EscaneoUrlService`):
  `ejecutarSobreUrl(paginaId, url): Promise<ResumenEscaneo>`:
  - `fetch('/api/escanear-url', { method: 'POST', ... })` con
    `AbortController` a los 65 s (60 s de `maxDuration` más margen).
  - `200` con `violaciones` válidas → `EscaneoAxeService.aplicarViolaciones`.
  - Error → lanza `ErrorEscaneoUrl` con un `codigo: CodigoErrorEscaneoUrl`:
    `url-no-valida`/`url-bloqueada`/`web-no-accesible`/`timeout` si la
    función respondió con ese código. `timeout` también si salta el abort del
    cliente. Todo lo demás (sin red, `404`/HTML de `ng serve` sin función,
    `405`, `500`, JSON inesperado) → `servicio-no-disponible`.
  - `mensajeErrorEscaneoUrl(codigo): string` (función pura) con los textos
    del toast:
    - `url-no-valida` / `url-bloqueada`: "La URL de esta página no se puede
      escanear: no es una dirección pública válida."
    - `web-no-accesible`: "La web no ha respondido correctamente. Comprueba
      que la URL es accesible públicamente."
    - `timeout`: "La web ha tardado demasiado en cargar. Inténtalo de nuevo o
      usa «Pegar HTML»."
    - `servicio-no-disponible`: "El servicio de escaneo de URL no está
      disponible ahora mismo. Puedes usar «Pegar HTML»."
- **`pagina-escaneo.ts`/`.html`**:
  - La pestaña "URL en vivo" deja de estar deshabilitada.
  - El panel muestra `pagina.url` en un campo de **solo lectura** (`readonly`,
    no `disabled`: sigue siendo enfocable y legible por lector de pantalla),
    con una nota: la URL se toma de la página y se cambia editando la página;
    el escaneo puede tardar hasta un minuto.
  - Botón "Ejecutar escaneo" con el mismo patrón que "Pegar HTML": pasa a
    "Escaneando…" con `aria-disabled` mientras corre. Al terminar bien,
    muestra el mismo toast de resumen y vuelve al checklist de la página. Si
    falla, muestra el toast de `mensajeErrorEscaneoUrl` y se queda en la
    pantalla.
  - La señal `escaneando` es común a las dos pestañas: mientras corre un
    escaneo no se puede lanzar otro desde ninguna de ellas.
  - Se eliminan el `formularioUrl.disable()` y la nota "llega en una rebanada
    futura", y se actualizan los comentarios de `pagina-escaneo.ts` y
    `escaneo-axe.ts` que dicen que el modo URL queda fuera.
- **Despliegue real en Vercel**: la persona usuaria crea o enlaza el proyecto
  (`vercel link` o panel de Vercel) y la rebanada se verifica sobre un
  despliegue real (preview o producción).
- **Documentación**:
  - `specs/README.md`: fila 12 → `12-escaneo-url.md`, "Implemented" al
    terminar. Nueva fila 13 → `13-captura-evidencia-escaneo.md` "Pendiente".
    Fila 14 → `14-panel-progreso.md` "Pendiente".
  - Las referencias a `11-panel-progreso` (specs 06, 07, 08 y 09) y a
    `12-panel-progreso` (spec 11) pasan a `14-panel-progreso`.
  - `00-producto.md` §7 y `CLAUDE.md`: hosting "Vercel o Netlify" → "Vercel".

## Qué NO entra todavía

- **Captura de pantalla como `Evidencia`** del hallazgo automático: requiere
  el esquema v3 de Dexie (la tabla `evidencias` sigue indexada por
  `resultado_id` desde v1, pero el modelo usa `hallazgo_id`), un
  `EvidenciasService`, mostrarla en `criterio-revision` y vigilar el límite
  de 4,5 MB de respuesta de Vercel. Va en `13-captura-evidencia-escaneo`.
- **Escanear una URL distinta de `pagina.url`** (p. ej. staging) desde la
  pantalla de escaneo: la URL es fija. Para cambiarla hay que editar la
  página.
- **Escaneo en lote** de todas las páginas de una auditoría.
- **Páginas tras login**: pasar cookies, cabeceras o credenciales a la
  función.
- **Autenticación del endpoint y límite de peticiones por IP**: el endpoint
  es público. El rate limit exige un almacén externo (Upstash/KV) en
  serverless.
- **Interacción previa al escaneo**: aceptar banners de cookies, hacer
  scroll, esperar a selectores concretos o escanear varios viewports.
- **Marcar criterios como "Pasa (automático)"**: mismo motivo que en
  `specs/11-escaneo-axe.md`.
- **Panel de progreso**: sigue pendiente, ahora como `14-panel-progreso`.

## Modelo de datos que toca

No introduce entidades nuevas ni cambia Dexie. Reutiliza `Resultado` y
`Hallazgo` (con `origen: 'automatico'`) tal como los persiste
`specs/11-escaneo-axe.md`. Solo añade el contrato HTTP entre cliente y
función, que no se persiste:

```ts
// POST /api/escanear-url
interface PeticionEscaneoUrl {
  url: string;
}

// 200
interface RespuestaEscaneoUrl {
  violaciones: ViolacionAxe[]; // Pick<axe.Result, 'tags' | 'impact' | 'help'>
}

// 400 | 405 | 500 | 502 | 504
interface RespuestaErrorEscaneoUrl {
  error: {
    codigo:
      | 'url-no-valida'
      | 'url-bloqueada'
      | 'web-no-accesible'
      | 'timeout'
      | 'metodo-no-permitido'
      | 'error-interno';
    mensaje: string; // texto técnico, solo para depurar
  };
}

// Cliente (src/app/core/escaneo-url.ts)
type CodigoErrorEscaneoUrl =
  | 'url-no-valida'
  | 'url-bloqueada'
  | 'web-no-accesible'
  | 'timeout'
  | 'servicio-no-disponible';
```

## Plan de implementación

1. **Refactor sin cambio de comportamiento**: extraer `TAGS_WCAG_2_2_A_AA` a
   `src/app/core/axe-tags.ts` y hacer público
   `EscaneoAxeService.aplicarViolaciones`. `npm test` sigue pasando y "Pegar
   HTML" funciona igual.
2. **Infraestructura de `api/`**: `npm install playwright-core
   @sparticuz/chromium`, `api/tsconfig.json`, `vitest.api.config.ts` + script
   `test:api`, `api/**/*.ts` en `eslint.config.js`, `.vercel` en
   `.gitignore`. `npm run lint` sigue pasando.
3. **`api/_lib/validar-url.ts`** con tests (`api/_lib/validar-url.spec.ts`):
   cada rango bloqueado de IPv4/IPv6 (incluidos `169.254.169.254` y
   `::ffff:127.0.0.1`), IPs públicas permitidas, protocolos no permitidos
   (`file:`, `ftp:`, `javascript:`), URL con credenciales, URL de más de 2048
   caracteres y host que resuelve a alguna IP privada (con `dns.lookup`
   mockeado).
4. **`api/_lib/navegador.ts`** y **`api/escanear-url.ts`** completos (filtro
   de peticiones, navegación, axe-core, contrato de respuesta). Con **`vercel.json`**
   en su sitio, prueba manual con `vercel dev` y `curl`: una URL pública
   devuelve `200` con violaciones, `http://169.254.169.254/` devuelve
   `400 url-bloqueada` y un `GET` devuelve `405`.
5. **`src/app/core/escaneo-url.ts`** (`EscaneoUrlService`,
   `ErrorEscaneoUrl`, `mensajeErrorEscaneoUrl`) con tests usando `fetch`
   mockeado: `200` → `aplicarViolaciones` con las violaciones recibidas.
   Cada código de error de la función → su `CodigoErrorEscaneoUrl`. `fetch`
   rechazado, `404` HTML y `500` → `servicio-no-disponible`. Abort del
   cliente → `timeout`.
6. **`pagina-escaneo.ts`/`.html`**: habilitar la pestaña, campo de solo
   lectura, nota, botón con estado "Escaneando…" compartido y toasts. Al
   terminar este paso, el escaneo de URL funciona de extremo a extremo con
   `vercel dev`.
7. **`e2e/escaneo-url.spec.ts`**: crea una auditoría y una página desde la
   UI. Intercepta `/api/escanear-url` con `page.route` y cubre tres casos:
   (a) respuesta `200` con una violación con tag `wcag111` → toast de
   resumen, vuelta al checklist y `1.1.1` en "Falla" con distintivo
   "Automático"; (b) `400 url-bloqueada` → toast con su mensaje, sigue en la
   pantalla de escaneo; (c) `route.abort()` → toast de servicio no
   disponible.
8. **Despliegue**: enlazar el proyecto en Vercel, desplegar un preview y
   verificar a mano los criterios marcados "en el despliegue" más abajo.
9. **Documentación**: `specs/README.md` (filas 12, 13 y 14), referencias a
   `14-panel-progreso` en las specs 06, 07, 08, 09 y 11, y hosting "Vercel"
   en `00-producto.md` §7 y `CLAUDE.md`.
10. **Verificación de accesibilidad**: pestaña "URL en vivo", campo de solo
    lectura, estado "Escaneando…" y toasts de error revisados con teclado y
    lector de pantalla. Escaneo de axe (extensión de navegador) sobre
    `/auditorias/:id/paginas/:id/escaneo` con la pestaña "URL en vivo"
    seleccionada.

## Criterios de aceptación

- La pestaña "URL en vivo" está habilitada, muestra `pagina.url` en un campo
  de solo lectura enfocable y no permite editarla.
- **En el despliegue de Vercel**, escanear una página cuya `url` es una web
  pública con violaciones conocidas (p. ej. imágenes sin `alt`) marca los
  criterios mapeados como "Falla" con `origen: 'automatico'` y un `Hallazgo`
  automático cada uno. También muestra el toast de resumen y vuelve al
  checklist.
- **En el despliegue de Vercel**, `curl -X POST` a `/api/escanear-url` con
  `{"url":"http://169.254.169.254/"}` devuelve `400` con `codigo:
  "url-bloqueada"`, y con `{"url":"file:///etc/passwd"}` devuelve `400` con
  `codigo: "url-no-valida"`.
- **En el despliegue de Vercel**, recargar el navegador sobre una ruta
  profunda (p. ej. `/auditorias/1/paginas/1/escaneo`) carga la app en vez de
  un 404.
- Mientras corre un escaneo de URL, "Ejecutar escaneo" muestra "Escaneando…"
  con `aria-disabled="true"` y no se puede lanzar otro escaneo desde ninguna
  de las dos pestañas.
- Con `npm start` (sin función disponible), ejecutar el escaneo de URL
  muestra el toast "El servicio de escaneo de URL no está disponible ahora
  mismo. Puedes usar «Pegar HTML»." y no modifica ningún `Resultado`.
- Una página cuya `url` es `http://localhost:4200` muestra con `vercel dev`
  el toast de URL no escaneable y no modifica ningún `Resultado`.
- El comportamiento de la spec 11 se mantiene en modo URL: los `Resultado`
  con `origen: 'manual'` no se tocan, re-escanear no duplica hallazgos
  automáticos y ningún criterio se marca "Pasa".
- "Pegar HTML" sigue funcionando igual que antes de esta rebanada.
- Los tests de `api/_lib/validar-url.spec.ts` cubren como bloqueados
  `127.0.0.1`, `10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`,
  `100.64.0.1`, `0.0.0.0`, `::1`, `fe80::1`, `fc00::1` y `::ffff:127.0.0.1`, y
  como permitida al menos una IPv4 y una IPv6 públicas.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin
  fallos (incluido el nuevo `e2e/escaneo-url.spec.ts`).
- Un escaneo de axe (extensión de navegador) sobre
  `/auditorias/:id/paginas/:id/escaneo` con la pestaña "URL en vivo"
  seleccionada no devuelve errores críticos.
- `specs/README.md` lista 12 `12-escaneo-url.md` (Implemented), 13
  `13-captura-evidencia-escaneo.md` (Pendiente) y 14 `14-panel-progreso.md`
  (Pendiente), y ninguna spec menciona ya `11-panel-progreso` ni
  `12-panel-progreso`.

## Decisiones tomadas y descartadas

- **Sí: Vercel** con `playwright-core` + `@sparticuz/chromium`.
  **No: Netlify**: mismo truco de Chromium sobre Lambda, pero con más
  configuración para el build de Angular. **No: navegador remoto**
  (Browserless): añade un proveedor externo con API key y coste.
  `00-producto.md` §7 y `CLAUDE.md` pasan de "Vercel o Netlify" a "Vercel"
  para no divergir en silencio.
- **Sí: la función devuelve violaciones en crudo (`tags`, `impact`, `help`)
  y el cliente mapea y persiste** con `aplicarViolaciones`. **No: mapear en
  la función**: duplicaría el catálogo WCAG y la lógica de agrupación en dos
  entornos. Además, la persistencia es IndexedDB y tiene que ocurrir en el
  cliente de todos modos.
- **Sí: anti-SSRF sobre todas las peticiones del navegador** (`page.route`
  más resolución DNS de cada host). **No: validar solo la URL inicial**: una
  web pública puede redirigir o cargar subrecursos desde la red interna del
  proveedor (p. ej. la IP de metadatos). **No: autenticación ni rate limit**
  en esta rebanada: no hay usuarios, y el rate limit exige un almacén
  externo en serverless.
- **Sí: URL fija a `pagina.url`**, en campo de solo lectura. **No: URL
  editable**, ni guardando ni sin guardar en `Pagina`: los resultados
  siempre se aplican a la página de la ruta, y una URL distinta a la
  registrada generaría hallazgos que no corresponden a lo que dice la
  página.
- **Sí: `waitUntil: 'load'` + 1,5 s fijos, navegación de 20 s, `maxDuration`
  de 60 s y abort del cliente a 65 s**. **No: `networkidle`**: webs con
  polling o analíticas pueden no llegar nunca a idle (Playwright lo
  desaconseja). **No: `domcontentloaded`**: en SPA escanearía un DOM
  incompleto.
- **Sí: `vercel dev` en local, con el Chromium de Playwright fuera de
  Vercel**. **No: proxy de `ng serve` a un servidor Node propio**: sería
  infraestructura extra distinta de la real. `npm start` sigue funcionando y
  el modo URL cae en "servicio no disponible".
- **Sí: mensajes de error por causa** (URL no escaneable / web no accesible
  / timeout / servicio no disponible). **No: mensaje genérico**: no dejaría
  claro si el problema está en la web auditada o en la herramienta.
- **Sí: tests unitarios de validación y cliente + e2e con el endpoint
  mockeado**. **No: e2e contra la función real**: lento y frágil, y el propio
  anti-SSRF bloquea `localhost`, así que haría falta una excepción solo para
  tests. La función real con Chromium se verifica a mano en el despliegue.
- **Sí: despliegue real dentro de la rebanada**: el tamaño y el arranque de
  Chromium en Lambda solo se pueden verificar allí.
- **Sí: captura como evidencia en una spec propia a continuación**
  (`13-captura-evidencia-escaneo`). El panel de progreso pasa a 14.
  **No: meterla en esta**: añadiría un cuarto dominio (esquema v3 de Dexie,
  `EvidenciasService`, visualización) a una rebanada que ya incluye
  infraestructura, seguridad y flujo de cliente.
- **Sí: renumerar el panel de progreso** en lugar de saltar la numeración:
  el índice sigue el orden real de construcción.
- **Sí: constante de tags compartida en `src/app/core/axe-tags.ts`**, sin
  imports, para que la función la importe sin arrastrar Angular. **No:
  duplicarla en `api/`**: cliente y función podrían acabar ejecutando reglas
  distintas.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `@sparticuz/chromium` incompatible con la versión de Chromium que espera `playwright-core`, o paquete demasiado grande para la función | Fijar versiones compatibles según la tabla de `@sparticuz/chromium`. Se verifica en el despliegue real (paso 8), no solo con `vercel dev`. |
| DNS rebinding: el host resuelve a una IP pública al validar y a una privada cuando Chromium vuelve a resolverlo | Riesgo residual aceptado para un endpoint sin datos sensibles propios. Queda documentado. Si hiciera falta, cerrarlo en otra spec fijando la resolución en Chromium (`--host-resolver-rules`). |
| `page.route` no intercepta WebSockets, WebRTC ni peticiones de service workers | `serviceWorkers: 'block'` en el contexto. WebSockets y WebRTC quedan como riesgo residual aceptado, porque axe-core no depende de ellos para analizar el DOM. |
| Verificar que las redirecciones HTTP del documento principal pasan por `page.route` en la versión instalada | Probarlo en el paso 4 con una URL pública que redirija. Si no pasan, comprobar `response.url()` y la cadena de `request.redirectedFrom()` tras `goto` y responder `400 url-bloqueada` si algún salto apunta a una IP bloqueada. |
| El endpoint es público y cada llamada arranca un Chromium (coste y cuota de Vercel) | Aceptado en el MVP de uso individual. La autenticación y el rate limit quedan fuera, anotados en "Qué NO entra". |
| Webs con protección anti-bots o que bloquean las IPs de centros de datos devuelven un reto o un 403 | Se comunica como `web-no-accesible`, y el toast sugiere usar «Pegar HTML». |
| El margen fijo de 1,5 s no basta para SPA pesadas y axe analiza un DOM incompleto | Aceptado en esta rebanada. Esperas configurables o por selector quedan en "Qué NO entra". Los resultados siguen siendo "automáticos" y pendientes de confirmación manual. |
| La cobertura real de axe-core varía entre la ejecución en el iframe (spec 11) y en Chromium headless | Ambos usan la misma `TAGS_WCAG_2_2_A_AA` y la misma versión de `axe-core`. Verificarlo en el despliegue con una web de violaciones conocidas. |

## Lo que **no** entra en esta spec

- Captura de pantalla como `Evidencia` (va en `13-captura-evidencia-escaneo`).
- Escanear una URL distinta de `pagina.url`.
- Escaneo en lote de todas las páginas de la auditoría.
- Páginas tras login (cookies/cabeceras/credenciales).
- Autenticación y rate limit del endpoint.
- Interacción previa al escaneo (banners de cookies, scroll, selectores, varios viewports).
- Marcar criterios como "Pasa (automático)".
- Panel de progreso (`14-panel-progreso`).

Cada uno de estos puntos, si llega, irá en su propia spec.
