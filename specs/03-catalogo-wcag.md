# 03 — Catálogo WCAG 2.2

**Estado:** Implemented
**Depende de:** Spec 01 (Fundación), Spec 02 (Maqueta M3)
**Fecha:** 2026-09-10

## Objetivo de esta rebanada

Sustituir los 8 criterios de ejemplo del `MockDataService` (pensados solo para
recorrer la maqueta de la rebanada 02) por el catálogo real y completo de
criterios de éxito WCAG 2.2, niveles A y AA (AAA queda fuera del alcance del
MVP — ver `00-producto.md §2`). Es la primera rebanada que introduce datos
reales (no ficticios) en la app.

## Qué entra

- Dataset completo de los 55 criterios de éxito WCAG 2.2 de nivel A (31) y AA
  (24) — incluye los heredados de WCAG 2.0/2.1 y los 6 nuevos de 2.2 en ese
  rango de niveles (1.3.4, 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8; AAA
  excluido). Cada entrada: `codigo`, `nombre` (traducción oficial al
  español), `nivel`, `categoria` (perceptible/operable/comprensible/
  robusto), `descripcion` y `tecnicas` (códigos de técnicas suficientes de
  W3C).
- `CriteriosWcagService` (`src/app/core/criterios-wcag.ts`): servicio real
  (no mock) que expone el catálogo — `todos()` y `porCodigo(codigo)` — y lo
  siembra en la tabla `criteriosWCAG` de Dexie (ya declarada desde
  01-fundacion) la primera vez que se arranca la app, para que quede
  persistido y consultable desde IndexedDB, no solo en memoria.
- `MockDataService` deja de tener su propio array de criterios: para el
  cálculo de progreso (`progresoDeAuditoria`) consulta ahora
  `CriteriosWcagService`. El resto de entidades (auditorías, páginas,
  resultados, hallazgos, componentes) siguen siendo mock hasta sus propias
  rebanadas (04+).
- Todas las pantallas que ya mostraban criterios (checklist, revisión de
  criterio, detalle de hallazgo, panel de progreso) pasan a leer del
  catálogo real sin cambios de plantilla ni de comportamiento visible más
  allá de tener las ~55 filas reales en vez de 8.

## Qué NO entra todavía

- Nivel AAA (fuera del alcance normativo del MVP, ver `00-producto.md §2`).
- Persistencia real de auditorías/páginas/resultados/hallazgos/componentes
  (siguen en `MockDataService`; llega en 04-auditorias-paginas y
  05-checklist-manual).
- Lectura reactiva de Dexie (`liveQuery`) desde los componentes: el catálogo
  se consulta de forma síncrona desde el array en memoria del servicio (ver
  "Decisiones tomadas y descartadas"); la app aún no tiene ningún flujo que
  necesite lectura asíncrona de Dexie, eso llega con la primera entidad
  mutable real en 04.
- Edición o gestión del catálogo desde la UI: es un catálogo estático de
  referencia normativa, no editable por el usuario.

## Modelo de datos que toca

- **CriterioWCAG** (ya declarada en `00-producto.md §6` y en el esquema
  Dexie de 01-fundacion): pasa de 8 filas de ejemplo a las 55 filas reales
  de WCAG 2.2 A/AA, sembradas en la tabla `criteriosWCAG` de IndexedDB.
  Ninguna entidad nueva.

## Criterios de aceptación

- El array de datos vive en `src/app/core/wcag-catalogo.ts`, con
  exactamente 55 entradas (31 nivel A + 24 nivel AA), sin duplicados de
  `codigo`.
- Cada entrada tiene `codigo`, `nombre`, `nivel`, `categoria`, `descripcion`
  y al menos una técnica en `tecnicas`.
- Al arrancar la app (`npm start`) y abrir la tabla `criteriosWCAG` de
  IndexedDB en las herramientas de desarrollo, aparecen las 55 filas.
- La pantalla `/auditorias/:id/paginas/:paginaId` (checklist) muestra 55
  filas en vez de 8, y los filtros por nivel/categoría siguen funcionando
  sobre el catálogo completo.
- El panel de progreso (`/auditorias/:id/progreso`) calcula el porcentaje
  revisado sobre el total real de criterios (páginas × 55), no sobre 8.
- `mock-data.ts` ya no declara `criteriosWCAGData` ni los métodos
  `criteriosWCAG()`/`criterio()`.
- `npm run lint` y `npm test` corren sin fallos.

## Decisiones tomadas y descartadas

- **Consulta síncrona desde un array en memoria, con siembra en Dexie como
  efecto secundario, en vez de leer siempre de Dexie vía `liveQuery`**: el
  catálogo es un dataset estático de referencia normativa (no lo edita el
  usuario ni cambia en tiempo de ejecución), así que exponerlo como array
  en memoria evita introducir el primer flujo asíncrono de la app antes de
  que exista una razón real para ello. La siembra en Dexie sí se hace desde
  ahora — la tabla ya estaba declarada desde 01-fundacion — para que el
  catálogo quede realmente persistido y quede disponible para rebanadas
  futuras (p. ej. 09-escaneo-axe, que necesitará mapear resultados de axe-
  core a `criterio_codigo` consultando la misma fuente).
- **Nombres en español según la traducción oficial de W3C** (WCAG 2.2 en
  `w3.org/Translations/WCAG22-es/`), no traducción libre, para que el
  catálogo sea fiable en una auditoría real.
- **Técnicas suficientes abreviadas** (1-3 códigos representativos por
  criterio, no la lista completa de W3C, que puede superar 20 técnicas por
  criterio): suficiente para orientar al auditor sin sobrecargar la UI; se
  puede ampliar en una rebanada futura si hace falta.
- **AAA queda fuera**: ya decidido en `00-producto.md §2`, esta rebanada no
  lo reabre.
