# 05 — CRUD de auditorías y páginas

**Estado:** Implemented
**Depende de:** Spec 01 (Fundación), Spec 03 (Catálogo WCAG), Spec 04 (Rediseño Tailwind)
**Fecha:** 2026-09-10

## Objetivo de esta rebanada

Sustituir los datos ficticios de `Auditoria` y `Pagina` en `MockDataService`
por persistencia real en Dexie, con CRUD completo sobre ambas entidades
(crear, editar, cambiar estado y eliminar auditorías; crear, editar y
eliminar páginas), para que la app deje de ser una maqueta navegable en
estas dos entidades y pase a guardar de verdad el trabajo del usuario entre
sesiones.

> **Actualización 2026-09-10:** "Eliminar página" se amplió al alcance de
> esta rebanada tras la aprobación inicial — decisión explícita del
> usuario, ver "Qué entra" y "Decisiones tomadas y descartadas". El resto
> de la spec queda igual.

## Qué entra

- **`AuditoriasService`** (`src/app/core/auditorias.ts`): servicio real sobre
  `database.db.auditorias` (tabla ya declarada desde `01-fundacion.md`).
  Expone lectura reactiva vía `liveQuery` de Dexie (listado completo y por
  id) y las operaciones de escritura: crear, actualizar (datos), cambiar
  estado (`en_progreso` / `completada` / `archivada`) y eliminar.
- **`PaginasService`** (`src/app/core/paginas.ts`): servicio real sobre
  `database.db.paginas`. Lectura reactiva vía `liveQuery` (por auditoría y
  por id) y escritura: crear, actualizar y eliminar.
- **Eliminar página**: borra solo esa página (no afecta a la auditoría ni a
  otras páginas). Se confirma con `window.confirm()` nativo, mismo patrón
  que eliminar auditoría. Botón añadido en `pagina-checklist` (pantalla
  desde la que se navega a esa página).
- **Eliminar auditoría con cascada**: borra la auditoría y todas sus páginas
  asociadas en una misma transacción Dexie. Se confirma con `window.confirm()`
  nativo antes de ejecutar el borrado (sin componente de diálogo modal
  propio — ver "Decisiones tomadas y descartadas").
- **Cambiar estado de una auditoría** desde su pantalla de detalle
  (`en_progreso` / `completada` / `archivada`), persistido de inmediato.
- **Editar auditoría**: nueva pantalla `auditoria-editar` que reutiliza el
  mismo formulario reactivo de `auditoria-nueva` (mismo componente, modo
  edición si la ruta trae `auditoriaId`), ruta
  `/auditorias/:auditoriaId/editar`.
- **Editar página**: nueva pantalla `pagina-editar` que reutiliza el mismo
  formulario reactivo de `pagina-nueva`, ruta
  `/auditorias/:auditoriaId/paginas/:paginaId/editar`.
- **`auditoria-nueva` y `pagina-nueva` pasan a persistir de verdad**: al
  enviar el formulario, se guarda en Dexie vía el servicio correspondiente y
  se navega al id real devuelto (ya no a un id de ejemplo fijo).
- **Migración del resto de pantallas** que hoy leen auditorías/páginas de
  `MockDataService` a los nuevos servicios, con lectura reactiva:
  `auditorias-listado`, `auditoria-detalle`, `auditoria-progreso`,
  `auditoria-exportar`, `pagina-checklist`, `pagina-escaneo`.
- **Estado vacío en `auditorias-listado`**: mensaje + llamada a la acción
  ("Crear auditoría") cuando la tabla `auditorias` está vacía (base de
  datos nueva).
- **`MockDataService.progresoDeAuditoria`** cambia de firma: en vez de
  resolver él mismo las páginas de la auditoría (antes las leía de su propio
  array mock), recibe la lista de páginas ya resuelta por
  `PaginasService` como parámetro. El cálculo en sí (fallos por severidad,
  % revisado sobre `resultadosDePagina`, que sigue siendo mock) no cambia.

## Qué NO entra todavía

- Persistencia real de `Resultado`, `Evidencia`, `HallazgoPlantilla` y
  `Componente` — siguen en `MockDataService` hasta sus propias rebanadas
  (`06-checklist-manual`, `07-catalogo-componentes`,
  `08-biblioteca-hallazgos`).
- Cascada al eliminar página sobre `Resultado`/`Evidencia`: esas entidades
  siguen siendo mock (array en memoria de `MockDataService`, no persistido),
  así que no hay nada real que limpiar todavía — cuando sean reales
  (`06-checklist-manual`), esa cascada se añade en su propia spec.
