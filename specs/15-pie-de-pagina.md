# 15 — Pie de página del shell

**Estado:** Implemented
**Depende de:** Spec 04 (Rediseño Tailwind — introduce el shell)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Añadir un pie de página a las pantallas que cuelgan del shell interno
(Auditorías, Biblioteca, Componentes), con el nombre de la app y el aviso
de derechos reservados. Se comporta como "sticky footer": va al final del
flujo del documento —el contenido lo empuja hacia abajo— y, cuando el
contenido no llena el viewport, queda pegado al borde inferior en vez de
dejar un hueco en blanco debajo.

## Qué entra

- Nuevo componente `AppFooter` (`src/app/shared/ui/footer.ts`), una franja
  fina en flujo normal, montada en `Shell` como último hijo de la columna
  `<main>` — visible en Auditorías, Biblioteca y Componentes.
- El "sticky footer" se resuelve con el layout flex que ya tiene el shell:
  el host del `Shell` y su contenedor usan `min-height: 100%` (no
  `height`), y `<main>` es `flex-1`, así que `<main>` absorbe el espacio
  sobrante y empuja el pie al borde inferior en páginas cortas, mientras
  que en páginas largas el pie baja con el contenido.
- Texto único: "© {año actual} Auditorías A11y. Todos los derechos
  reservados." — el año se calcula en tiempo de ejecución
  (`new Date().getFullYear()`), no queda hardcodeado.
- Elemento `<footer>` nativo (landmark `contentinfo` implícito), sin
  `aria-label` porque es el único pie de página de la pantalla.
- Estilos consistentes con la paleta de marca ya usada en el shell
  (logo, enlace activo del menú, botones primarios): fondo `bg-violet-700`,
  texto `text-white`. Contraste verificado (blanco `#ffffff` sobre
  `rgb(112, 8, 231)`, el violet-700 real de Tailwind v4): **7.30:1**, por
  encima del mínimo AA de 4.5:1 para texto normal (incluso cumple AAA,
  7:1).
- `<main>` no necesita padding inferior extra: el pie ya no se superpone al
  contenido, así que ningún control queda tapado.

## Qué NO entra todavía

- Enlaces o navegación dentro del pie del shell (a diferencia del pie de
  la landing, que sí los tiene) — es solo texto de copyright.
- Cambios en el pie de página de la landing (`specs/04-rediseno-tailwind.md`),
  que sigue siendo su propio pie, con navegación, al final del scroll.
- Un pie siempre visible sobre el contenido (`position: fixed`) ni un
  patrón "auto-hide" al hacer scroll.
- Selector de idioma, tema oscuro u otros enlaces legales (política de
  privacidad, etc.) — no existen todavía en la app.

## Modelo de datos que toca

Ninguno. Cambio puramente de presentación en el shell, sin tocar Dexie ni
ninguna entidad de `00-producto.md`.

## Criterios de aceptación

- En una pantalla del shell cuyo contenido no llena el viewport, el pie
  queda pegado al borde inferior, sin hueco en blanco debajo.
- En una pantalla del shell con contenido más alto que el viewport, el pie
  no se superpone al contenido: queda por debajo de él y solo se ve al
  hacer scroll hasta el final.
- El pie muestra el texto "© {año actual} Auditorías A11y. Todos los
  derechos reservados.", con el año calculado dinámicamente.
- El pie es un elemento `<footer>` (landmark `contentinfo`), detectable
  por lectores de pantalla al navegar por regiones.
- Ningún control interactivo queda oculto o parcialmente tapado detrás del
  pie en ninguna pantalla del shell.
- El contraste entre el texto (blanco) y el fondo (`bg-violet-700`) del pie
  cumple WCAG 2.2 AA (mínimo 4.5:1 para texto normal) — verificado en
  7.30:1.
- La landing (`/bienvenida`) no muestra el pie del shell — conserva su
  propio pie de página existente, sin cambios.
- `npm run lint` y `npm test` pasan sin fallos.
- Un escaneo de axe (extensión de navegador) sobre cualquier pantalla del
  shell con el pie visible no devuelve errores críticos.

## Nota de revisión (2026-09-18)

La primera implementación de esta rebanada usó `position: fixed`, que
tapaba el contenido y obligaba a compensar con `pb-16` en `<main>`. Se
cambió al patrón "sticky footer" descrito arriba: el pie lo empuja el
contenido y solo se pega al borde inferior cuando la página es corta.

Se eliminó `AppToastHost` (componente visual de `ToastService`, introducido
en `specs/04-rediseno-tailwind.md`). `ToastService.mostrar()` sigue
anunciando por `LiveAnnouncer`,
pero al no haber banner visual ya no hay superposición que evitar con el
pie de página; las referencias a `AppToastHost` y a su offset `bottom-16`
se retiraron de esta rebanada.

*Actualización (informe de la spec 22, P4):* `AppToastHost` vuelve (ver
la nota de `specs/04-rediseno-tailwind.md`). Es `position: fixed` con
`bottom-16`, así que queda por encima del pie sin taparlo y no cambia el
patrón "sticky footer": no ocupa sitio en el flujo ni necesita
`padding` en `<main>`.
