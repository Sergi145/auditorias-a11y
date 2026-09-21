# 23 — Paginación accesible del listado de auditorías

**Estado:** Implemented
**Depende de:** Spec 04 (componentes propios + Tailwind), Spec 05 (CRUD de auditorías)
**Fecha:** 2026-09-21

## Objetivo de esta rebanada

Añadir un componente de paginación propio y accesible (WCAG 2.2 AA),
`AppPaginacion`, que aparece en `/auditorias` cuando hay más de 9 tarjetas y
muestra 9 auditorías por página.

## Qué entra

- **`AppPaginacion`** (`src/app/shared/ui/paginacion.ts`), genérico y sin
  conocimiento de auditorías. Inputs: `total`, `porPagina`, `paginaActual` y
  `etiqueta` (nombre accesible del `<nav>`). Solo se renderiza si
  `total > porPagina`.
- **Estructura**: `<nav aria-label="{{ etiqueta }}">` con un `<ul>` que
  contiene "Anterior", los números de página y "Siguiente".
- **Enlaces, no botones**: cada control es un
  `<a routerLink [queryParams]="{ pagina }" queryParamsHandling="merge">`.
  La página 1 se enlaza sin `pagina` (`pagina: null`), así que la URL
  canónica de la primera página es `/auditorias`.
- **Página actual**: enlace con `aria-current="page"`, distinguido con fondo
  y peso de fuente (no solo con color, WCAG 1.4.1).
- **Nombre accesible de cada número**: "Página N" (el texto "Página" en
  `sr-only`, el número visible).
- **Extremos**: en la página 1, "Anterior" se muestra atenuado como
  `<span role="link" aria-disabled="true">`, fuera del orden de tabulación.
  Lo mismo para "Siguiente" en la última página.
- **Ventana de números**: como máximo 5 huecos numéricos. Con 5 páginas o
  menos se muestran todas. Con más, se muestran la primera, la actual y la
  última, con `…` donde se salten páginas (ej. `1 … 5 … 10`), y en los
  extremos `1 2 3 … 10` / `1 … 8 9 10`. El `…` es un `<li aria-hidden="true">`.
  La lógica vive en una función pura exportada
  `calcularPaginasVisibles(actual, totalPaginas)`, con test unitario.
- **Móvil (por debajo de `sm`)**: "Anterior" y "Siguiente" muestran solo el
  icono, con el texto "Página anterior" / "Página siguiente" en `sr-only`.
  Desde `sm` el texto es visible junto al icono. Todo cabe en una línea a
  320 px, sin scroll horizontal (WCAG 1.4.10).
- **Tamaño de objetivo**: cada control mide al menos 32×32 px en móvil y
  40×40 px desde `sm` (WCAG 2.5.8 exige 24×24). Anillo de foco con la clase
  `foco` existente (WCAG 2.4.7 / 2.4.11).
- **Iconos nuevos** en `src/app/shared/ui/icon.ts`: `chevron-left` y
  `chevron-right`, dibujados a mano como el resto (sin copiar path data de
  sets con licencia).
- **`auditorias-listado`**:
  - Orden: más recientes primero (id descendente), ordenado en el
    componente.
  - Lee `?pagina` de la URL y muestra solo las 9 auditorías de esa página.
  - Normaliza `?pagina` fuera de rango con `router.navigate(..., { replaceUrl: true })`:
    no numérico, 0 o negativo → página 1 (sin param). Mayor que la última →
    última. Esto cubre también borrar una auditoría y dejar vacía la última
    página. Con 9 auditorías o menos, cualquier `?pagina` se retira.
  - Al cambiar de página por acción del usuario (clic, Enter o Atrás/Adelante
    del navegador con el listado ya abierto), el foco va al `<h1>`
    "Auditorías" (`tabindex="-1"`), y `LiveAnnouncer` anuncia
    "Página 2 de 4. Auditorías 10 a 18 de 30.". La normalización de la URL
    no mueve el foco ni anuncia nada.
- **`Shell`** (`src/app/shared/shell/shell.ts`): deja de mover el foco a
  `#contenido` en un `NavigationEnd` cuya ruta (sin query params ni
  fragmento) es la misma que la de la navegación anterior. Así no pisa el
  foco que pone el listado en el `<h1>`. Entrar en `/auditorias?pagina=2`
  desde otra ruta sigue enfocando `#contenido` como hasta ahora.