- Sembrado de datos de ejemplo en Dexie: la app arranca con las tablas
  `auditorias`/`paginas` vacías, sin poblarlas con contenido ficticio (a
  diferencia del catálogo WCAG en `03-catalogo-wcag.md`, que sí se siembra
  por ser un dataset de referencia estático).
- Componente de diálogo modal propio (`AppDialog` o similar) en
  `shared/ui/`: la confirmación de borrado usa `window.confirm()` nativo.
- Gestión de rutas con `auditoriaId`/`paginaId` inexistente (pantalla 404 o
  redirección): se mantiene el comportamiento actual (la plantilla recibe
  `undefined` y no se gestiona explícitamente).
- Escaneo automático real con axe-core y exportación real a Excel/PDF —
  siguen mostrando el aviso de "toast" placeholder (llegan en
  `10-escaneo-axe` y `09-exportacion`).
- Sincronización multi-dispositivo o backend (Fase 2, `00-producto.md §4`).

## Modelo de datos que toca

No introduce entidades nuevas ni cambia los campos de `Auditoria` ni
`Pagina` definidos en `00-producto.md §6` y ya declarados en el esquema
Dexie desde `01-fundacion.md`. El cambio es de persistencia: pasan de un
array en memoria en `MockDataService` a las tablas reales `auditorias` y
`paginas` de IndexedDB, leídas de forma reactiva con `liveQuery`.

## Plan de implementación

1. **`AuditoriasService`** (`src/app/core/auditorias.ts`): `todas$()` y
   `porId$(id)` con `liveQuery`; `crear()`, `actualizar()`,
   `cambiarEstado()`, `eliminar()` (cascada transaccional sobre `paginas`).
   Tests unitarios de las cuatro operaciones de escritura y de la cascada.
2. **`PaginasService`** (`src/app/core/paginas.ts`): `deAuditoria$(auditoriaId)`
   y `porId$(id)` con `liveQuery`; `crear()`, `actualizar()`, `eliminar()`.
   Tests unitarios.
3. **Migrar `MockDataService`**: eliminar `auditoriasData`, `paginasData` y
   los métodos `auditorias()`, `auditoria()`, `paginasDeAuditoria()`,
   `pagina()`. Ajustar `progresoDeAuditoria(auditoriaId, paginas)` a la
   nueva firma descrita arriba.
4. **`auditorias-listado`**: lectura reactiva con `AuditoriasService.todas$`
   combinada con `PaginasService.deAuditoria$` por auditoría para el
   progreso; estado vacío con CTA.
5. **`auditoria-nueva`**: persiste con `AuditoriasService.crear()` y navega
   al id real devuelto por Dexie.
6. **`auditoria-editar`** (nuevo, reutiliza el componente/formulario de
   `auditoria-nueva` en modo edición): ruta
   `/auditorias/:auditoriaId/editar`.
7. **`auditoria-detalle`**: lectura reactiva; añade control para cambiar
   estado y botón "Eliminar auditoría" (`window.confirm()` + cascada).
8. **`pagina-nueva`**: persiste con `PaginasService.crear()`.
9. **`pagina-editar`** (nuevo, reutiliza el componente/formulario de
   `pagina-nueva` en modo edición): ruta
   `/auditorias/:auditoriaId/paginas/:paginaId/editar`.
10. **Migrar `pagina-checklist`, `pagina-escaneo`, `auditoria-progreso`,
    `auditoria-exportar`** de `mockData.auditoria()`/`mockData.pagina()` a
    los nuevos servicios reactivos.
11. **`app.routes.ts`**: añadir las dos rutas de edición nuevas, respetando
    el orden (rutas estáticas antes que las de parámetro, ya documentado en
    el propio archivo).
12. **Eliminar página**: botón en `pagina-checklist` (`window.confirm()` +
    `PaginasService.eliminar()`), navega de vuelta al detalle de la
    auditoría tras borrar.
13. **Verificación de accesibilidad**: los controles nuevos (botones
    eliminar, control de cambio de estado, formularios en modo edición)
    revisados con teclado y un escaneo de axe (extensión de navegador)
    sobre cada pantalla tocada.

## Criterios de aceptación

- Crear una auditoría desde `/auditorias/nueva` la persiste en Dexie
  (visible en la tabla `auditorias` de IndexedDB, herramientas de
  desarrollo) y redirige a `/auditorias/:id` con el id real.
- Recargar la página (F5) después de crear una auditoría y sus páginas no
  las pierde — persistencia real entre sesiones.
