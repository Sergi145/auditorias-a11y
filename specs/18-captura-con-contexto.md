# 18 — La captura señala el elemento y muestra su contexto

**Estado:** Implemented
**Depende de:** Spec 13 (la captura como `Evidencia` del hallazgo automático y su presupuesto
de bytes), Spec 12 (`api/escanear-url.ts`, Playwright en la función serverless)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

La spec 13 recorta la captura pegada al elemento (`locator.screenshot()`). En la práctica eso
da miniaturas inservibles: en `https://web.gencat.cat/ca/inici`, la violación de contraste
produce una imagen de 77×13 px con el texto "Powered by" recortado, sin ninguna pista de qué
falla ni de dónde está en la página. Esta rebanada cambia **qué** se captura: el elemento
resaltado con un recuadro, dentro de un área con contexto a su alrededor.

## Qué entra

- **`api/_lib/recorte-captura.ts`** (función pura, sin Playwright):
  `recorteConContexto(elemento, viewport, opciones?)` devuelve el rectángulo a capturar —
  la caja del elemento más `margen` (48 px) por lado, nunca menor que un mínimo
  (480×320, para que un elemento diminuto no dé una miniatura ilegible) ni mayor que el
  viewport, centrado en el elemento y empujado hacia dentro si se saliera por algún borde.
  `null` si el elemento no tiene superficie.
- **`api/escanear-url.ts`**, en `capturarPrimerNodo()`:
  - `locator.scrollIntoViewIfNeeded()` + `locator.boundingBox()` para situar el elemento en el
    viewport (las dos APIs trabajan en coordenadas de viewport, las mismas que `clip`).
  - `resaltar()` pone un `outline: 3px solid #e11d48 !important` sobre el elemento y devuelve
    cómo deshacerlo: restaura el atributo `style` completo tal y como estaba (o lo quita si no
    tenía), porque la misma página sigue viva para capturar las violaciones siguientes.
  - `page.screenshot({ clip: recorte })` en vez de `locator.screenshot()`.
  - El viewport del contexto pasa a ser la constante `VIEWPORT` (1280×800), compartida con el
    cálculo del recorte.
- **Tests** de `recorteConContexto` en `api/_lib/recorte-captura.spec.ts`: elemento diminuto,
  elemento mayor que el mínimo, elemento pegado a cada borde, elemento más grande que el
  viewport (`html`/`body`), elemento sin superficie y opciones a medida.

## Qué NO entra todavía

- **Cambios en el cliente**: `ViolacionAxe.capturaPng`, el agrupado por criterio, el guardado
  como `Evidencia` y las miniaturas (specs 13, 16 y 17) siguen exactamente igual. Esta
  rebanada solo cambia el contenido del PNG.
- **Imagen del fragmento HTML** (`violation.nodes[0].html`) como evidencia aparte: descartado
  en esta rebanada (ver decisiones).
- **Anotar la captura con el texto de la violación** (el `help` rotulado sobre la imagen): el
  texto ya viaja como `descripcion` de la `Evidencia` y como notas del hallazgo.
- **Resaltar todos los nodos de la violación**: se sigue capturando solo `nodes[0]`, como en la
  spec 13.
- **Subir el presupuesto de 3 MB** ni cambiar el formato a JPEG/WebP para que quepan más
  capturas.

## Modelo de datos que toca

Ninguno. Mismo `capturaPng` (data URL de un PNG) en la respuesta y misma `Evidencia` tipo
`'captura'` en Dexie.

## Criterios de aceptación

- La captura de una violación sobre un elemento pequeño mide al menos 480×320 px y muestra el
  elemento **señalado con un recuadro rojo**, con el contenido de alrededor visible.
- La captura de una violación sobre un elemento mayor que el viewport (`html`, `body`,
  contenedores) se limita al viewport en vez de a la página entera.
- El resaltado no se queda puesto: la captura de la violación siguiente no muestra recuadros de
  las anteriores, y una violación cuyo elemento tenía `style` propio lo conserva intacto.
- Una violación cuyo elemento no se puede situar (sin `boundingBox`, oculto, fuera de pantalla)
  se sigue aplicando igual, solo sin imagen — mismo comportamiento que la spec 13.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- `specs/README.md` lista la fila 18 como "Implemented".

## Decisiones tomadas y descartadas

- **Sí: recorte con contexto y elemento resaltado.** **No: seguir con `locator.screenshot()`**
  (spec 13): la decisión original ("recorte al elemento... muestra el contexto justo donde está
  el problema y pesa mucho menos") no sobrevivió al contacto con webs reales — un enlace-icono
  o un texto corto dan una imagen que no dice nada. Esta rebanada **sustituye** esa decisión de
  la spec 13.
- **No: imagen del fragmento HTML del nodo** (`nodes[0].html`, lo que enseña axe DevTools).
  Se valoró y se descartó por ahora: renderizar código como imagen obliga a montar una página
  aparte solo para eso, y una imagen de texto es peor que el texto mismo para un lector de
  pantalla. Si hace falta el HTML, el sitio natural es un campo de texto del hallazgo, no una
  imagen — rebanada aparte.
- **Sí: `outline` en vez de un overlay `<div>` posicionado.** No altera el layout (no desplaza
  nada, a diferencia de un borde) y se deshace restaurando un solo atributo. **No: un overlay
  con posición absoluta**: habría que insertarlo y quitarlo del DOM de la web auditada, con más
  riesgo de romper su maquetación entre capturas.
- **Sí: mínimo de 480×320 y margen de 48 px.** Suficiente para reconocer el entorno del
  elemento sin acercarse al peso de una captura de viewport completo. **No: capturar siempre el
  viewport entero**: pesa del orden de 500 KB por imagen y agotaría el presupuesto de 3 MB en
  ~6 violaciones.
- **Sí: mantener el presupuesto de 3 MB tal cual.** De hecho esta rebanada lo alivia: las
  capturas de elementos `html`/`body`, que antes salían a página completa (1,5 MB medidos en
  una página real), ahora quedan acotadas al viewport.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Un elemento con `outline` propio o con `!important` en su hoja de estilos puede no mostrar el recuadro | El resaltado usa `!important` en el `style` en línea, que gana a cualquier regla de hoja de estilos; el recorte con contexto sigue siendo útil aunque el recuadro no se vea |
| Una web con scroll infinito o animaciones puede mover el elemento entre `boundingBox()` y `screenshot()` | Mismo riesgo residual ya aceptado en las specs 12 y 13 para el propio `axe.run()` |
| Las capturas con contexto pesan más que el recorte pegado al elemento, así que caben menos en el presupuesto | Compensado por el recorte al viewport de los elementos enormes, que eran los que se lo comían. Medido en dos webs reales: 8–90 KB por elemento normal, ~500 KB los de viewport completo |
| `scrollIntoViewIfNeeded()` añade una operación por violación a una función con `maxDuration: 60` | Es una llamada de decenas de ms; el presupuesto de bytes sigue cortando antes de que el tiempo sea el problema |
