# 13 — Captura de pantalla como evidencia del hallazgo automático (modo URL en vivo)

**Estado:** Implemented
**Depende de:** Spec 12 (Escaneo URL — función serverless `api/escanear-url.ts`, `ViolacionAxe`,
`EscaneoAxeService.aplicarViolaciones` compartido con el modo "Pegar HTML"), Spec 16
(Evidencia de imagen — `Evidencia.descripcion`, esquema v3 de Dexie, `EvidenciasService` y el
render de miniaturas ya existente en `criterio-revision`)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Cuando el escaneo de "URL en vivo" (`specs/12-escaneo-url.md`) detecta una violación de
axe-core, capturar una imagen del elemento afectado con el propio navegador Playwright y
guardarla como `Evidencia` (`specs/16-evidencia-imagen-hallazgo.md`) del `Hallazgo` automático
de ese criterio, para que quien audita vea de un vistazo dónde está el problema sin volver a
abrir la web original.

## Qué entra

- **`api/_lib/captura-evidencia.ts`** (funciones puras, sin Playwright):
  - `selectorSimple(target: unknown): string | null` — devuelve el selector CSS si
    `target` es el `target` de un `axe.NodeResult` con un único elemento de tipo `string`
    (caso simple, sin fragmentación por shadow DOM ni iframes anidados); `null` en cualquier
    otro caso.
  - `PresupuestoCapturas` — acumulador con un máximo de bytes en base64; `admitir(longitud)`
    devuelve si una captura de ese tamaño todavía cabe y, si es así, la contabiliza.
- **`api/escanear-url.ts`**:
  - El `page.evaluate()` que ejecuta `axe.run()` devuelve también, por violación, el `target`
    de su primer nodo (`violation.nodes[0].target`).
  - Tras el `evaluate`, por cada violación con `selectorSimple(target)` no nulo: intenta
    `page.locator(selector).screenshot({ type: 'png' })`. Si el selector no resuelve a
    exactamente un elemento visible y de tamaño distinto de cero, o lanza cualquier error,
    se omite esa captura sin afectar al resto del escaneo (la violación se sigue aplicando
    igual, solo queda sin imagen).
  - Cada captura conseguida se codifica como data URL (`data:image/png;base64,...`) y se
    contabiliza contra un `PresupuestoCapturas` de 3 MB en base64 por ejecución (deja margen
    bajo el límite de 4,5 MB de respuesta de Vercel ya citado en `specs/12-escaneo-url.md`
    "Qué NO entra todavía"). Al agotarse, las violaciones siguientes se aplican sin captura.
  - `ViolacionAxe` (`src/app/core/escaneo-axe.ts`, importado también por la función) gana un
    campo opcional `capturaPng?: string` con esa data URL.
- **`src/app/core/escaneo-axe.ts`**:
  - `agruparViolacionesPorCriterio` agrega, además de `severidad` y `notas`, una lista
    `capturas: { dataUrl: string; descripcion: string }[]` por criterio — una entrada por cada
    violación agrupada que trajo `capturaPng`, con `descripcion` igual a su `help` (mismo texto
    que ya alimenta `notas`).
  - `aplicarViolaciones` convierte cada `dataUrl` a `Blob` y pasa `capturas: { archivo: Blob;
    descripcion: string }[]` a `HallazgosService.guardarAutomatico`.
- **`src/app/core/hallazgos.ts`**: `guardarAutomatico` gana un tercer campo opcional
  `capturas?: { archivo: Blob; descripcion: string }[]` y devuelve el `id` del `Hallazgo`
  (hoy no lo devuelve). En la misma transacción `rw` sobre `hallazgos` y `evidencias`:
  - Si actualiza un `Hallazgo` automático ya existente, borra antes todas sus `Evidencia`
    previas (todas las de un hallazgo automático las generó un escaneo anterior; sin este
    borrado, cada re-escaneo acumularía capturas obsoletas).
  - Inserta una `Evidencia` tipo `'captura'` por cada entrada de `capturas`, con la
    `descripcion` recibida.