- Editar una auditoría existente (nombre, cliente, url, fecha, estándar) se
  refleja en su detalle y en el listado sin recargar.
- Cambiar el estado de una auditoría se refleja en el listado sin recargar.
- Eliminar una auditoría la quita del listado, y sus páginas asociadas
  desaparecen también de la tabla `paginas` de IndexedDB.
- Añadir una página desde el detalle de una auditoría la persiste y aparece
  en ese detalle sin recargar la pantalla.
- Editar una página existente (nombre, url, notas) se refleja en el
  checklist y en el detalle de la auditoría.
- Eliminar una página la quita del detalle de la auditoría y de la tabla
  `paginas` de IndexedDB, sin afectar a la auditoría ni a otras páginas.
- El listado de auditorías muestra un estado vacío con llamada a la acción
  cuando la base de datos no tiene ninguna auditoría todavía.
- `mock-data.ts` ya no declara `auditoriasData` ni `paginasData`, ni los
  métodos `auditorias()`, `auditoria()`, `paginasDeAuditoria()`, `pagina()`.
  El resto de entidades mock (resultados, evidencias, hallazgos,
  componentes) siguen exactamente igual.
- `npm run lint` y `npm test` corren sin fallos.
- Un escaneo de axe (extensión de navegador) sobre las pantallas tocadas
  (listado, detalle, nueva/editar auditoría, nueva/editar página) no
  devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Lectura reactiva con `liveQuery` de Dexie** en vez de consulta puntual
  async/await: ya lo anticipaba `03-catalogo-wcag.md` como el patrón a
  introducir "con la primera entidad mutable real", que es esta rebanada —
  decisión explícita del usuario, confirmada en la definición de esta spec.
- **La app arranca con las tablas `auditorias`/`paginas` vacías**, sin
  sembrar los datos ficticios de la maqueta (`Ayuntamiento de Rivas`, etc.):
  es la primera rebanada en la que estos datos son reales, no una maqueta —
  decisión explícita del usuario.
- **`window.confirm()` nativo para confirmar el borrado** en vez de
  construir un componente de diálogo modal propio en `shared/ui/`: es
  accesible por construcción (gestionado por el navegador) y evita ampliar
  el kit de componentes de `04-rediseno-tailwind.md` en esta rebanada — un
  `AppDialog` con `cdkTrapFocus` queda como candidato a spec futura si se
  necesita en más de un sitio — decisión explícita del usuario.
- **Cascada automática al eliminar una auditoría** (borra sus páginas en la
  misma transacción) en vez de bloquear el borrado hasta vaciar las
  páginas a mano: coherente con el uso individual local-first del MVP
  (`00-producto.md §2`), sin necesidad de la integridad referencial
  estricta de un backend multiusuario — decisión explícita del usuario.
- **Eliminar página se amplió al alcance de esta rebanada** tras la
  aprobación inicial (que la dejaba fuera) — decisión explícita del
  usuario; mismo patrón de confirmación que eliminar auditoría
  (`window.confirm()`), pero sin cascada porque una página no tiene hijas
  reales todavía (los resultados/evidencias que colgarán de ella siguen
  siendo mock).
- **Un mismo componente de formulario sirve para crear y editar** (en
  auditoría y en página) en vez de duplicar plantilla y validaciones: el
  Reactive Form es idéntico: solo cambia si al enviar llama a `crear()` o a
  `actualizar()` según si la ruta trae un id existente.
- **`progresoDeAuditoria` recibe la lista de páginas como parámetro** en vez
  de resolverla él mismo: evita mezclar una lectura async de
  `PaginasService` dentro de un método que el resto de la app sigue
  llamando de forma síncrona para un cálculo puro sobre datos ya
  resueltos por el componente que lo invoca.

## Riesgos identificados

- `auditoria-progreso`, `auditoria-exportar`, `pagina-checklist` y
  `pagina-escaneo` leían la auditoría/página de forma síncrona desde
  `MockDataService`; al migrar a `liveQuery` (asíncrono) cambia el
  momento en que el dato está disponible. Ninguna de estas pantallas
  gestiona hoy el caso "todavía no ha llegado el primer valor" — revisar
  que no aparezca contenido roto (ej. `undefined.nombre`) durante el primer
  render, aunque sea un instante.
- El borrado en cascada de una auditoría con páginas es una operación
  destructiva sin deshacer (no hay backend ni papelera) — el
  `window.confirm()` es la única salvaguarda; si en el futuro se detecta
  que es insuficiente, es motivo para la spec futura del diálogo modal
  propio mencionada arriba.
