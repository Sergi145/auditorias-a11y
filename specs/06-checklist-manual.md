# 06 — Checklist manual: estado, severidad y hallazgos por criterio

**Estado:** Implemented
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
- **Addendum:** el control de expandir/colapsar de `pagina-checklist` solo
  aparece si, además de estar en "Falla", el criterio tiene al menos un
  hallazgo guardado. Antes aparecía con cualquier "Falla" y, si no había
  hallazgos, el collapse expandido mostraba el texto "Todavía no hay
  hallazgos registrados para este criterio."; ese mensaje sobraba porque no
  hay nada que expandir ni editar en ese caso — se quita el control junto
  con el mensaje. Guardar "Falla" sin hallazgos sigue siendo válido (ver
  punto anterior), solo cambia que no se ofrece un collapse vacío en la
  tabla.

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
  `14-panel-progreso`.
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
  colapsar solo cuando el criterio está en "Falla" **y** tiene al menos un
  hallazgo guardado; al expandirlo se listan sus hallazgos (severidad,
  componente si tiene, inicio de la nota). Un criterio en "Falla" sin
  hallazgos todavía no muestra collapse (nada que expandir).
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
- **Se quitó el checkbox "guardar en biblioteca" y el selector "criterio al
  que afecta"** del formulario de hallazgo (existían en el mock de
  `criterio-revision` antes de esta rebanada): un `Hallazgo` real siempre
  cuelga del resultado que se está revisando, y esta rebanada no persiste
  `HallazgoPlantilla` (sigue mock hasta `08-biblioteca-hallazgos`), así que
  ambos campos no hacían nada real — dejarlos habría sido una interacción a
  medias.
- **"Guardar revisión" navega de vuelta al checklist en cualquier estado,
  "Falla" incluido.** (Antes se quedaba en la pantalla en "Falla" para poder
  añadir hallazgos después de guardar; dejó de hacer falta cuando la
  sección de hallazgos pasó a mostrarse sin que el resultado exista en
  Dexie.) La única excepción es que quede un hallazgo abierto sin guardar
  (el nuevo no pasa la validación o hay uno existente en edición): entonces
  se queda para no perderlo.

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

## Arreglos pendientes (detectados en la spec 22)

Ver [22-informe-ux.md](./22-informe-ux.md). Al arreglarlos, quitar los
`test.fixme` correspondientes de `e2e/recorridos-usuario.spec.ts`.

- [x] **P2 (Alta, WCAG 2.4.3, arreglado 2026-09-18):** el foco cae en `<body>` en
  `criterio-revision` al pulsar «Añadir hallazgo», al pulsar «Editar» en un
  hallazgo, al pulsar «Guardar hallazgo» y al eliminar un hallazgo, porque
  el elemento enfocado desaparece. Llevar el foco al primer campo del
  formulario que se abre, a la tarjeta guardada, o al siguiente elemento
  lógico tras eliminar. Mismo problema al pasar de la bienvenida a «Nueva
  auditoría» (fuera del shell).
  *Arreglo:* al abrir el formulario (nuevo o en edición) el foco va a
  «Severidad»; al guardar o cancelar una edición, al «Editar» de esa
  tarjeta; al descartar uno nuevo, a «Añadir hallazgo»; al eliminar, a
  «Añadir hallazgo» en cuanto la tarjeta desaparece de la lista. En el shell,
  el foco al contenido también se aplica a la navegación que lo crea al
  venir de la bienvenida (antes `skip(1)` se la saltaba).
- [x] **P3 (Alta, WCAG 3.3.1 / 4.1.3, arreglado 2026-09-18):** «Guardar revisión» con un hallazgo
  nuevo incompleto guarda «Falla» con 0 hallazgos, anuncia «Revisión
  guardada.» y no marca ni anuncia los errores del hallazgo. Debe validar
  el hallazgo antes de guardar, marcar los campos (`aria-invalid` + mensaje
  visible), llevar el foco al primero y no anunciar que se ha guardado.
  *Arreglo:* con un hallazgo nuevo incompleto, «Guardar revisión» no guarda
  nada; Severidad, Descripción y Título (si se guarda en la biblioteca)
  muestran su error con `aria-invalid`, el foco va al primero y se anuncia
  «El hallazgo no se ha guardado: revisa los campos marcados.». Nuevo botón
  «Descartar hallazgo» para cerrar el formulario sin guardar.
- [x] **P6 (Media, arreglado 2026-09-18):** los desplegables Estado y
  Severidad de `criterio-revision`, la tarjeta del hallazgo y el filtro de
  severidad del checklist mostraban el valor interno (`no_aplica`,
  `critica`). Ahora usan las mismas etiquetas que el resto de pantallas.
- [x] **P8 (Media, arreglado 2026-09-18):** salir de `criterio-revision` con
  un hallazgo a medio redactar no avisaba. Ahora un `canDeactivate`
  (`confirmarSalidaSinGuardar`) pregunta con el modal propio («¿Salir sin
  guardar el hallazgo?») si el formulario abierto ha cambiado desde que se
  abrió (incluidas las imágenes de evidencia), y cerrar o recargar la
  pestaña muestra el aviso del navegador. «Ver en la biblioteca» no
  pregunta porque ya avisa por texto (spec 21).