- La tarjeta de lectura de `criterio-revision` ya muestra cualquier `Evidencia` de un hallazgo
  por `hallazgo_id` vía `liveQuery` (`specs/16-evidencia-imagen-hallazgo.md`): **no requiere
  ningún cambio** para que las capturas automáticas aparezcan ahí en cuanto se guardan.
- **Documentación**: `specs/README.md` fila 13 → enlazada, "Implemented" al terminar.

## Qué NO entra todavía

- **Captura en el modo "Pegar HTML"** (`specs/11-escaneo-axe.md`): ese modo ejecuta axe-core
  dentro de un iframe con `sandbox="allow-scripts"` **sin** `allow-same-origin` (origen opaco,
  a propósito, para aislarlo de esta app). Rasterizar su DOM (p. ej. con una librería tipo
  `html2canvas`) es técnicamente posible desde dentro del propio iframe, pero si el HTML pegado
  incluye imágenes de otro origen sin cabeceras CORS, el canvas resultante queda "tainted" y no
  se puede exportar (`SecurityError`) — un caso que no se puede descartar en HTML pegado
  arbitrario. Queda para una spec futura si hace falta resolverlo.
- **Más de una captura por violación**: solo el primer nodo (`nodes[0]`), igual que `notas` ya
  solo agrega `violation.help` por violación, no un dato por nodo individual.
- **Violaciones cuyo nodo está en un shadow DOM** (`target` con más de un selector) **o en un
  iframe anidado** (`target` con algún elemento que es a su vez un array): `selectorSimple`
  las descarta y esas violaciones se aplican sin captura.
- **Ningún flujo nuevo de edición**: una captura automática se edita o se quita con el mismo
  `EvidenciasEditor` de la spec 16, disponible en cuanto se edita el hallazgo a mano (lo que lo
  promociona a `origen: 'manual'`, `specs/11-escaneo-axe.md`).
- **Comprimir, recortar o redimensionar** las capturas antes de guardarlas: se guardan tal cual
  las devuelve Playwright.
- **Cambios en `pagina-checklist`** ni en la exportación PDF/Excel: mismas exclusiones que
  `specs/16-evidencia-imagen-hallazgo.md` y `specs/09-exportacion.md`.

## Modelo de datos que toca

Ninguna tabla ni versión nueva de Dexie: reutiliza `evidencias` v3 tal cual la dejó
`specs/16-evidencia-imagen-hallazgo.md`. Las capturas automáticas se guardan como cualquier
otra `Evidencia`:

```ts
{
  hallazgo_id: number;     // el del Hallazgo automático de ese criterio
  tipo: 'captura';
  archivo: Blob;           // PNG devuelto por Playwright
  descripcion: string;     // help de la violación de axe-core (autogenerado)
}
```

Contrato HTTP (extiende el de `specs/12-escaneo-url.md`, mismo endpoint):

```ts
// 200
interface RespuestaEscaneoUrl {
  violaciones: ViolacionAxe[]; // Pick<axe.Result, 'tags' | 'impact' | 'help'> & { capturaPng?: string }
}
```

## Plan de implementación

1. **`api/_lib/captura-evidencia.ts`** con tests (`api/_lib/captura-evidencia.spec.ts`):
   `selectorSimple` con un `target` simple válido, `target` vacío, `target` con un elemento que
   es un array (iframe anidado) y `target` con más de un selector (shadow DOM); `Presupuesto
   Capturas` que admite hasta el límite y rechaza a partir de él, y sigue rechazando aunque una
   captura posterior sea más pequeña que el hueco restante mal calculado (verificar contabilidad
   acumulada, no solo la última).
2. **`api/escanear-url.ts`**: incluir el `target` del primer nodo en la respuesta de
   `page.evaluate()`; capturar con `page.locator(selector).screenshot()` tras el `evaluate`,
   con el presupuesto del paso 1. Prueba manual con `vercel dev` y `curl` sobre una URL con
   violaciones conocidas: al menos una violación de la respuesta trae `capturaPng`, y el
   tamaño total de la respuesta se mantiene por debajo del límite.
