# 21 — Elegir una redacción desde la biblioteca de hallazgos

**Estado:** Implemented
**Depende de:** Spec 08 (Biblioteca de hallazgos)
**Fecha:** 2026-09-18

## Objetivo de esta rebanada

Hasta ahora, "Ver en la biblioteca" (en cada hallazgo sugerido de
`criterio-revision`) llevaba al formulario de edición de esa plantilla
(`/biblioteca/:id`), sin forma de volver ni de reutilizar nada. Además, solo
aparecía cuando había sugerencias, que exigen un componente elegido y una
coincidencia exacta de criterio + componente. Esta rebanada convierte "Ver en
la biblioteca" en la vía para elegir **cualquier** redacción de la biblioteca
y volver al hallazgo con ella aplicada.

## Qué entra

- **`criterio-revision`**: un único enlace "Ver en la biblioteca" en el
  formulario de hallazgo (nuevo y en edición), siempre visible (haya o no
  sugerencias), en lugar de uno por sugerencia. Lleva a
  `/biblioteca?auditoria=&pagina=&criterio=` (+ `hallazgo=` si se editaba
  uno existente, + `componente=` si había uno elegido). Un texto asociado
  (`aria-describedby`) avisa de que los cambios sin guardar del hallazgo se
  pierden.
- **`biblioteca-listado` en modo "elegir redacción"** (solo con esos query
  params): recuadro "Elige una redacción" con enlace "Volver al criterio sin
  elegir"; filtro de criterio preseleccionado con el criterio en revisión
  (se puede cambiar a "Todos"); botón "Usar esta redacción" en cada tarjeta.
  Sin esos query params la pantalla no cambia.
- **Vuelta con `?plantilla=ID`**: `criterio-revision` pone el estado en
  "Falla", abre el hallazgo (el de `?hallazgo=` en edición, o uno nuevo con
  el componente de `?componente=`) y aplica la plantilla igual que "Usar
  esta redacción" (severidad, notas, solución, `hallazgo_plantilla_id`;
  `incrementarUso` al guardar, como en la spec 08). Anuncia el cambio por
  `ToastService` y retira `plantilla`/`componente` de la URL (`replaceUrl`)
  para que recargar no la vuelva a aplicar.
- **`HallazgosPlantillaService.porId(id)`**: lectura puntual de una plantilla.

## Qué NO entra todavía

- Conservar lo escrito en el formulario (ni las imágenes de evidencia
  pendientes) al ir a la biblioteca y volver: se avisa de la pérdida en vez
  de guardar un borrador.
- Elegir la redacción en un diálogo sin salir de `criterio-revision`.
- Buscador de texto en la biblioteca (sigue fuera, como en la spec 08).

## Modelo de datos que toca

Ninguna entidad nueva ni campos nuevos: solo lectura de `HallazgoPlantilla`
por id, y la escritura de `Hallazgo`/`veces_usado` ya existente de la spec 08.

## Criterios de aceptación

- "Ver en la biblioteca" abre `/biblioteca` con el recuadro "Elige una
  redacción" y el filtro Criterio mostrando el criterio en revisión.
- "Usar esta redacción" vuelve al criterio con "Falla" seleccionado y el
  formulario "Nuevo hallazgo" relleno con la plantilla; la URL ya no lleva
  `plantilla=`.
- Si se partió de un hallazgo existente en edición, se vuelve a ese hallazgo
  en edición con la plantilla aplicada (no se abre uno nuevo).
- "Volver al criterio sin elegir" regresa sin aplicar nada.
- Fuera del modo selección, `/biblioteca` no muestra "Usar esta redacción".
- Si la plantilla se eliminó entretanto, se abre el formulario sin rellenar
  y se anuncia que la redacción ya no está en la biblioteca.
- `npm run lint`, `npm test` y `npx playwright test` sin fallos
  (`e2e/elegir-desde-biblioteca.spec.ts`); axe sin violaciones WCAG 2.2 A/AA
  en `criterio-revision` (formulario nuevo abierto) y en `/biblioteca` en
  modo selección.
