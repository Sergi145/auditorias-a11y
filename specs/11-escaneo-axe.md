# 11 — Escaneo automático con axe-core (modo HTML pegado)

**Estado:** Implemented
**Depende de:** Spec 03 (Catálogo WCAG — dataset de `CriterioWCAG` consultable), Spec 05 (Auditorías y páginas — `Pagina` real y ruta `/auditorias/:auditoriaId/paginas/:paginaId/escaneo` ya maquetada), Spec 06 (Checklist manual — `Resultado`/`Hallazgo` reales en Dexie)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Conectar la pestaña "Pegar HTML" de `pagina-escaneo` (hoy un placeholder, ver
`specs/02-maqueta-m3.md` pantalla 6) a una ejecución real de axe-core que
analiza el HTML pegado, mapea sus violaciones a los criterios WCAG del
catálogo y pre-rellena el checklist de esa página como "Falla (automático)",
dejando el resto en "Por revisar" para su confirmación manual.

## Qué entra

- Instalar `axe-core` (no está en `package.json` todavía).
- **`src/app/core/axe-wcag-mapping.ts`**: funciones puras, sin dependencia de
  Dexie ni del DOM:
  - `codigosCriterioParaTags(tags: string[]): string[]` — cruza los tags de
    una violación de axe-core (ej. `wcag111`, `wcag143`) contra
    `CriteriosWcagService.todos()`, calculando el tag esperado de cada
    criterio como `'wcag' + codigo.replace(/\./g, '')` y devolviendo los
    códigos de criterio que coinciden. Evita mantener a mano una tabla de
    mapeo de las ~90 reglas de axe-core.
  - `severidadDesdeImpacto(impact): Severidad` — mapea el `impact` de axe-core
    a `Severidad`: `critical`→`critica`, `serious`→`alta`, `moderate`→`media`,
    `minor`→`baja`, `null`/desconocido→`media`.
- **`Hallazgo` gana un campo `origen: OrigenHallazgo`** (`'manual' |
  'automatico'`, mismo patrón que `Resultado.origen`) en
  `src/app/core/models.ts`. No requiere tabla ni versión nueva de Dexie (campo
  no indexado, igual que `Resultado.fecha_revision`).
- **`src/app/core/escaneo-axe.ts`** (`EscaneoAxeService`):
  `ejecutarSobreHtml(paginaId, html): Promise<ResumenEscaneo>`:
  1. Renderiza `html` en un `<iframe>` oculto (`srcdoc`, `sandbox="allow-scripts"`
     **sin** `allow-same-origin`, para que reciba un origen único y opaco: no
     puede acceder a cookies, `localStorage` ni IndexedDB de esta app, ni al
     DOM del padre, aunque su contenido tenga scripts activos). axe-core se
     inyecta y se ejecuta **dentro** del propio iframe (`axe.source`, pensado
     por axe-core exactamente para esto) y devuelve el resultado al padre por
     `postMessage` — ver "Decisiones tomadas y descartadas" sobre por qué no
     es posible ejecutar axe-core desde el padre contra el documento del
     iframe, ni siquiera siendo de mismo origen.
  2. Ejecuta `axe.run(...)` sobre el documento del iframe con las reglas de
     las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
     (excluye reglas "best-practice" que no mapean a ningún criterio del
     catálogo).
  3. Para cada `violation`, resuelve sus criterios con
     `codigosCriterioParaTags` y, para cada uno:
     - Si ya existe un `Resultado` con `origen: 'manual'` para esa
       página/criterio, no lo toca.
     - Si no, hace upsert de `Resultado` (`estado: 'falla'`, `origen:
       'automatico'`) y upsert del Hallazgo automático de ese resultado
       (busca uno existente con `origen: 'automatico'`; si existe lo
       actualiza, si no lo crea), con severidad de
       `severidadDesdeImpacto(violation.impact)` y notas a partir de
       `violation.help`/`violation.description`. Varias violaciones de la
       misma ejecución que mapeen al mismo criterio agregan sus notas en un
       único Hallazgo automático, no crean varios.
  4. Elimina el iframe y devuelve un resumen (`{ criteriosMarcados: number
     }`) para el toast.
- **`ResultadosService`**: nuevo método `guardarAutomatico(paginaId,
  criterioCodigo, cambios)` — mismo upsert que `guardar()` pero no
  sobrescribe un `Resultado` existente con `origen: 'manual'`.