3. **`src/app/core/escaneo-axe.ts`**: `ViolacionAxe.capturaPng?: string`;
   `agruparViolacionesPorCriterio` agrega `capturas` por criterio. Actualizar
   `escaneo-axe.spec.ts` (las aserciones existentes ganan `capturas: []`) y añadir casos con
   `capturaPng` presente en una, varias o ninguna violación del mismo criterio.
4. **`src/app/core/hallazgos.ts`**: `guardarAutomatico` acepta `capturas` y devuelve el `id`.
   Tests en `hallazgos.spec.ts`: crear un hallazgo automático con capturas guarda su
   `Evidencia`; re-escanear el mismo criterio reemplaza (no acumula) sus `Evidencia`;
   promocionar a manual y re-escanear no toca las evidencias del hallazgo promocionado (crea
   uno automático nuevo aparte, como ya cubre el test existente de esa rama).
5. **`EscaneoAxeService.aplicarViolaciones`**: convertir cada `dataUrl` agrupada a `Blob`
   (helper `dataUrlABlob`) y pasarlas a `guardarAutomatico`. Test: una violación con
   `capturaPng` produce una `Evidencia` en el hallazgo automático de su criterio.
6. **Verificación manual de extremo a extremo** en el despliegue de Vercel: escanear una
   página real con violaciones conocidas, abrir su hallazgo automático en `criterio-revision`
   y comprobar que la tarjeta de lectura muestra la miniatura con su `alt`, sin haber tocado
   ese componente.
7. **`specs/README.md`**: marcar la fila 13 como "Implemented".
8. **Verificación de accesibilidad**: repetir con teclado y lector de pantalla el recorrido de
   `specs/16-evidencia-imagen-hallazgo.md` sobre un hallazgo con capturas automáticas (reutiliza
   ese mismo render). Escaneo de axe (extensión de navegador) sobre `criterio-revision` con un
   hallazgo automático con capturas.

## Criterios de aceptación

- **En el despliegue de Vercel**, escanear la URL en vivo de una página con violaciones
  conocidas (p. ej. imágenes sin `alt`) guarda, para el `Hallazgo` automático de cada criterio
  con al menos un nodo de selector simple, una `Evidencia` tipo `'captura'` con una imagen PNG
  del elemento afectado y `descripcion` igual al `help` de esa violación de axe-core.
- La tarjeta de lectura de ese hallazgo en `criterio-revision` muestra esa miniatura sin ningún
  cambio de código en esa pantalla.
- Repetir el escaneo sobre la misma página sin cambios reemplaza las `Evidencia` del `Hallazgo`
  automático existente en vez de acumularlas.
- Una violación cuyo nodo no se puede localizar de forma fiable (selector ambiguo, elemento
  oculto o de tamaño cero, selector con shadow DOM o iframe anidado) no impide que su criterio
  se marque igual como "Falla" con sus notas — solo queda sin miniatura.
- Con muchas violaciones capturables a la vez, el tamaño total de la respuesta de
  `/api/escanear-url` se mantiene por debajo del límite de Vercel: a partir de cierto punto las
  violaciones siguientes se aplican igual pero sin captura.
- Editar a mano un `Hallazgo` automático con capturas (promocionándolo a manual,
  `specs/11-escaneo-axe.md`) deja sus `Evidencia` tal cual estaban; un re-escaneo posterior ya
  no las toca.
- El modo "Pegar HTML" (`specs/11-escaneo-axe.md`) sigue funcionando exactamente igual que
  antes, sin ninguna `Evidencia` asociada a sus hallazgos automáticos.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- Un escaneo de axe (extensión de navegador) sobre `criterio-revision` con un hallazgo
  automático con capturas no devuelve errores críticos.
- `specs/README.md` lista la fila 13 como "Implemented".

## Decisiones tomadas y descartadas

