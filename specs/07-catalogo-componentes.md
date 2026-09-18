# 07 — Catálogo de componentes: seed Bootstrap + añadir propios

**Estado:** Implemented
**Depende de:** Spec 01 (Fundación), Spec 06 (Checklist manual)
**Fecha:** 2026-09-16

## Objetivo de esta rebanada

Sustituir el catálogo mock de `Componente` (`MockDataService.componentesData`)
por persistencia real en Dexie, sembrado con el catálogo por defecto de
Bootstrap, permitiendo añadir componentes propios y gestionar el catálogo
(renombrar, ocultar/mostrar, borrar) — para que el desplegable de
"Componente afectado" en `criterio-revision` y la pantalla `/componentes`
dejen de depender de datos ficticios.

## Qué entra

- **`ComponentesService`** (`src/app/core/componentes.ts`): real sobre
  `database.db.componentes` (tabla ya declarada desde `01-fundacion.md`, sin
  migración de esquema necesaria). Siembra el catálogo Bootstrap la primera
  vez que arranca la app con una base de datos vacía (mismo patrón de
  sembrado que `CriteriosWcagService.sembrarCatalogo()`, pero aquí los datos
  sembrados se leen y escriben en tiempo real desde Dexie, porque a
  diferencia del catálogo WCAG este catálogo sí es mutable). Lectura
  reactiva (`todos$()`, `visibles$()`) y escritura: `crear(nombre)` (siempre
  `origen: 'personalizado'`, `visible: true`), `renombrar(id, nombre)`,
  `alternarVisible(id, visible)`, `eliminar(id)`.
- **`src/app/core/componentes-catalogo.ts`**: dataset estático del catálogo
  por defecto de Bootstrap — los mismos 30 componentes e ids 1-30 que hoy
  viven en `MockDataService.componentesData`, para no romper las
  referencias `componente_id` que ya usa `HallazgoPlantilla` mock (sigue
  mock hasta `08-biblioteca-hallazgos`).
- **`criterio-revision`**: el desplegable "Componente afectado" pasa a leer
  `ComponentesService.visibles$()` en vez de `mockData.componentes()`; el
  nombre mostrado junto a cada hallazgo ya guardado (`componenteNombre()`)
  resuelve contra `ComponentesService.todos$()`, para seguir mostrando el
  nombre aunque el componente se haya ocultado después.
- **`componentes-listado`** pasa de solo lectura a pantalla de gestión real:
  - Lista los componentes Bootstrap y los personalizados por separado (ya
    existente), leyendo datos reales de Dexie.
  - Formulario para añadir un componente propio (nombre).
  - Cada componente Bootstrap: botón "Ocultar"/"Mostrar" (alterna
    `visible`); sin opción de renombrar ni borrar.
  - Cada componente personalizado: "Renombrar" (formulario inline, mismo
    patrón de edición en línea que los hallazgos de `criterio-revision`),
    "Ocultar"/"Mostrar" y "Eliminar" (con `window.confirm()`, mismo patrón
    que auditorías/páginas/hallazgos).
  - Los componentes ocultos se siguen listando en esta pantalla de gestión
    (marcados como "Oculto"), pero no aparecen en el desplegable de
    `criterio-revision`.
- Dos iconos nuevos en `AppIcon` (`eye`, `eye-off`) para los botones de
  mostrar/ocultar.
- **`MockDataService`**: se elimina `componentesData`, `componentes()` y
  `componente()`. `hallazgosPlantillaData` y sus métodos se mantienen
  igual (siguen mock hasta `08-biblioteca-hallazgos`); sus `componente_id`
  siguen resolviendo porque el catálogo sembrado conserva los mismos ids.

## Qué NO entra todavía

- Biblioteca de hallazgos real (`HallazgoPlantilla`) — sigue mock hasta
  `08-biblioteca-hallazgos`.
- Contador de uso del componente (p. ej. "usado en N hallazgos"): el
  producto solo pide ese contador para `HallazgoPlantilla`
  (`00-producto.md §5.5`), no para `Componente` (§5.6) — no se añade aquí.
- Fusionar componentes duplicados o cualquier deduplicación automática — no
  lo pide `00-producto.md`.
- Cascada o aviso especial al ocultar/borrar un componente ya usado en
  hallazgos existentes: ocultar no borra datos (el `componente_id` del
  hallazgo no cambia) y solo se puede borrar un componente personalizado,
  decisión igual de irreversible que borrar cualquier otra entidad hoy
  (confirmación nativa, sin papelera).