- **`HallazgosService`**: nuevo método para el upsert del hallazgo automático
  descrito arriba. `crear()`/`actualizar()` (los que ya usa `criterio-revision`
  para hallazgos redactados a mano) pasan a fijar `origen: 'manual'`
  explícito; guardar una edición sobre un hallazgo que era `origen:
  'automatico'` lo "promociona" a `'manual'`, protegiéndolo de que un
  re-escaneo posterior lo sobrescriba.
- **`pagina-escaneo.ts`/`.html`**: el formulario "Pegar HTML" llama a
  `EscaneoAxeService` real. Mientras corre, el botón "Ejecutar escaneo" pasa a
  "Escaneando…" y queda deshabilitado; al terminar, un toast resume cuántos
  criterios se marcaron (o indica que no se encontraron fallos automáticos) y
  el usuario vuelve al checklist de la página (mismo patrón de estado/toast
  que `auditoria-exportar`, ver `specs/09-exportacion.md`). La pestaña "URL en
  vivo" queda deshabilitada con una nota indicando que se implementa en una
  rebanada futura (función serverless con Playwright). Se actualiza también
  la nota inferior de la pantalla, que hoy referencia la "rebanada
  10-escaneo-axe" (numeración obsoleta).
- **`pagina-checklist.html`/`.ts`**: cada fila cuyo `resultado?.origen ===
  'automatico'` muestra un distintivo visible ("Automático", `AppChip`) junto
  al estado, cumpliendo que "los resultados automáticos quedan marcados como
  tal" (`00-producto.md` §5.3).
- Al terminar la implementación, marcar la fila 11 de `specs/README.md` como
  "Implemented".

## Qué NO entra todavía

- **Modo "URL en vivo"** (función serverless con Playwright + axe-core que
  escanea una URL real): es una pieza de infraestructura bastante distinta
  (nueva función serverless, entorno desplegado, sin la que no se puede
  probar en local del mismo modo) — se deja para una rebanada futura. La
  pestaña ya maquetada se mantiene visible pero deshabilitada mientras tanto.
- **Marcar un criterio como "Pasa (automático)"**: una regla de axe que no
  reporta violaciones no implica que el criterio completo se cumpla (axe
  cubre solo una fracción de cada criterio); esos criterios se quedan en
  "Por revisar" igual que hoy.
- **Vista previa/selección de qué aplicar antes de guardar**: el escaneo
  aplica sus resultados directamente en Dexie y resume el resultado en un
  toast; la confirmación manual ocurre después, en el propio checklist
  (distintivo "Automático" + revisión normal por `criterio-revision`), no
  como un paso de aprobación previo separado.
- **Deduplicar entre violaciones no mapeadas a ningún criterio**: si una
  regla de axe no tiene ningún tag `wcagNNN` presente en el catálogo (reglas
  "best-practice" o de niveles/criterios fuera de A/AA), su violación se
  ignora — no hay ningún `Resultado` donde guardarla.
- **Evidencia/capturas del escaneo automático**: el `Hallazgo` automático no
  adjunta ninguna `Evidencia` (esa entidad sigue sin `EvidenciasService`, ver
  `specs/09-exportacion.md` "Qué NO entra").
- **Panel de progreso o estadísticas del propio escaneo** (cuántos escaneos
  se han corrido, histórico) — sigue en `14-panel-progreso`.

## Modelo de datos que toca

No introduce entidades nuevas. Modifica `Hallazgo` (`00-producto.md` §6):
añade `origen: OrigenHallazgo` (`'manual' | 'automatico'`), mismo patrón que
`Resultado.origen` ya definido desde `01-fundacion.md`. No requiere tabla ni
versión nueva de Dexie: es un campo no indexado sobre una tabla ya existente
(`hallazgos`), igual que `Resultado.fecha_revision` se añadió sin bump de
esquema. Los `Hallazgo` ya guardados antes de esta rebanada no tienen este
campo (`undefined`); el código los trata como no automáticos, lo cual es
correcto sin necesitar ninguna migración de datos.

## Plan de implementación

1. `npm install axe-core`. Añadir `origen: OrigenHallazgo` a `Hallazgo` en
   `models.ts`. El sistema sigue funcionando igual (el campo aún no se usa en
   ningún sitio).
2. **`axe-wcag-mapping.ts`**: `codigosCriterioParaTags` y
   `severidadDesdeImpacto`, con tests unitarios sobre tags/impactos
   conocidos (ej. `['wcag2aa', 'wcag143']` → `['1.4.3']`).