## Qué NO entra todavía

- Usar `AppPaginacion` en `/biblioteca` o `/componentes` (otra spec, si
  hace falta).
- Elegir cuántas auditorías se ven por página (fijo en 9).
- Buscador, filtros u otros criterios de orden en el listado de auditorías.
- Scroll infinito o "Cargar más".
- Calcular el progreso solo de las 9 auditorías visibles (se sigue
  calculando el de todas, como ahora).

## Modelo de datos que toca

Ninguno. No hay entidades ni campos nuevos en Dexie. Solo cambia la
presentación de `Auditoria` (orden y recorte). El único estado nuevo es el
query param `pagina` (entero ≥ 2; ausente = página 1).

```ts
// src/app/shared/ui/paginacion.ts
export type HuecoPaginacion = number | 'salto'; // 'salto' se pinta como "…"
export function calcularPaginasVisibles(actual: number, totalPaginas: number): HuecoPaginacion[];
```

## Plan de implementación

1. Añadir `chevron-left` y `chevron-right` a `icon.ts`.
2. Crear `calcularPaginasVisibles` en `paginacion.ts` con sus tests en
   `paginacion.spec.ts`: 1–5 páginas, página en el centro, primeros y
   últimos huecos.
3. Crear el componente `AppPaginacion` en el mismo archivo: `<nav>`, enlaces,
   `aria-current`, extremos deshabilitados y variante móvil. Añadir tests de
   render (nombre accesible, `aria-current`, extremos, no renderiza con
   `total <= porPagina`).
4. Ajustar `Shell` para no mover el foco en navegaciones a la misma ruta.
   Ejecutar `e2e/shell.spec.ts`, `e2e/elegir-desde-biblioteca.spec.ts` y
   `e2e/recorridos-usuario.spec.ts` para confirmar que no se rompe nada.
5. En `auditorias-listado`: ordenar por id descendente, leer `?pagina`,
   recortar a 9 y pintar `<app-paginacion etiqueta="Paginación de auditorías">`
   debajo de la lista.
6. En `auditorias-listado`: normalizar `?pagina` fuera de rango, mover el
   foco al `<h1>` y anunciar el cambio con `LiveAnnouncer`.
7. Crear `e2e/paginacion-auditorias.spec.ts` (ver criterios) y añadir la fila
   23 a `specs/README.md`.

## Criterios de aceptación

- [ ] Con 9 auditorías, `/auditorias` no muestra ningún `nav` de paginación.
- [ ] Con 10 auditorías aparece `nav` "Paginación de auditorías". La página 1
      tiene 9 tarjetas y la página 2 tiene 1.
- [ ] La auditoría creada más recientemente aparece la primera de la página 1.
- [ ] El número de la página actual tiene `aria-current="page"` y ningún otro
      control lo tiene.
- [ ] En la página 1, "Anterior" tiene `aria-disabled="true"`, no es un `<a>`
      con `href` y no recibe foco con Tab. Lo mismo para "Siguiente" en la
      última página.
- [ ] Con 10 páginas, estando en la 5, los números visibles son `1 … 5 … 10`.
- [ ] Pulsar "Siguiente" cambia la URL a `/auditorias?pagina=2`, deja el foco
      en el `<h1>` "Auditorías" y anuncia "Página 2 de N. Auditorías 10 a …".
- [ ] Volver a la página 1 deja la URL en `/auditorias` sin `pagina`.
- [ ] Recargar (F5) en `?pagina=2` mantiene la página 2.
- [ ] Atrás del navegador desde `?pagina=2` vuelve a la página 1 con el foco
      en el `<h1>`.
- [ ] `?pagina=abc` y `?pagina=0` muestran la página 1 y la URL queda
      `/auditorias`. `?pagina=99` muestra la última página y corrige la URL.
      En ambos casos, Atrás no vuelve a la URL inválida.
- [ ] Borrar la única auditoría de la última página y volver al listado
      muestra la nueva última página, sin una página vacía.
- [ ] Se puede recorrer y usar la paginación solo con teclado (Tab,
      Shift+Tab, Enter), con el anillo de foco visible en cada control.