- Exportación, escaneo automático con axe-core y panel de progreso — siguen
  en sus propias rebanadas (`09-exportacion`, `10-escaneo-axe`,
  `14-panel-progreso`).

## Modelo de datos que toca

No introduce entidades nuevas ni cambia los campos de `Componente` (ya
definidos en `00-producto.md §6` y declarados en el esquema Dexie desde
`01-fundacion.md`: `componentes: '++id, nombre, origen, visible'`). El
cambio es de persistencia: pasa de un array en memoria en `MockDataService`
a la tabla real `componentes` de IndexedDB, sembrada una vez con el
catálogo Bootstrap y editable desde la app a partir de esta rebanada.

## Plan de implementación

1. **`componentes-catalogo.ts`**: extraer el array de 30 componentes
   Bootstrap de `mock-data.ts` tal cual (mismos ids) a un dataset exportado
   `CATALOGO_COMPONENTES_BOOTSTRAP`.
2. **`ComponentesService`**: sembrado (`count() === 0` → `bulkPut` del
   dataset anterior), `todos$()` y `visibles$()` con `liveQuery`,
   `crear()`, `renombrar()`, `alternarVisible()`, `eliminar()`. Tests
   unitarios del sembrado (una sola vez) y de las cuatro operaciones de
   escritura.
3. **`MockDataService`**: eliminar `componentesData`, `componentes()` y
   `componente()`; mantener `hallazgosPlantillaData` y sus métodos igual.
4. **`criterio-revision.ts`/`.html`**: sustituir `mockData.componentes()` /
   `mockData.componente()` por `ComponentesService.visibles$()` /
   `todos$()` vía `toSignal`, sin cambiar el resto del formulario de
   hallazgo.
5. **`AppIcon`**: añadir los casos `eye` y `eye-off`.
6. **`componentes-listado.ts`/`.html`**: formulario "Añadir componente" y
   acciones de gestión (ocultar/mostrar/renombrar/eliminar) sobre datos
   reales, con estado vacío igual que hoy para "Personalizados" cuando no
   hay ninguno.
7. **`specs/README.md`**: marcar la fila 07 como "Implemented" y enlazarla.
8. **Verificación de accesibilidad**: formulario de añadir componente,
   botones de acción y formulario de renombrado en línea revisados con
   teclado y un escaneo de axe (extensión de navegador) sobre `/componentes`
   (con el formulario de añadir y una fila en edición visibles) y sobre
   `criterio-revision` (con el desplegable de componente abierto).

## Criterios de aceptación

- Al arrancar la app con una base de datos nueva, la tabla `componentes` de
  IndexedDB contiene los 30 componentes de Bootstrap; no se duplican en
  arranques siguientes.
- El desplegable "Componente afectado" en `criterio-revision` lista los
  componentes visibles reales (Bootstrap + personalizados), no el array
  mock.
- Añadir un componente propio desde `/componentes` lo persiste, aparece en
  "Personalizados" y queda disponible en el desplegable de
  `criterio-revision` sin reiniciar la app.
- Renombrar un componente personalizado actualiza su nombre en la lista y
  en el desplegable; un componente Bootstrap no tiene opción de renombrar.
- Ocultar un componente (Bootstrap o personalizado) lo quita del
  desplegable de `criterio-revision`, pero sigue listado (marcado como
  oculto) en `/componentes`, y su nombre se sigue mostrando en los
  hallazgos que ya lo tenían asignado.
- Volver a mostrar un componente oculto lo devuelve al desplegable.
- Eliminar un componente personalizado (con confirmación) lo borra de Dexie
  y de la lista; un componente Bootstrap no tiene opción de eliminar.
- Recargar la página (F5) conserva todos los cambios anteriores.
- `mock-data.ts` ya no declara `componentesData` ni los métodos
  `componentes()`/`componente()`.
- `npm run lint` y `npm test` corren sin fallos.
- Un escaneo de axe (extensión de navegador) sobre `/componentes` y sobre
  `criterio-revision` (con el desplegable de componente) no devuelve
  errores críticos.

## Decisiones tomadas y descartadas

- **Mismos ids que el mock para el catálogo Bootstrap sembrado**: evita
  romper las referencias `componente_id` que ya usa `HallazgoPlantilla`
  mock en `mock-data.ts`, que sigue siendo mock hasta
  `08-biblioteca-hallazgos`.
