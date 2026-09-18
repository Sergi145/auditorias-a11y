# 19 — Hallazgos automáticos de axe-core en español

**Estado:** Implemented
**Depende de:** Spec 11 (`agruparViolacionesPorCriterio()` y `aplicarViolaciones()`), Spec 12
(`api/escanear-url.ts` devuelve las violaciones en crudo), Spec 13 (la `descripcion` de cada
captura sale del texto de la violación)
**Fecha:** 2026-09-18

## Objetivo de esta rebanada

Hoy las notas de los hallazgos automáticos y la descripción de sus capturas se guardan con el
`help` de axe-core tal cual, en inglés ("Images must have alternative text"), en una app que
está entera en español. Esta rebanada hace que, en los dos modos de escaneo ("Pegar HTML" y
"URL en vivo"), esos textos se guarden ya traducidos.

## Qué entra

- **`src/app/core/axe-traducciones.ts`** (sin dependencias): `TRADUCCIONES_AXE`, un
  `Record<string, string>` **id de regla → texto en español**, con las 70 reglas que ejecuta
  `TAGS_WCAG_2_2_A_AA` en axe-core 4.13; y `textoViolacionEs(violacion)`, que devuelve la
  traducción o, si el id no está en el diccionario (o no viene), el `help` original en inglés.
  Nunca una cadena vacía ni un error.
  - Punto de partida: `node_modules/axe-core/locales/es.json` (`rules[id].help`), revisado:
    las frases literales o que no están en forma de requisito se reescriben, y las 17 reglas
    que `es.json` no trae se traducen a mano. Cada entrada lleva un comentario con su origen
    (`es.json`, `revisada` o `propia`).
  - Estilo: español de España, técnico, en forma de requisito y sin punto final, como los
    `help` de axe; nombres de atributos, roles y elementos literales (`aria-label`,
    `role="img"`, `<select>`); terminología del catálogo WCAG de la app ("nombre accesible",
    "foco", "objetivo táctil"...).
- **`ViolacionAxe`** (`src/app/core/escaneo-axe.ts`) añade `'id'` al `Pick<axe.Result, ...>`,
  y **`api/escanear-url.ts`** lo devuelve en cada violación.
- **`agruparViolacionesPorCriterio()`** usa `textoViolacionEs()` para las notas del hallazgo
  y para la `descripcion` de cada captura. Es el único punto donde se aplica: cubre los dos
  modos de escaneo sin duplicar lógica.
- **Tests unitarios**: cobertura del diccionario frente a `axe.getRules(TAGS_WCAG_2_2_A_AA)`
  (falla si una actualización de axe-core añade una regla sin traducir), fallback al inglés, y
  notas/descripciones en español en `agruparViolacionesPorCriterio()`.

## Qué NO entra todavía

- **Migrar los hallazgos ya guardados** en IndexedDB: los escaneos anteriores a esta
  rebanada siguen con notas y descripciones en inglés. Volver a escanear la página no los
  sustituye si el criterio ya tenía un resultado manual (regla de la spec 11).
- **Traducir la `description` larga, los mensajes por nodo (`failureSummary`) o el
  `helpUrl`** de axe-core: solo se guarda el `help`, como hasta ahora.
- **Cambiar de idioma** (selector de idioma, inglés como opción): la app es solo en español.
- **`axe.configure({ locale })`** dentro del iframe o de Playwright (ver decisiones).

## Modelo de datos que toca

Ninguno. `Hallazgo.notas` y `Evidencia.descripcion` mantienen la misma forma (mismo `\n`
entre notas, misma agrupación y severidad); solo cambia el idioma del texto. La respuesta de
`/api/escanear-url` gana el campo `id` en cada violación (aditivo: un cliente o una respuesta
sin `id` sigue funcionando con el texto en inglés).

## Criterios de aceptación

- Un escaneo "Pegar HTML" de `<img src="x.png">` guarda en el hallazgo del criterio 1.1.1 la
  nota "Las imágenes deben tener texto alternativo".
- Un escaneo "URL en vivo" guarda notas y descripciones de capturas en español.
- Las 70 reglas de `axe.getRules(TAGS_WCAG_2_2_A_AA)` tienen traducción; un test unitario lo
  comprueba.
- Una violación con un id desconocido (o sin id) se guarda con su `help` original en inglés.
- La agrupación por criterio, la severidad y el separador `\n` entre notas no cambian.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run build` pasan sin fallos.
- `specs/README.md` lista la fila 19 como "Implemented".

## Decisiones tomadas y descartadas

- **Sí: traducir por id de regla** (`image-alt`). **No: buscar por el texto inglés**: los
  `help` cambian entre versiones de axe-core, los ids no.
- **Sí: diccionario propio en el cliente, aplicado al agrupar.** **No: `axe.configure({
  locale })`**: obliga a inyectar el locale en dos realms distintos (iframe aislado y Chromium
  de la función serverless) y deja el texto a merced de `es.json`, que en axe-core 4.13 no
  cubre 17 de las 70 reglas y tiene frases literales ("Los 'ARIA input fields' tienen un
  nombre accesible") o desfasadas (`frame-title`).
- **Sí: fallback al `help` en inglés.** Un texto en inglés es mejor que una nota vacía si
  una versión nueva de axe-core añade una regla antes de traducirla; el test de cobertura
  avisa en CI.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Actualizar axe-core añade reglas WCAG A/AA sin traducción | Test de cobertura contra `axe.getRules()`; mientras tanto, fallback al inglés |
| Una traducción cambia el matiz de la regla original | Cada entrada indica su origen; las `propia`/`revisada` se pueden revisar contra el `help` inglés |
| Hallazgos antiguos en inglés conviven con los nuevos en español | Aceptado en esta rebanada (sin migración); se ve solo en auditorías escaneadas antes |
