# 06 — Checklist manual: estado, severidad y hallazgos por criterio

**Estado:** Aprobado
**Depende de:** Spec 01 (Fundación), Spec 03 (Catálogo WCAG), Spec 05 (CRUD de auditorías y páginas)
**Fecha:** 2026-09-10

## Objetivo de esta rebanada

Persistir de verdad el estado, la severidad y las notas de cada criterio WCAG
por página, permitiendo registrar varios hallazgos (errores) por criterio —
mostrados en un collapse por fila del checklist cuando el criterio está en
"Falla" — con lo que la app sustituye por completo al Excel para el registro
manual.

## Qué entra

- **Nueva entidad `Hallazgo`** (instancia de un error concreto, distinta de
  `HallazgoPlantilla`, que es la redacción reutilizable de la biblioteca):
  varios hallazgos pueden colgar del mismo `Resultado` (mismo criterio en la
  misma página).
- **`Resultado` se simplifica**: pierde `severidad`, `componente_id` y
  `hallazgo_plantilla_id` (se mueven a `Hallazgo`); conserva `estado`,
  `notas` (nota general del criterio, útil sobre todo en Pasa/No aplica/Por
  revisar), `origen` y `fecha_revision`.
- **`ResultadosService`** (`src/app/core/resultados.ts`): real sobre
  `database.db.resultados`. Lectura reactiva (`dePagina$`,
  `porPaginaYCriterio$`) y `guardar()` (upsert: crea el resultado si no
  existe para ese criterio/página, o actualiza estado/notas/fecha_revision
  si ya existe).
- **`HallazgosService`** (`src/app/core/hallazgos.ts`): real sobre
  `database.db.hallazgos`. Lectura reactiva (`dePagina$` para todos los
  hallazgos de los resultados de una página, `deResultado$` para uno
  concreto) y escritura: `crear()`, `actualizar()`, `eliminar()`.
- **`pagina-checklist`**: filas reactivas reales (criterios × resultado real,
  ya no mock). Cada fila cuyo criterio está en "Falla" incluye un control
  para expandir/colapsar (`aria-expanded`/`aria-controls`) que muestra un
  resumen de sus hallazgos (severidad, componente si tiene, primeras líneas
  de la nota), con enlace "Editar" a `criterio-revision` y botón "Eliminar"
  (con `window.confirm()`, mismo patrón que auditorías/páginas).
- **`criterio-revision`**: el formulario superior (estado + nota general)
  persiste de verdad al pulsar "Guardar revisión". Cuando el resultado ya
  existe y su estado es "Falla", se habilita la sección de hallazgos: lista
  real de hallazgos con "Editar" (formulario inline con sus datos) y
  "Eliminar" (confirmación + borrado inmediato), y "+ Añadir hallazgo"
  (formulario inline en blanco, reutilizando la sección de hallazgos
  sugeridos de la biblioteca mock ya existente). Cada acción sobre un
  hallazgo persiste de inmediato, sin depender del botón "Guardar revisión".
  Si la URL trae `?hallazgo=ID`, ese hallazgo se abre ya en modo edición.
- **Progreso real**: `auditorias-listado` y `auditoria-progreso` calculan
  `% revisado` y `fallosPorSeveridad` sobre `Resultado`/`Hallazgo` reales
  (Dexie), no sobre `MockDataService`. `fallosPorSeveridad` pasa a contar
  cada hallazgo individualmente (dos hallazgos "alta" en el mismo criterio
  suman 2).
- **`00-producto.md §6`** se actualiza para documentar la entidad `Hallazgo`
  y los campos actuales de `Resultado` y `Evidencia` — ver "Decisiones
  tomadas y descartadas".
- Los hallazgos ya guardados de un criterio se conservan aunque su estado
  cambie a algo distinto de "Falla" (no se borran).
- Un criterio se puede guardar como "Falla" sin ningún hallazgo todavía.

## Qué NO entra todavía

