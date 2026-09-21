# 08 — Biblioteca de hallazgos: guardar y sugerir hallazgos reutilizables

**Estado:** Implemented
**Depende de:** Spec 06 (Checklist manual), Spec 07 (Catálogo de componentes)
**Fecha:** 2026-09-16

## Objetivo de esta rebanada

Sustituir `HallazgoPlantilla` mock (`MockDataService.hallazgosPlantillaData`)
por persistencia real en Dexie: permitir guardar la redacción de un hallazgo
como entrada reutilizable de la biblioteca desde `criterio-revision`, servir
sugerencias reales al marcar un criterio como "Falla" (ya cableado en el
formulario desde `06-checklist-manual.md`, solo cambia el origen de los
datos) y convertir `/biblioteca` y `/biblioteca/:id` en pantallas de gestión
real — última pieza mock que queda en la app tras `05`/`06`/`07`.

## Qué entra

- **`HallazgosPlantillaService`** (`src/app/core/hallazgos-plantilla.ts`):
  real sobre `database.db.hallazgosPlantilla` (tabla ya declarada desde
  `01-fundacion.md`, sin migración de esquema necesaria — mismo caso que
  `componentes` en `07-catalogo-componentes.md`). Sin sembrado (ver
  "Decisiones tomadas y descartadas"): la tabla arranca vacía en una base de
  datos nueva. Lectura reactiva: `todos$()` (listado completo, para
  `/biblioteca`) y `sugeridos$(criterioCodigo, componenteId?)` — mismo
  comportamiento que `MockDataService.hallazgosSugeridosPara()` hoy: si no
  hay `componenteId`, se sugieren todas las plantillas del criterio sin
  filtrar por componente; si lo hay, solo las que tengan exactamente ese
  `componente_id` (las plantillas sin componente asignado no aparecen).
  Escritura: `crear(datos)` (asigna `veces_usado: 0` y `fecha_creacion` internamente),
  `actualizar(id, cambios)`, `eliminar(id)`, `incrementarUso(id)`.
- **`criterio-revision`**:
  - `hallazgosSugeridos()` pasa de `computed()` sobre el array mock a un
    signal derivado de `HallazgosPlantillaService.sugeridos$(...)` (mismo
    patrón `toObservable` + `switchMap` + `toSignal` que ya usa la señal
    `hallazgos` de este mismo componente para datos async dependientes de
    otra señal).
  - Nuevo checkbox "Guardar esta redacción en la biblioteca" en el
    formulario de "+ Añadir hallazgo" (solo al crear un hallazgo nuevo desde
    cero, no al editar uno existente ni cuando ya se partió de una plantilla
    sugerida — ver decisión), con un campo "Título" que aparece y se hace
    obligatorio solo si el checkbox está marcado. El resto de la
    `HallazgoPlantilla` se deriva del propio formulario de hallazgo:
    `criterio_codigo` = criterio actual, `componente_id` = el elegido,
    `descripcion` = las notas escritas, `severidad_tipica` = la severidad
    elegida; `recomendacion_fix` queda vacío y `etiquetas` vacío, editables
    después desde `/biblioteca/:id`.
  - `guardarHallazgo()`: si el checkbox estaba marcado, crea primero la
    `HallazgoPlantilla` y enlaza su id como `hallazgo_plantilla_id` del
    `Hallazgo` que se está creando. Si se crea un hallazgo nuevo que ya trae
    `hallazgo_plantilla_id` (por haber pulsado antes "Usar esta redacción"
    sobre una sugerencia), llama a `incrementarUso()` de esa plantilla una
    sola vez; editar un hallazgo existente nunca vuelve a incrementarla.
- **`biblioteca-listado`** pasa de solo lectura mock a pantalla de gestión
  real:
  - Lee `HallazgosPlantillaService.todos$()`.
  - Filtro por criterio y por componente (selects, mismo patrón de filtros
    en cliente que `pagina-checklist`), cubriendo "filtrar por componente y
    por criterio" de `00-producto.md §5.5`.
  - Botón "Eliminar" con `window.confirm()` (mismo patrón que
    auditorías/páginas/hallazgos/componentes) en cada tarjeta.
- **`hallazgo-detalle`** pasa a editar de verdad: "Guardar cambios" llama a
  `HallazgosPlantillaService.actualizar()` con título/descripción/
  recomendación/severidad típica, muestra un toast y vuelve a `/biblioteca`.
- **Se elimina `MockDataService` y `mock-data.ts` por completo**: tras quitar
  `hallazgosPlantillaData` no queda ningún dato mock en la app; se retiran
  sus imports/inyecciones de `criterio-revision.ts`, `biblioteca-listado.ts`
  y `hallazgo-detalle.ts`.
