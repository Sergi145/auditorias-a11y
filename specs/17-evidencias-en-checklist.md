# 17 — Miniaturas de evidencia en el collapse del checklist

**Estado:** Implemented
**Depende de:** Spec 16 (Evidencia de imagen — `EvidenciasService.deHallazgos$`, esquema v3 de
Dexie y el render de miniaturas de `criterio-revision`), Spec 13 (capturas automáticas del
escaneo de URL en vivo, que son las `Evidencia` que más veces se querrán ver desde aquí),
Spec 06 (el collapse de hallazgos por fila de `pagina-checklist`)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Hoy las imágenes de evidencia de un hallazgo solo se ven entrando en `criterio-revision`
("Revisar"). Al escanear una página entera con la spec 13 se generan capturas de golpe en
varios criterios, y comprobarlas una a una obliga a entrar y salir de la pantalla de revisión
tantas veces como criterios fallados. Esta rebanada las muestra también en el collapse de
hallazgos del checklist, que es donde se hace la primera pasada de revisión.

## Qué entra

- **Nuevo componente compartido `src/app/features/auditorias/evidencias-miniaturas.ts`**
  (standalone, presentacional): recibe `evidencias: Evidencia[]` por `input()` y pinta la lista
  de miniaturas que hoy vive embebida en la plantilla de `criterio-revision` — cada imagen
  enlazada a su propia `Blob` URL (`target="_blank"`, icono `external-link` y el texto oculto
  "(se abre en una pestaña nueva)"), con `alt` igual a `Evidencia.descripcion`. Es dueño del
  ciclo de vida de sus `URL.createObjectURL()`: las cachea por `Evidencia.id` y las revoca en
  `DestroyRef` (mismo comportamiento que hoy tiene `criterio-revision`, ahora en un solo sitio).
  No pinta nada si la lista llega vacía.
- **`criterio-revision`** pasa a usar ese componente en su tarjeta de lectura, en vez de su
  `<ul>` propio y su `Map<number, string>` de URLs. Cambio de refactor: el marcado renderizado
  y el comportamiento observable quedan iguales (mismos `alt`, mismo `aria-label` de la lista,
  mismo enlace en pestaña nueva).
- **`pagina-checklist`**:
  - Inyecta `EvidenciasService` y deriva las `Evidencia` de todos los hallazgos ya cargados de
    la página (`deHallazgos$` sobre los ids que salen de las filas que ya calcula), con el mismo
    patrón `toObservable` + `switchMap` + `toSignal` que usa `criterio-revision`.
  - En cada tarjeta de hallazgo del collapse, bajo las notas y la solución, pinta
    `<app-evidencias-miniaturas>` con las evidencias de ese hallazgo.
- **Tests**:
  - Unitario de `EvidenciasMiniaturas`: con dos evidencias pinta dos enlaces con sus `alt`; con
    la lista vacía no pinta ninguna lista.
  - e2e (`e2e/evidencia-hallazgo.spec.ts`): tras adjuntar una imagen a un hallazgo, la miniatura
    con su `alt` se ve también al expandir esa fila en el checklist, sin entrar en "Revisar".

## Qué NO entra todavía

- **Adjuntar, editar o borrar evidencias desde el checklist**: el collapse sigue siendo de solo
  lectura para las imágenes; el único punto de edición es `EvidenciasEditor` en
  `criterio-revision` (spec 16). "Editar" en la tarjeta del checklist sigue llevando allí.
- **Lightbox o visor propio**: la miniatura sigue abriendo la imagen en una pestaña nueva, igual
  que en `criterio-revision`. Un visor accesible (focus trap, Esc, navegación entre imágenes)
  es una rebanada aparte si hace falta.
- **Miniaturas en la exportación PDF/Excel** (`specs/09-exportacion.md`): misma exclusión que
  las specs 13 y 16.
- **Cambios en el modelo de datos, en el escaneo o en `EvidenciasService`**: esta rebanada solo
  lee lo que ya existe.
- **Filtrar el checklist por "tiene evidencia"** ni ninguna columna nueva en la tabla.

## Modelo de datos que toca

Ninguno. Lectura pura de `evidencias` (esquema v3, `specs/16-evidencia-imagen-hallazgo.md`) por
`hallazgo_id`.

## Criterios de aceptación

- Con un hallazgo que tiene imágenes de evidencia (adjuntadas a mano o capturadas por el escaneo
  de URL en vivo), expandir su fila en `pagina-checklist` muestra sus miniaturas dentro de la
  tarjeta del hallazgo, con el `alt` de cada una igual a su `descripcion`.
- Un hallazgo sin evidencias se ve exactamente igual que antes de esta rebanada.
- La miniatura abre la imagen completa en una pestaña nueva, y se anuncia como tal al lector de
  pantalla — mismo comportamiento que en `criterio-revision`.
- `criterio-revision` sigue mostrando sus miniaturas igual que antes (mismo `alt`, mismo enlace,
  mismo `aria-label` de la lista); sus e2e de la spec 16 siguen pasando sin tocarlos.
- Expandir y contraer filas repetidamente, o borrar un hallazgo con evidencias, no deja `Blob`
  URLs sin revocar.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- Un escaneo de axe (extensión de navegador) sobre `pagina-checklist` con una fila expandida con
  miniaturas no devuelve errores críticos.
- `specs/README.md` lista la fila 17 como "Implemented".

## Decisiones tomadas y descartadas

- **Sí: extraer un componente compartido** y que `criterio-revision` pase a usarlo. **No:
  duplicar el `<ul>` y el cacheo de `URL.createObjectURL()` en las dos pantallas**: son dos
  sitios donde mantener sincronizados el `alt`, el aviso de "pestaña nueva" y la revocación de
  las URLs — justo lo que no conviene duplicar en una app cuyo objetivo es la accesibilidad.
- **Sí: reutilizar los hallazgos que `pagina-checklist` ya carga** para sacar los ids. **No: una
  consulta nueva de hallazgos** solo para esto: duplicaría una `liveQuery` ya viva en la
  pantalla.
- **Sí: solo lectura en el checklist.** **No: mover el editor de evidencias al collapse**: el
  checklist es la vista de barrido de ~55 criterios; meter ahí un `<input type="file">` por
  hallazgo cargaría la pantalla sin necesidad, y la edición ya tiene su sitio.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| El collapse se pinta con `[hidden]` (no con `@if`, porque `aria-controls` necesita que el `<tr>` exista): las miniaturas de TODOS los criterios en "Falla" de la página se crean aunque no se expanda ninguna fila | Aceptado: una página de auditoría tiene decenas de criterios, no miles, y cada `URL.createObjectURL()` es una referencia barata a un `Blob` que ya está en memoria. Se revocan todas al destruir el componente. Si alguna vez pesa, se corrige creando la URL de forma perezosa, no cambiando el `[hidden]` |
| El refactor de `criterio-revision` cambia sin querer el marcado accesible que ya validó la spec 16 | El componente nuevo nace copiando ese marcado tal cual, y los e2e de la spec 16 se ejecutan sin modificarlos como red de seguridad |
