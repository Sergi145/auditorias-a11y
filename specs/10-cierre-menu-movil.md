# 10 — Cierre accesible del menú de navegación móvil

**Estado:** Implemented
**Depende de:** Spec 04 (Rediseño Tailwind — introduce `AppDrawer` con `cdkTrapFocus`)
**Fecha:** 2026-09-17

## Contexto

Auditoría manual del propio shell (dogfooding, ver `CLAUDE.md`) detectó que
el menú de navegación en móvil (`AppDrawer` sobre `<mat-sidenav mode="over">`
original) ya atrapaba el foco y cerraba con Esc y con tap en el fondo, pero
no tenía **ningún botón de cierre visible dentro del panel** — el único
cierre "visible" era un overlay de fondo (`bg-black/40`) sin affordance
propia, lo que deja a quien usa solo teclado o solo lector de pantalla sin
una forma obvia y descubrible de cerrar el menú.

## Qué entra

- Botón de cierre visible dentro del panel de `AppDrawer` en móvil, situado
  antes del contenido de navegación proyectado: icono (`close`, nuevo en
  `AppIcon`) + texto visible "Cerrar menú" (el texto visible es también el
  nombre accesible del botón — evita el antipatrón de un `aria-label` que no
  contiene el texto visible, WCAG 2.5.3).
- `aria-expanded` en el botón hamburguesa (shell y landing, cada uno con su
  propia señal de estado) reflejando si el menú que controla está abierto
  o cerrado, como corresponde a un control disclosure/expandible (WAI-ARIA
  APG — *disclosure pattern*).
- Foco inicial al abrir el menú en móvil: al ser el botón de cierre el
  primer elemento enfocable del panel, `cdkTrapFocusAutoCapture` (ya
  presente) lo enfoca automáticamente sin código adicional.
- Se confirma y se deja como criterio de aceptación explícito el
  comportamiento que ya existía en `AppDrawer`/`Shell` desde la spec 04 y
  que la auditoría también pedía verificar:
  - Cierre con tecla Esc (`(keydown.escape)` en el panel).
  - Foco atrapado dentro del panel mientras está abierto (`cdkTrapFocus`).
  - Al cerrar (por cualquier vía), el foco vuelve al botón hamburguesa que
    abrió el menú (`Shell.onAbiertoChange`).
  - Tap en el fondo oscurecido sigue cerrando el menú, pero queda como
    conveniencia adicional, nunca como único método (ahora coexiste con el
    botón de cierre y con Esc).
- Al elegir una opción de navegación dentro del menú abierto en móvil (shell
  y landing), el menú se cierra: cada enlace lleva
  `(click)="onAbiertoChange(false)"` / `(click)="onMenuAbiertoChange(false)"`.
  Sin esto, tras navegar el menú se queda abierto tapando el contenido nuevo
  hasta que se cierra a mano — landing ya lo hacía para sus enlaces de
  anclaje, pero faltaba en el shell para `/auditorias`, `/biblioteca` y
  `/componentes`.

## Qué NO entra todavía

- Cambios en el drawer de escritorio (barra lateral fija, sin overlay ni
  foco atrapado) — se queda igual, esto es solo comportamiento móvil.
- Rediseño visual del menú más allá de añadir el botón de cierre.
- Gestos táctiles (swipe) para abrir/cerrar el menú.
- Otros diálogos/overlays de la app (futuros modales, etc.) — esta rebanada
  cubre únicamente `AppDrawer`, que hoy solo se usa para la navegación.

## Modelo de datos que toca

Ninguno. Cambio puramente de presentación/interacción en el shell
(`AppDrawer` + `AppIcon`), sin tocar Dexie ni ninguna entidad de
`00-producto.md`.

## Criterios de aceptación

- En viewport móvil, al abrir el menú desde el botón hamburguesa aparece un
  botón "Cerrar menú" visible (icono + texto) dentro del panel, antes de
  los enlaces de navegación.
- El foco se mueve automáticamente a ese botón de cerrar al abrir el menú.
- El botón hamburguesa expone `aria-expanded="false"` cerrado y
  `aria-expanded="true"` mientras el menú está abierto, en shell y landing.
- Pulsar Esc con el menú abierto lo cierra.
- Mientras el menú está abierto, `Tab`/`Shift+Tab` no puede salir del panel.
- Al cerrar el menú por cualquier vía (botón de cerrar, Esc o tap en el
  fondo) el foco vuelve al botón hamburguesa que lo abrió.
- El tap en el fondo oscurecido sigue cerrando el menú, pero no es el único
  método disponible.
- En móvil, al pulsar cualquier opción de navegación del menú abierto (shell:
  Auditorías/Biblioteca/Componentes; landing: enlaces de ancla) el menú se
  cierra.
- `npm run lint` y `npm test` pasan sin fallos.
- `e2e/shell.spec.ts` sigue pasando sin modificar sus aserciones.
- Un escaneo de axe (extensión de navegador) sobre el menú abierto en móvil
  no devuelve errores críticos.