- **Sí: solo el modo "URL en vivo".** Playwright ya renderiza la página real con sus estilos
  aplicados y puede capturar cualquier elemento de forma fiable. **No: también "Pegar HTML"**
  en esta rebanada: el riesgo de canvas tainting con imágenes cross-origin sin CORS dentro de
  un iframe de origen opaco es un problema técnico distinto, no una simple cuestión de
  producto — se retoma aparte si hace falta.
- **Sí: un screenshot por violación (su primer nodo), agregado por criterio** igual que las
  notas. **No: un screenshot por nodo individual**: multiplicaría el volumen de datos sin
  aportar mucho más que el primero, ya representativo del problema.
- **Sí: recorte al elemento (`locator.screenshot()`)** en vez de página completa. Muestra el
  contexto justo donde está el problema y pesa mucho menos. **No: captura de página completa**:
  más contexto, pero mucho más peso y más riesgo de superar el límite de respuesta de Vercel.
- **Sí: presupuesto acumulado de bytes (3 MB en base64) como único corte**, en vez de un tope
  fijo de violaciones capturadas: se adapta al tamaño real de cada imagen. **No: tope fijo de
  N violaciones**: desperdiciaría margen si las imágenes son pequeñas y no protegería si son
  grandes (p. ej. violaciones con nodo `html`/`body`).
- **Sí: solo `target.length === 1`** (selector simple de nivel superior). **No: soporte de
  shadow DOM o iframes anidados** en esta rebanada: la superficie real de casos que cubre es
  pequeña frente a la complejidad de resolver esos selectores con Playwright.
- **Sí: borrar y regenerar las `Evidencia` de un `Hallazgo` automático en cada re-escaneo**
  (mientras siga siendo automático). **No: acumularlas**: dejaría capturas obsoletas de
  violaciones ya corregidas mezcladas con las vigentes.
- **Sí: `descripcion` por defecto = `help` de la violación** (texto real, no vacío), para
  cumplir 1.1.1 sobre la propia app desde el primer momento sin esperar a que alguien la edite
  a mano — mismo principio de `specs/16-evidencia-imagen-hallazgo.md` "Decisiones tomadas y
  descartadas". **No: `descripcion` vacía hasta que se edite**: dejaría `alt=""` en una imagen
  con contenido informativo mientras tanto.
- **Sí: la captura ocurre dentro de la función serverless**, donde ya hay un navegador real
  renderizando la página. **No: pedir al cliente que vuelva a visitar la URL para capturar**:
  duplicaría la navegación (con su propio riesgo SSRF) y sería más lento.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Violaciones cuyo nodo es `html`/`body` (p. ej. reglas `landmark-*`, `region`, `html-has-lang`) generan capturas grandes que agotan pronto el presupuesto, dejando el resto sin imagen | Aceptado: sus notas de texto se guardan igual, solo falta la miniatura. El presupuesto protege el límite de respuesta de Vercel por encima de conseguir todas las capturas. |
| 3 MB en base64 (~2,2 MB reales) puede no dejar margen suficiente junto al resto del cuerpo de la respuesta si hay muchas violaciones con `help`/notas largas | Verificar con una página real de bastantes violaciones en el despliegue, igual que el resto de límites de esta función (`specs/12-escaneo-url.md` "Riesgos identificados"). Ajustar la constante si hace falta. |
| Capturar N elementos añade tiempo total a una función que ya navega y ejecuta axe-core, dentro del `maxDuration: 60` de `vercel.json` | Cada `locator.screenshot()` es rápido (decenas-cientos de ms); el presupuesto de bytes corta antes de que el tiempo sea un problema en la práctica. Medir en el despliegue con una página con muchas violaciones. |
| Un elemento cambia de tamaño o posición entre `axe.run()` y el screenshot posterior (animaciones, contenido dinámico) | Riesgo residual aceptado — mismo tipo de riesgo ya aceptado para el propio `axe.run()` en una SPA (`specs/12-escaneo-url.md`). |
| Un elemento con overflow oculto (scroll o clip) devuelve una captura vacía o cortada | Riesgo residual aceptado; las notas de la violación siguen documentando el problema igual. |