- **`specs/README.md`**: marcar la fila 08 como "Implemented" y enlazarla.

## Qué NO entra todavía

- **Fusionar plantillas duplicadas** (`00-producto.md §5.5`): exigiría
  reasignar el `hallazgo_plantilla_id` de todos los hallazgos reales que
  usaban cada plantilla fusionada — gestión no trivial que se deja fuera
  para acotar esta rebanada al título exacto de su fila en
  `specs/README.md` ("Guardar y sugerir hallazgos reutilizables").
- **"Actualizar la plantilla original" al editar una redacción reutilizada**
  (bullet marcado "Opcional" en `00-producto.md §5.5`): editar un hallazgo
  que usó una plantilla no propaga el cambio a la plantilla; solo
  `/biblioteca/:id` edita la plantilla en sí.
- **Crear una plantilla nueva directamente desde `/biblioteca`**, sin partir
  de un hallazgo real: el único flujo de creación es el checkbox "guardar en
  biblioteca" al redactar un hallazgo en `criterio-revision`, coherente con
  `00-producto.md §5.5` ("cada vez que se redacta un hallazgo... se puede
  guardar como entrada reutilizable").
- **Editor de etiquetas libres**: `HallazgoPlantilla.etiquetas` se sigue
  mostrando (chips de solo lectura) en `/biblioteca` y `/biblioteca/:id`,
  pero no hay UI para añadir/quitar etiquetas; las plantillas nuevas se
  crean con `etiquetas: []`.
- **Búsqueda por texto libre** en sugerencias o en `/biblioteca`: los
  filtros son por criterio y componente (selects exactos), no un buscador
  de texto/etiqueta.
- **Distinguir "usado en N auditorías" de "usado N veces"**: `veces_usado`
  sigue siendo un contador simple de usos (como ya está en el modelo desde
  `00-producto.md §6`), no un conteo de auditorías distintas.
- Exportación, escaneo automático con axe-core y panel de progreso — siguen
  en sus propias rebanadas (`09-exportacion`, `10-escaneo-axe`,
  `14-panel-progreso`).

## Modelo de datos que toca

No introduce entidades nuevas ni cambia los campos de `HallazgoPlantilla`
(ya definida en `00-producto.md §6` y declarada en el esquema Dexie desde
`01-fundacion.md`: `hallazgosPlantilla: '++id, criterio_codigo,
componente_id'`). El cambio es de persistencia: de un array en memoria en
`MockDataService` a la tabla real, escrita desde `criterio-revision` (crear
y contar usos) y desde `/biblioteca/:id` (editar), y borrada desde
`/biblioteca`.

## Plan de implementación

1. **`HallazgosPlantillaService`**: `todos$()` (`liveQuery` sobre toda la
   tabla), `sugeridos$(criterioCodigo, componenteId?)` (`where('criterio_codigo')`
   + filtro en memoria por `componenteId` con la misma semántica que el mock
   actual), `crear()`, `actualizar()`, `eliminar()`, `incrementarUso(id)`
   (`update(id, { veces_usado: actual + 1 })`). Tests unitarios de los
   filtros de `sugeridos$` (con y sin `componenteId`), `incrementarUso` y las
   cuatro operaciones de escritura.
2. **`mock-data.ts`**: eliminar el archivo completo y sus referencias
   (`MockDataService` deja de inyectarse en ninguna pantalla).
3. **`criterio-revision.ts`/`.html`**: sustituir el origen de
   `hallazgosSugeridos()`; añadir el checkbox "Guardar esta redacción en la
   biblioteca" + campo "Título" condicional en el formulario de hallazgo
   nuevo (validación cruzada: título obligatorio solo si el checkbox está
   marcado); `guardarHallazgo()` crea la plantilla cuando corresponde y
   enlaza `hallazgo_plantilla_id`; incrementa uso cuando se guarda un
   hallazgo nuevo que ya trae `hallazgo_plantilla_id` de una sugerencia
   usada.
4. **`biblioteca-listado.ts`/`.html`**: datos reales, selects de filtro por
   criterio y por componente, botón "Eliminar" con confirmación.
5. **`hallazgo-detalle.ts`/`.html`**: `guardar()` persiste de verdad con
   `HallazgosPlantillaService.actualizar()` y muestra un toast antes de
   navegar a `/biblioteca`.
6. **`specs/README.md`**: marcar la fila 08 como "Implemented" y enlazarla.
7. **Verificación de accesibilidad**: el checkbox y su campo de título
   condicional (etiqueta asociada y anuncio de error si falta el título con
   el checkbox marcado), los selects de filtro en `/biblioteca`, revisados
   con teclado; escaneo de axe (extensión de navegador) sobre `/biblioteca`
   (con filtros aplicados) y sobre `criterio-revision` (con el formulario de
   hallazgo nuevo y el checkbox visibles).

## Criterios de aceptación

- Marcar el checkbox "Guardar esta redacción en la biblioteca" y rellenar el
  título al añadir un hallazgo nuevo persiste tanto el `Hallazgo` como una
  `HallazgoPlantilla` nueva, enlazada por `hallazgo_plantilla_id`.
- Añadir un hallazgo sin marcar el checkbox no crea ninguna
  `HallazgoPlantilla`.
- Al marcar como "Falla" un criterio que coincide con el `criterio_codigo`
  (y `componente_id`, si se elige un componente) de una plantilla ya
  guardada, esa plantilla aparece en "Hallazgos sugeridos de la biblioteca".
- Pulsar "Usar esta redacción" sobre una sugerencia rellena severidad y
  notas del formulario de hallazgo con los datos de la plantilla, editables
  antes de guardar.
- *Añadido 2026-09-18:* tras pulsar "Usar esta redacción", el bloque
  "Hallazgos sugeridos de la biblioteca" desaparece (su descripción ya está
  copiada en "Descripción del hallazgo" y repetirla solo duplicaba texto);
  tampoco se muestra al editar un hallazgo que ya parte de una plantilla. El
  foco pasa al campo "Descripción del hallazgo" (el botón pulsado deja de
  existir) y se anuncia «Redacción «…» aplicada al hallazgo.» por
  `ToastService`. Para cambiar de redacción queda "Ver en la biblioteca"
  (spec 21). Cubierto en `e2e/elegir-desde-biblioteca.spec.ts`.
- *Añadido 2026-09-18 (informe de la spec 22, P6):* el desplegable
  «Severidad típica» de `/biblioteca/:id` muestra etiquetas legibles
  («Crítica», no `critica`), como el resto de pantallas.
- Guardar un hallazgo nuevo que reutiliza una plantilla sugerida incrementa
  `veces_usado` de esa plantilla en 1; editar después ese mismo hallazgo no
  lo vuelve a incrementar.
- `/biblioteca` lista las plantillas reales; en una base de datos nueva la
  lista está vacía (sin datos ficticios). Los filtros por criterio y por
  componente acotan la lista sin recargar la página.
- *Añadido 2026-09-21:* al cambiar cualquiera de los dos selects de filtro
  (también en el modo "elegir redacción" de la spec 21) se anuncia por
  `LiveAnnouncer` (`polite`) cuántos hallazgos han quedado («N hallazgos
  encontrados. Pulsa Tab para recorrerlos.», o que ninguno coincide), y el
  número queda visible sobre la lista. La lista ya no es una región
  `aria-live` (releía todas las tarjetas). Desde el select, Tab lleva al
  primer hallazgo filtrado. Cubierto en `e2e/elegir-desde-biblioteca.spec.ts`.
- *Añadido 2026-09-21:* lo mismo con los hallazgos sugeridos de
  `criterio-revision`: al elegir un "Componente afectado" se anuncia por
  `LiveAnnouncer` (`polite`) cuántas sugerencias han aparecido debajo (o que
  no hay ninguna para ese componente), una vez llega la consulta a Dexie. No
  se anuncia al rellenar el componente por código ni al volver a "Selecciona
  un componente…". Tab desde el select llega al primer "Usar esta
  redacción", cuyo nombre accesible incluye el título y la descripción de
  su sugerencia («Usar esta redacción: título. descripción», vía
  `aria-label` que empieza por el texto visible) para decidir si usarla sin salir del botón; igual en las
  tarjetas de `/biblioteca` en modo "elegir redacción". Va en el nombre y
  no en `aria-describedby` porque varios lectores de pantalla no leen la
  descripción al enfocar.
  Cubierto en `e2e/elegir-desde-biblioteca.spec.ts`.
- Eliminar una plantilla desde `/biblioteca` (con confirmación) la borra de
  Dexie y de la lista.
- Editar una plantilla desde `/biblioteca/:id` y pulsar "Guardar cambios"
  persiste título/descripción/recomendación/severidad típica; recargar (F5)
  conserva el cambio.
- `mock-data.ts` ya no existe y ninguna pantalla importa `MockDataService`.
- `npm run lint` y `npm test` corren sin fallos.
- Un escaneo de axe (extensión de navegador) sobre `/biblioteca` (con los
  filtros visibles) y sobre `criterio-revision` (con el formulario de
  hallazgo nuevo y el checkbox de guardar en biblioteca visibles) no
  devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Sin sembrado de `HallazgoPlantilla`**, a diferencia de WCAG (`03-catalogo-wcag.md`)
  y Bootstrap (`07-catalogo-componentes.md`): esos catálogos son datasets de
  referencia externos, útiles tal cual para cualquier usuario. Los 4
  ejemplos de `mock-data.ts` solo servían para la maqueta navegable; la
  biblioteca real de cada usuario nace vacía y crece con sus propios
  hallazgos — sembrar datos ficticios en la base de datos de un usuario real
  no tiene sentido product-wise.
- **El checkbox "guardar en biblioteca" solo aparece al redactar un hallazgo
  nuevo desde cero**, no al editar uno ya existente ni cuando el hallazgo ya
  trae `hallazgo_plantilla_id` (por haberse creado desde una sugerencia):
  evita generar plantillas duplicadas sin querer solo por ajustar el texto
  de un hallazgo que ya reutilizaba una redacción existente.
- **Los campos de la plantilla se derivan del propio formulario de
  hallazgo** (`descripcion` = notas, `severidad_tipica` = severidad,
  `componente_id` = componente elegido) en vez de pedir un formulario de
  plantilla completo aparte — solo se pide el `titulo` de más. Minimiza la
  fricción de guardar en el momento; `recomendacion_fix` y `etiquetas`
  quedan vacíos, editables después desde `/biblioteca/:id`.
- **`incrementarUso` solo se llama al crear un hallazgo nuevo, nunca al
  editar uno existente**: refleja "número de veces insertada como base de
  un hallazgo nuevo", no "número de veces guardado el formulario"; evita
  inflar el contador cada vez que se pulsa "Guardar hallazgo" al editar.
- **Eliminar una plantilla no toca los hallazgos reales que la
  referenciaron** (su `hallazgo_plantilla_id` queda apuntando a un id que ya
  no existe): mismo principio de "borrar no repara en cascada" que
  `07-catalogo-componentes.md` aplicó a ocultar/borrar un `Componente`; hoy
  la tarjeta de un hallazgo guardado no muestra qué plantilla usó, así que
  no hay nada visible que quede roto.
- **Se elimina `MockDataService`/`mock-data.ts` por completo** en vez de
  dejarlo vacío tras quitar `hallazgosPlantillaData`: ya no queda ningún
  dato mock en la app después de esta rebanada, cierre natural del ciclo
  abierto desde `05-auditorias-paginas.md`.
- **Sin buscador de texto libre ni gestión de etiquetas todavía**: acota
  esta rebanada al título exacto de su fila en `specs/README.md` ("Guardar
  y sugerir hallazgos reutilizables"); el filtrado exacto por criterio y
  componente ya cubre el caso de uso principal de las sugerencias
  automáticas en `criterio-revision`.

## Riesgos identificados

- El checkbox nuevo en el formulario de hallazgo añade un campo condicional
  (`título`, obligatorio solo si el checkbox está marcado): revisar la
  validación cruzada en Reactive Forms y que el error se anuncie
  correctamente si se marca el checkbox y se deja el título vacío.
- `hallazgosPlantilla` es una tabla declarada desde `01-fundacion.md` pero
  sin escritura real hasta ahora — verificar con una base de datos existente
  (de pruebas manuales sobre 06/07) que leer/escribir en ella por primera
  vez no choca con ningún dato residual de pruebas anteriores.
- `criterio-revision.ts` pasa `hallazgosSugeridos` de un `computed()`
  síncrono sobre un array en memoria a un signal derivado de una consulta
  Dexie asíncrona (`toObservable` + `switchMap` + `toSignal`) — revisar que
  no aparezca un parpadeo de "sin sugerencias" al cambiar de componente en
  el desplegable, mismo riesgo ya señalado para otras pantallas en
  `06-checklist-manual.md`.
- **Verificación funcional en navegador real**: además de `npm run lint`,
  `npm run build` y `npm test` (37 tests, incluidos los 6 nuevos de
  `HallazgosPlantillaService`), se ejecutó un flujo completo con Playwright
  contra el servidor de desarrollo (crear un hallazgo marcando "guardar en
  biblioteca", verlo sugerido en un segundo hallazgo del mismo criterio y
  componente, "usar esta redacción", comprobar el incremento de
  `veces_usado`, editar la plantilla y verificar que persiste tras recargar,
  filtrar `/biblioteca` por criterio y por componente, eliminar), usando
  exclusivamente selectores por rol y etiqueta accesible (equivalente a
  navegación por lector de pantalla) y sin errores de consola — script ad
  hoc, no incorporado a `e2e/`. Queda pendiente un escaneo de axe dedicado
  (contraste, validez ARIA más allá de roles/etiquetas) con la extensión de
  navegador, que es un paso manual del propio auditor.