3. **`ResultadosService.guardarAutomatico`** y el upsert de hallazgo
   automático en `HallazgosService` (incluida la "promoción" a `'manual'` al
   editar uno automático desde `criterio-revision`), con tests unitarios:
   no sobrescribe un `Resultado` `origen: 'manual'`; re-guardar el
   automático actualiza el mismo `Hallazgo` en vez de duplicarlo; editar un
   hallazgo automático lo promociona a `'manual'`.
4. **`EscaneoAxeService.ejecutarSobreHtml`**: renderizado en iframe
   sandboxed, ejecución de `axe.run`, mapeo y persistencia usando los
   servicios del paso 3. Tests unitarios de la lógica de mapeo/persistencia
   (violaciones de ejemplo → resultados/hallazgos esperados).
5. **`pagina-escaneo.ts`/`.html`**: conectar el formulario "Pegar HTML" al
   servicio real (estado "Escaneando…", toast-resumen, vuelta al checklist);
   deshabilitar la pestaña "URL en vivo" con nota "próximamente"; actualizar
   el texto de la nota inferior con la numeración correcta — al terminar
   este paso, el escaneo funciona de extremo a extremo para HTML pegado.
6. **`pagina-checklist.html`/`.ts`**: distintivo "Automático" (`AppChip`)
   junto al estado de las filas con `resultado.origen === 'automatico'`.
7. **`specs/README.md`**: marcar la fila 11 como "Implemented" y enlazarla.
8. **Verificación de accesibilidad**: estado "Escaneando…", pestaña
   deshabilitada y distintivo "Automático" revisados con teclado y lector de
   pantalla; escaneo de axe (extensión de navegador) sobre
   `/auditorias/:id/paginas/:id/escaneo` y sobre `pagina-checklist` con filas
   automáticas.

## Criterios de aceptación

- Pegar HTML con violaciones conocidas (ej. `<img>` sin `alt`, texto con
  contraste insuficiente) en la pestaña "Pegar HTML" y pulsar "Ejecutar
  escaneo" marca los criterios mapeados (`1.1.1`, `1.4.3`, etc.) como "Falla"
  con `origen: 'automatico'` en el checklist de esa página, cada uno con un
  `Hallazgo` automático con severidad y notas derivadas de axe-core.
- La pestaña "URL en vivo" aparece deshabilitada con una nota indicando que
  se implementa en una rebanada futura.
- Un criterio que ya tiene un `Resultado` con `origen: 'manual'` no se
  modifica al ejecutar o repetir el escaneo.
- Repetir el escaneo sobre la misma página sin cambios no duplica hallazgos
  automáticos: actualiza el `Hallazgo` automático existente de cada criterio
  en vez de crear uno nuevo.
- Editar a mano un Hallazgo automático desde `criterio-revision` lo cambia a
  `origen: 'manual'`; un escaneo posterior ya no lo sobrescribe (crea uno
  nuevo si la violación sigue presente).
- Un criterio cubierto por una regla de axe que no reporta violaciones se
  queda en "Por revisar" — nunca se marca "Pasa" automáticamente.
- Mientras se ejecuta el escaneo, "Ejecutar escaneo" muestra el estado
  "Escaneando…" y queda deshabilitado; al terminar, un toast resume cuántos
  criterios se marcaron (o indica que no se encontraron fallos automáticos)
  y el usuario vuelve al checklist de la página. *(Ampliado en la spec 12:
  además, el inicio del escaneo se anuncia a los lectores de pantalla por
  `LiveAnnouncer`, porque el cambio de texto del botón no se lee.)*
- En `pagina-checklist`, cada fila con `resultado.origen === 'automatico'`
  muestra un distintivo visible "Automático" junto al estado.
- `npm run lint` y `npm test` pasan sin fallos.
- Un escaneo de axe (extensión de navegador) sobre
  `/auditorias/:id/paginas/:id/escaneo` y sobre `pagina-checklist` con filas
  automáticas no devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Alcance dividido**: esta rebanada cubre solo el modo "HTML pegado"
  (100% cliente); el modo "URL en vivo" (función serverless + Playwright)
  queda para una rebanada futura — evita mezclar una pieza frontend con
  infraestructura de despliegue en el mismo PR, y mantiene esta rebanada
  verificable sin depender de un entorno desplegado.
- **Mapeo de reglas de axe a criterios WCAG calculado en tiempo de
  ejecución** (tag esperado = `'wcag' + código sin puntos`, cruzado contra
  el catálogo ya existente), en vez de mantener una tabla de mapeo escrita a
  mano: evita una lista de ~90 reglas desincronizada de la versión real de
  axe-core instalada.
