# 15 — Pie de página fijo del shell

**Estado:** Implemented
**Depende de:** Spec 04 (Rediseño Tailwind — introduce el shell y `AppToastHost`, cuya barra fija inferior este pie de página comparte espacio con)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Añadir un pie de página fijo, siempre visible en la parte inferior del
viewport, a las pantallas que cuelgan del shell interno (Auditorías,
Biblioteca, Componentes), con el nombre de la app y el aviso de derechos
reservados.

## Qué entra

- Nuevo componente `AppFooter` (`src/app/shared/ui/footer.ts`), una franja
  fina fija (`position: fixed`) en la parte inferior del viewport, montada
  en `Shell` — visible en Auditorías, Biblioteca y Componentes.
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
- Ajustes de espacio para que el pie fijo no tape contenido ni se solape
  con otros elementos fijos:
  - `<main>` del shell gana padding inferior adicional (`pb-16`) para que
    el último control de cada pantalla quede siempre visible por encima
    del pie.
  - `AppToastHost` sube su offset inferior (de `bottom-4` a `bottom-16`)
    para que los mensajes de confirmación/error no se superpongan con el
    nuevo pie fijo.

## Qué NO entra todavía

- Enlaces o navegación dentro del pie del shell (a diferencia del pie de
  la landing, que sí los tiene) — es solo texto de copyright.
- Cambios en el pie de página de la landing (`specs/04-rediseno-tailwind.md`),
  que sigue siendo un pie de página normal (no fijo, con navegación) al
  final del scroll.
- Ocultar o colapsar el pie en pantallas muy pequeñas o al hacer scroll
  (patrón "auto-hide").
- Selector de idioma, tema oscuro u otros enlaces legales (política de
  privacidad, etc.) — no existen todavía en la app.

## Modelo de datos que toca

Ninguno. Cambio puramente de presentación en el shell, sin tocar Dexie ni
ninguna entidad de `00-producto.md`.

## Criterios de aceptación

- En cualquier pantalla dentro del shell (Auditorías, Biblioteca,
  Componentes), un pie de página permanece fijo y visible en la parte
  inferior del viewport al hacer scroll del contenido.
- El pie muestra el texto "© {año actual} Auditorías A11y. Todos los
  derechos reservados.", con el año calculado dinámicamente.
- El pie es un elemento `<footer>` (landmark `contentinfo`), detectable
  por lectores de pantalla al navegar por regiones.
- Al hacer scroll hasta el final de cualquier pantalla del shell, ningún
  control interactivo queda oculto o parcialmente tapado detrás del pie
  fijo.
- Al mostrarse un toast (`AppToastHost`) en cualquier pantalla del shell,
  el mensaje no se superpone visualmente con el pie de página.
- El contraste entre el texto (blanco) y el fondo (`bg-violet-700`) del pie
  cumple WCAG 2.2 AA (mínimo 4.5:1 para texto normal) — verificado en
  7.30:1.
- La landing (`/bienvenida`) no muestra el nuevo pie fijo — conserva su
  propio pie de página existente, sin cambios.
- `npm run lint` y `npm test` pasan sin fallos.
- Un escaneo de axe (extensión de navegador) sobre cualquier pantalla del
  shell con el pie visible no devuelve errores críticos.