- **Sembrado real en la tabla `componentes` de Dexie, en vez de un array
  estático en memoria** como hace `CriteriosWcagService` con el catálogo
  WCAG: el catálogo WCAG nunca cambia en tiempo de ejecución, pero
  `Componente` sí (añadir, renombrar, ocultar, borrar desde la propia app),
  así que necesita ser una tabla editable real desde el primer momento.
- **Bootstrap solo se puede ocultar, nunca borrar ni renombrar**: es
  literalmente lo que pide `00-producto.md §5.6` ("los del catálogo base de
  Bootstrap no se pueden borrar, solo ocultar"); se extiende la misma
  restricción a renombrar porque no tiene sentido product-wise renombrar un
  componente de un catálogo de referencia externo.
- **Sin componente de diálogo modal propio**: mismo patrón ya usado en
  auditorías/páginas/hallazgos (`window.confirm()` nativo), coherente con
  la decisión ya tomada en `05-auditorias-paginas.md`.
- **Renombrado inline en la propia fila de `/componentes`**, en vez de una
  pantalla o ruta nueva: mismo patrón que la edición en línea de hallazgos
  en `criterio-revision` (`06-checklist-manual.md`); evita añadir rutas
  para una operación acotada a una sola pantalla.
- **Los componentes ocultos se siguen listando en `/componentes`**
  (marcados como "Oculto") en vez de desaparecer de la gestión: si
  desaparecieran del todo no habría forma de volver a mostrarlos desde la
  interfaz.
- **La restricción "Bootstrap no se puede renombrar/borrar" se aplica en la
  plantilla** (no se muestran esos controles cuando `origen === 'bootstrap'`)
  y no en `ComponentesService`: mismo nivel en el que ya viven otras reglas
  de UI de la app (p. ej. la sección de hallazgos de `criterio-revision`
  solo se habilita según el estado del resultado, no hay guardas en el
  servicio para eso tampoco).

## Riesgos identificados

- Si ya hay hallazgos guardados en Dexie (de pruebas manuales sobre
  `06-checklist-manual.md`) con `componente_id` apuntando a ids del mock
  anterior, deben seguir resolviendo correctamente contra el catálogo
  sembrado real — mismos ids, así que no debería romperse, pero conviene
  verificar con una base de datos existente antes de dar la rebanada por
  terminada.
- Ocultar un componente ya asignado a hallazgos existentes no debe romper
  su visualización en `criterio-revision` (el nombre debe seguir
  resolviendo vía `todos$()`, no `visibles$()`, que es la que filtra por
  visibilidad).
- **Verificación funcional en navegador real**: además de `npm run lint`,
  `npm run build` y `npm test` (31 tests, incluidos los 5 nuevos de
  `ComponentesService`), se ejecutó un flujo completo con Playwright contra
  el servidor de desarrollo (sembrado sin duplicados, añadir, renombrar,
  aparecer/desaparecer del desplegable de `criterio-revision` al
  ocultar/mostrar, eliminar), usando exclusivamente selectores por rol y
  etiqueta accesible (equivalente a navegación por lector de pantalla) y
  sin errores de consola — script ad hoc, no incorporado a `e2e/`. Queda
  pendiente un escaneo de axe dedicado (contraste, validez ARIA más allá
  de roles/etiquetas) con la extensión de navegador, que es un paso manual
  del propio auditor.

## Nota de revisión (2026-09-18) — validación visible en "Nuevo componente"

El campo "Nuevo componente" ya tenía `Validators.required` y
`markAllAsTouched()` en `anadirComponente()`, pero la plantilla no
conectaba ese estado con `app-form-field`: no había `[error]` ni
`required`/`aria-invalid` en el `<input>`, así que al enviar vacío no
pasaba nada visible (el control quedaba `touched`+`invalid` pero sin
mensaje). Se añade el mismo cableado que ya usa `auditoria-nueva.html`
(`[error]` con el mensaje condicionado a `invalid && touched`, `required`,
`[attr.aria-invalid]`) y, para el foco, un `viewChild` del `<input>` que
se enfoca en la rama de error de `anadirComponente()` — mismo patrón que
`enfocarPrimerCampoInvalido()` en `auditoria-nueva.ts`, simplificado a un
único campo.