- **Ningún criterio se marca "Pasa (automático)"**: axe-core cubre solo una
  fracción de cada criterio (~30-40% típico, `00-producto.md` §9); marcarlo
  "Pasa" sería un falso positivo de cumplimiento. Coincide con que
  `00-producto.md` §5.3 solo menciona "Falla (automático)" o "Revisar".
- **El escaneo respeta cualquier `Resultado` con `origen: 'manual'`**:
  protege el criterio experto ya aplicado por quien audita frente a un
  re-escaneo posterior.
- **Aplicación directa + resumen (no vista previa con checkboxes)**: la
  confirmación manual ocurre en el checklist normal (distintivo "Automático"
  + revisión por criterio), no como un paso de aprobación separado antes de
  guardar — coherente con que `origen: 'automatico'` ya deja rastro de qué
  necesita confirmarse.
- **`Hallazgo.origen` nuevo, con "promoción" a `'manual'` al editar**: sin
  este campo no hay forma fiable de saber qué `Hallazgo` actualizar en un
  re-escaneo sin arriesgar pisar uno redactado a mano para el mismo
  criterio; la promoción evita perder una edición del usuario en el
  siguiente re-escaneo.
- **Renderizado en iframe `sandbox="allow-scripts"` sin `allow-same-origin`,
  con axe-core ejecutándose dentro del iframe (no desde el padre)**:
  axe-core valida internamente que el contexto recibido sea
  `instanceof window.Node` de su propio `window` — un `Document` de otro
  iframe, aunque sea de mismo origen, nunca cumple esa comprobación desde
  fuera (falla con `TypeError: axe.run arguments are invalid`, confirmado al
  implementar esta rebanada). axe-core solo puede analizar un documento
  ejecutándose en su mismo realm de JavaScript, así que la única forma
  correcta de usarlo contra HTML pegado es inyectarlo **dentro** del propio
  iframe (`axe.source`, provisto por axe-core justo para este caso) y leer
  el resultado por `postMessage`. Esto descarta la idea original de "sin
  `allow-scripts`": el origen opaco (`allow-scripts` sin `allow-same-origin`)
  sigue aislando el HTML pegado de cookies/`localStorage`/IndexedDB/DOM de
  esta app aunque sus propios scripts, si los tiene, se ejecuten dentro de
  ese origen aislado — ver "Riesgos identificados".
- **Severidad `null`/desconocida de axe → `media`** (no `baja`): evita
  infravalorar un hallazgo del que axe no da información de impacto.
- **Sin tabla ni versión nueva de Dexie**: `Hallazgo.origen` es un campo no
  indexado — la consulta de hallazgos automáticos ya filtra en memoria sobre
  `resultado_id`, que ya está indexado.

## Riesgos identificados

- La cobertura real de axe-core sobre los 55 criterios WCAG 2.2 A/AA es
  parcial y depende de la versión instalada — verificar con HTML de prueba
  real qué criterios llegan a mapearse antes de dar la rebanada por
  terminada.
- jsdom no ejecuta scripts dentro de un iframe con `srcdoc` por defecto, así
  que el flujo completo (`EscaneoAxeService.ejecutarSobreHtml`: iframe +
  axe-core inyectado + `postMessage`) no tiene cobertura de test automatizado
  — solo la lógica de agregación/mapeo (`agruparViolacionesPorCriterio`) y la
  persistencia (`ResultadosService`/`HallazgosService`, ya cubiertas en el
  paso 3). Verificar el flujo completo manualmente en un navegador real antes
  de dar la rebanada por terminada.
- El HTML pegado corre con scripts activos dentro de un iframe de origen
  opaco: no puede tocar la app (cookies/`localStorage`/IndexedDB/DOM), pero
  si el HTML pegado trae sus propios `<script>`, sí se ejecutan dentro de ese
  origen aislado (p. ej. podrían intentar peticiones de red salientes desde
  ese origen opaco). Aceptado como parte de la decisión — axe-core no puede
  analizar el documento sin ejecutarse en su mismo realm.
- HTML pegado muy grande podría tardar en analizarse o congelar brevemente
  el hilo principal, mismo riesgo ya identificado en
  `specs/09-exportacion.md` para Excel/PDF; el estado "Escaneando…" mitiga
  la percepción pero conviene medir con un caso real grande.
- Si una violación de axe mapea a más de un criterio a la vez (tags con
  varios `wcagNNN`), o varias violaciones de la misma ejecución mapean al
  mismo criterio, sus notas se agregan en un único Hallazgo automático por
  criterio — verificar que esto no deja información importante fuera de las
  notas cuando ocurre en HTML de prueba real.