- **Persistencia real de `Evidencia`** (adjuntar capturas): sigue sin
  implementarse. Cuando llegue, la subida de archivos deberá ofrecer una
  alternativa accesible por teclado (`<input type="file">`), nunca solo
  drag & drop — instrucción explícita del usuario para esa rebanada futura.
  El aviso actual en `criterio-revision.html` ("estará disponible en la
  rebanada 06-checklist-manual") se corrige para no prometer una fecha que
  ya no aplica.
- **Catálogo de componentes real**: `Componente` sigue siendo mock
  (`07-catalogo-componentes`); el desplegable de componentes en
  `criterio-revision` sigue leyendo de `MockDataService.componentes()`.
- **Biblioteca de hallazgos real**: `HallazgoPlantilla` sigue siendo mock
  (`08-biblioteca-hallazgos`); las sugerencias y "usar esta redacción" siguen
  operando sobre `MockDataService.hallazgosPlantilla*`, solo que ahora el
  resultado de "usar/añadir" se persiste como un `Hallazgo` real.
- Exportación (Excel/PDF), escaneo automático con axe-core y el resto del
  panel de progreso más allá de `% revisado` y `fallosPorSeveridad` (ranking
  de páginas con más incidencias, ya real, es lo único que toca esta
  rebanada en esa pantalla) — llegan en `09-exportacion`, `10-escaneo-axe`,
  `11-panel-progreso`.
- Filtros nuevos en el checklist: los que ya existen (nivel/categoría/
  estado/severidad) siguen igual, solo que ahora leen datos reales.
- Rutas o pantallas nuevas por hallazgo: el CRUD de hallazgos vive dentro de
  `criterio-revision` y del collapse de `pagina-checklist`, no en rutas
  propias.

## Modelo de datos que toca

- **`Resultado`** (`src/app/core/models.ts`): se le quitan `severidad`,
  `componente_id` y `hallazgo_plantilla_id`. Campos finales: `id?`,
  `pagina_id`, `criterio_codigo`, `estado`, `notas`, `origen`,
  `fecha_revision?`.
- **`Hallazgo`** (nueva entidad): `id?`, `resultado_id`, `severidad`,
  `componente_id?` (referencia al catálogo mock hasta 07), `notas`,
  `hallazgo_plantilla_id?` (referencia a la biblioteca mock hasta 08),
  `fecha_creacion`.
- **Esquema Dexie** (`src/app/core/database.ts`): `version(2).stores()`
  añade la tabla `hallazgos: '++id, resultado_id, severidad, componente_id,
  hallazgo_plantilla_id'` y redeclara `resultados: '++id, pagina_id,
  criterio_codigo, estado'` (pierde los índices de los campos que se mudan a
  `Hallazgo`).
- **`00-producto.md §6`**: se documenta `Hallazgo` como entidad nueva y se
  actualizan las descripciones de `Resultado` y `Evidencia` (esta última
  pasa a colgar conceptualmente de `hallazgo_id` en el modelo, aunque su
  persistencia real no entra en esta rebanada).

## Plan de implementación

1. **`00-producto.md §6`**: añadir `Hallazgo`, actualizar `Resultado` y
   `Evidencia` (FK a `hallazgo_id`) según el modelo de datos de arriba.
2. **`models.ts`**: nueva interfaz `Hallazgo`; recortar `Resultado`.
3. **`database.ts`**: `version(2).stores()` con la tabla `hallazgos` y el
   `resultados` recortado, sin tocar el resto de tablas.
4. **`ResultadosService`** (`src/app/core/resultados.ts`): `dePagina$(paginaId)`,
   `porPaginaYCriterio$(paginaId, criterioCodigo)`, `guardar(paginaId,
   criterioCodigo, cambios)` (upsert). Tests unitarios del upsert (crear y
   actualizar).
5. **`HallazgosService`** (`src/app/core/hallazgos.ts`): `dePagina$(paginaId)`
   (todos los hallazgos de los resultados de esa página), `deResultado$
   (resultadoId)`, `crear()`, `actualizar()`, `eliminar()`. Tests unitarios.
6. **`MockDataService`**: eliminar `resultadosData`, `evidenciasData`,
   `resultadosDePagina()`, `resultado()`, `evidenciasDeResultado()` y
   `progresoDeAuditoria()`. Mantener `hallazgosPlantillaData`,
   `componentesData` y sus métodos tal cual (07/08).
7. **Progreso real**: nuevo cálculo (p. ej. `core/progreso.ts`) que combine
   `CriteriosWcagService.todos()`, `ResultadosService.dePagina$` y
   `HallazgosService.dePagina$` por página, devolviendo `{ totalCriterios,
   revisados, porcentajeRevisado, fallosPorSeveridad }` con
   `fallosPorSeveridad` contado por hallazgo.
8. **`auditorias-listado.ts`** y **`auditoria-progreso.ts`**: sustituir las
   llamadas a `mockData.progresoDeAuditoria`/`resultadosDePagina` por el
   cálculo reactivo real del paso 7.
9. **`pagina-checklist.ts`/`.html`**: filas reactivas combinando
   `criteriosWcag.todos()` con `ResultadosService.dePagina$` y
   `HallazgosService.dePagina$`; toggle de expandir/colapsar por fila en
   "Falla" con resumen de hallazgos, enlace "Editar" (`?hallazgo=id`) y
   botón "Eliminar" con confirmación.
10. **`criterio-revision.ts`/`.html`**:
    - Formulario superior (estado + nota general) persiste con
      `ResultadosService.guardar()` en "Guardar revisión".
    - Sección de hallazgos (habilitada solo si el resultado existe y su
      estado es "Falla"): lista real vía `HallazgosService.deResultado$`,
      con "Editar"/"Eliminar"/"+ Añadir hallazgo" persistiendo de inmediato.
    - Soporte de `?hallazgo=ID` en la ruta para abrir un hallazgo en modo
      edición al cargar.
    - Corregir el aviso de capturas (ver "Qué NO entra todavía").
11. **Verificación de accesibilidad**: el toggle de expandir/colapsar con
    `aria-expanded`/`aria-controls`; revisión con teclado y un escaneo de
    axe (extensión de navegador) sobre `pagina-checklist` (con una fila
    expandida) y `criterio-revision` (con la sección de hallazgos visible).

## Criterios de aceptación

- Marcar un criterio como "Falla" y guardar persiste el estado; recargar
  (F5) no lo pierde.
- Añadir dos hallazgos con severidades distintas a un mismo criterio en
  "Falla" persiste ambos; recargar los mantiene.
- La fila del criterio en el checklist muestra un control de expandir/
  colapsar solo cuando el criterio está en "Falla"; al expandirlo se listan
  sus hallazgos guardados (severidad, componente si tiene, inicio de la
  nota).
- Eliminar un hallazgo desde el collapse de la tabla (con confirmación) lo
  quita de la lista y de Dexie, sin afectar a los demás hallazgos del mismo
  criterio.
- Editar un hallazgo (desde el collapse o desde `criterio-revision`)
  actualiza sus datos sin duplicar el registro.
- Cambiar el estado de un criterio de "Falla" a "Pasa"/"No aplica"/"Por
  revisar" oculta la sección de hallazgos pero no los borra: al volver a
  marcar "Falla" reaparecen.
- Se puede guardar un criterio como "Falla" sin ningún hallazgo todavía.
- El panel de progreso (`/auditorias/:id/progreso`) y el listado de
  auditorías calculan `% revisado` y `fallosPorSeveridad` sobre datos reales
  (`Resultado`/`Hallazgo` en Dexie).
- `fallosPorSeveridad` cuenta cada hallazgo individualmente (dos hallazgos
  "alta" en el mismo criterio suman 2, no 1).
- `mock-data.ts` ya no declara `resultadosData` ni `evidenciasData`, ni los
  métodos `resultadosDePagina()`, `resultado()`, `evidenciasDeResultado()`,
  `progresoDeAuditoria()`.
- `00-producto.md §6` documenta la entidad `Hallazgo` y refleja los campos
  actuales de `Resultado` y `Evidencia`.
- `npm run lint` y `npm test` corren sin fallos.
- Un escaneo de axe (extensión de navegador) sobre el checklist (con al
  menos una fila expandida) y sobre `criterio-revision` (con la sección de
  hallazgos visible) no devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Nueva entidad `Hallazgo`** en vez de un array embebido dentro de
  `Resultado`: permite CRUD individual (crear/editar/borrar un hallazgo
  suelto) e indexar por severidad/componente con Dexie — decisión explícita
  del usuario.
- **Evidencia pasa a colgar conceptualmente de `hallazgo_id`** en el modelo
  de producto actualizado (cada captura documenta un error concreto, no
  todo el criterio), pero su persistencia real queda fuera de esta
  rebanada — decisión explícita del usuario. Cuando se implemente, la
  subida de archivos deberá tener una alternativa accesible por teclado
  (`<input type="file">`), nunca solo drag & drop — instrucción explícita
  del usuario para esa rebanada futura.
- **`00-producto.md §6` se actualiza en esta misma rebanada** en vez de
  dejarlo desincronizado — decisión explícita del usuario, según la regla
  de `CLAUDE.md` de no divergir en silencio del documento de producto.
- **Los hallazgos se conservan al cambiar el estado del criterio fuera de
  "Falla"**, en vez de borrarse en cascada — decisión explícita del
  usuario, evita perder trabajo por un cambio de estado accidental.
- **"Falla" no exige ningún hallazgo para poder guardarse** — decisión
  explícita del usuario, coherente con que hoy nada en el formulario es
  obligatorio salvo el estado.
- **CRUD de hallazgos inline en `criterio-revision`** (extendiendo el toggle
  "Añadir hallazgo nuevo" que ya existe en el código, hoy solo en memoria),
  en vez de pantallas/rutas nuevas por hallazgo — decisión explícita del
  usuario; evita añadir rutas y mantiene la revisión de un criterio en una
  sola pantalla.
- **El collapse de la tabla del checklist permite editar (enlace a
  `criterio-revision`) y eliminar directamente**, en vez de ser de solo
  lectura — decisión explícita del usuario; el borrado reutiliza el patrón
  `window.confirm()` ya usado para auditorías/páginas
  (`05-auditorias-paginas.md`).
- **Las acciones sobre un hallazgo (crear/editar/eliminar) persisten de
  inmediato**, independientes del botón "Guardar revisión" del resultado:
  evita un estado "borrador" complejo con varios hallazgos sin guardar a la
  vez; el estado/nota general del criterio conserva su propio guardado
  explícito.
- **La sección de hallazgos solo se habilita cuando el resultado ya existe
  en Dexie con estado "Falla"** (hay que pulsar "Guardar revisión" primero):
  evita gestionar hallazgos huérfanos de un resultado que aún no existe.
- **`fallosPorSeveridad` pasa a contar por hallazgo en vez de por
  resultado**: consecuencia directa de permitir varios hallazgos por
  criterio; ya no equivale a "número de criterios en Falla".

## Riesgos identificados

- Cambio de esquema Dexie (nueva tabla `hallazgos`, índices reducidos en
  `resultados`): si ya hay auditorías/páginas reales creadas en el navegador
  de desarrollo (`05-auditorias-paginas.md`), abrir con `version(2)` debe
  migrar sin perder esos datos — verificar con una base de datos existente
  antes de dar la rebanada por terminada.
- `auditoria-progreso.ts` y `auditorias-listado.ts` pasan de una llamada
  síncrona (`mockData.progresoDeAuditoria`) a datos reactivos combinados de
  dos tablas Dexie (`resultados` + `hallazgos`); revisar que no aparezcan
  estados intermedios rotos (progreso en 0 parpadeando) durante el primer
  render — mismo riesgo ya señalado en `05-auditorias-paginas.md` para otras
  pantallas.
- El aviso "Adjuntar capturas estará disponible en la rebanada
  06-checklist-manual" en `criterio-revision.html` deja de ser cierto y hay
  que corregirlo para no prometer una fecha que ya no aplica.