- [ ] A 320×640: sin scroll horizontal, la paginación ocupa una sola línea,
      "Anterior"/"Siguiente" tienen nombre accesible "Página anterior" /
      "Página siguiente" y cada control mide al menos 32×32 px.
- [ ] Axe (WCAG 2.2 A/AA) sin violaciones en `/auditorias` con paginación,
      en escritorio y a 320 px.
- [ ] Entrar en `/auditorias?pagina=2` desde otra pantalla sigue enfocando
      `#contenido`, como el resto de navegaciones (sin cambio en el Shell para
      rutas distintas).
- [ ] `npm run lint`, `npm test` y `npx playwright test` sin fallos
      (incluidos `e2e/paginacion-auditorias.spec.ts`, `e2e/shell.spec.ts`,
      `e2e/elegir-desde-biblioteca.spec.ts` y
      `e2e/recorridos-usuario.spec.ts`).

## Decisiones

- **Sí:** página en el query param `?pagina=N`. Sobrevive a F5, funciona con
  Atrás/Adelante y la URL se puede compartir.
- **No:** signal interno. Al volver desde el detalle de una auditoría se
  perdería la página.
- **Sí:** enlaces `<a>`. Cambiar de página cambia la URL, así que es
  navegación y no una acción.
- **No:** `<button disabled>`. Semántica de acción, no de navegación.
- **Sí:** extremos visibles pero no interactivos (`aria-disabled`). El control
  no cambia de posición entre páginas.
- **No:** ocultar "Anterior" en la página 1. Los controles se moverían al
  cambiar de página.
- **Sí:** foco en el `<h1>` + anuncio por `LiveAnnouncer`. El usuario de
  teclado o lector de pantalla empieza a leer las tarjetas nuevas desde
  arriba y sabe en qué página está (WCAG 4.1.3).
- **No:** dejar el foco en el control pulsado. Obliga a volver hacia arriba
  con Shift+Tab para leer el contenido.
- **Sí:** normalizar `?pagina` inválido con `replaceUrl`. Sin mensaje de
  error y sin ensuciar el historial.
- **No:** pantalla "Página no encontrada". Un paso extra sin beneficio.
- **Sí:** orden más recientes primero. Con paginación, una auditoría nueva
  acabaría en la última página con el orden actual.
- **Sí:** como máximo 5 huecos numéricos. Con 7 no caben "Anterior", los
  números y "Siguiente" en una línea a 320 px con objetivos de 32 px
  (se planteó "más de 7 páginas" en la conversación; se reduce por reflow).
- **Sí:** objetivos de 32×32 px en móvil y 40×40 px desde `sm`. Cumplen
  WCAG 2.5.8 (AA, 24 px). El nivel AAA de 44 px (2.5.5) no cabría a 320 px.
- **Sí:** componente genérico en `shared/ui`, usado solo en auditorías en
  esta rebanada. Biblioteca y componentes podrán usarlo sin reescribirlo.
- **Sí:** cambio en el `Shell` para navegaciones a la misma ruta. Sin él,
  el `afterNextRender` del Shell mandaría el foco a `#contenido` y
  competiría con el foco en el `<h1>`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El cambio del `Shell` altera el foco en otras navegaciones a la misma ruta (ej. `criterio-revision` retira `plantilla` con `replaceUrl`, spec 21). | Se ejecutan `e2e/shell.spec.ts`, `e2e/elegir-desde-biblioteca.spec.ts` y `e2e/recorridos-usuario.spec.ts` en el paso 4. La variante solo teclado de la spec 22 comprueba que el foco nunca queda en `<body>`. |
| La normalización de `?pagina` y el cambio de página por el usuario se confunden, y se anuncia o se mueve el foco al corregir la URL. | Solo se enfoca y anuncia cuando la página cambia y la URL resultante ya era válida. Hay un criterio de aceptación específico. |
| `LiveAnnouncer` y un toast coinciden (ej. tras borrar una auditoría). | El anuncio de página solo se dispara por cambio de página, no por cambios en el total. |

## Lo que **no** entra en esta spec

- Paginación en `/biblioteca` y `/componentes`.
- Tamaño de página configurable.
- Búsqueda, filtros u otros órdenes en el listado de auditorías.
- Scroll infinito o "Cargar más".
- Optimizar el cálculo de progreso a solo las auditorías visibles.
