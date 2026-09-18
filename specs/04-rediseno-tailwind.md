# 04 — Rediseño: componentes propios + Tailwind (sustituye Material 3)

**Estado:** Implemented
**Depende de:** Spec 02 (Maqueta M3)
**Fecha:** 2026-09-10

## Objetivo de esta rebanada

Sustituir Angular Material (Material Design 3, ver `specs/02-maqueta-m3.md`)
por un kit de componentes propio, delgado, estilado con Tailwind CSS, tras
detectar fallos de accesibilidad en componentes de Material durante uso
real de la app. La app sigue siendo su propia herramienta de dogfooding de
accesibilidad (`CLAUDE.md`): cada componente propio se construye con
semántica HTML nativa + ARIA correcto, complementado con Angular CDK
`a11y` donde el comportamiento lo exige (foco atrapado en el drawer móvil,
anuncios de `LiveAnnouncer` para las notificaciones tipo *snackbar*).

## Excepción a la convención de rebanadas verticales

Igual que `02-maqueta-m3.md`, esta es una rebanada horizontal: toca las 12
pantallas y el shell sin añadir funcionalidad de negocio nueva. Se
justifica por la misma razón que la anterior — es un cambio de sistema de
diseño transversal, no tiene sentido repetirlo pantalla a pantalla en
rebanadas futuras.

## Cambio de sistema de diseño (actualiza 00-producto.md)

`00-producto.md §7` fijaba Material Design 3 vía Angular Material. Esta
rebanada lo sustituye por: **componentes propios standalone + Tailwind
CSS + Angular CDK `a11y`**. `00-producto.md` se actualiza en el mismo
cambio.

## Qué entra

- Desinstalación de `@angular/material` (se mantiene `@angular/cdk`, base
  de `a11y` y `layout`).
- Instalación de Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/postcss`),
  configuración CSS-first (`@import "tailwindcss";` en `src/styles.scss`,
  sin `tailwind.config.js`), vía un `.postcssrc.json` en la raíz que
  recoge automáticamente el builder `@angular/build:application` ya usado
  por el proyecto.
- Kit de componentes propio en `src/app/shared/ui/`: `AppIcon`,
  `appButton` (directiva), `AppFormField`, `appSelect` (directiva),
  `appCard` (directiva), `AppChip`, `AppDrawer`, `AppTabs`,
  `AppProgressBar`, `ToastService` (sustituye `MatSnackBar`; usa
  `LiveAnnouncer` de CDK `a11y` para el anuncio accesible — sin componente
  visual, ver nota de revisión).
- Iconos: ~20 SVG inline de trazo simple (outline, 24×24, `stroke`,
  estilo homogéneo) escritos a mano dentro de `AppIcon` — **no** se copian
  path data de ningún set con licencia externa (Material Symbols,
  Lucide, etc.), para no arrastrar imprecisiones de memoria ni dudas de
  atribución. `aria-hidden="true"` fijo, igual que los `mat-icon
  aria-hidden` actuales.
- Reconstrucción del shell (`src/app/shared/shell/`) sin
  `mat-sidenav-container`/`mat-toolbar`: `<header role="banner">` +
  `<nav>` + `AppDrawer` para el colapso a móvil.
- Reconstrucción de las 12 pantallas de `02-maqueta-m3.md`: mismos
  layouts y comportamiento, HTML semántico + Tailwind + kit propio en vez
  de `Mat*Module`. `pagina-checklist` pasa de `mat-table` a una
  `<table>` nativa; `pagina-escaneo` pasa de `mat-tab-group` a `AppTabs`
  (patrón ARIA *tabs* con roving tabindex y navegación por flechas).
- `src/styles.scss`: se quita el tema M3 (`@use '@angular/material'`,
  `mat.theme(...)`) y las utilidades compartidas
  (`.pantalla__cabecera`, `.formulario`, `.nota`, etc.) se reescriben con
  `@layer components` + `@apply` de Tailwind en vez de variables
  `--mat-sys-*`. `.visualmente-oculto` se sustituye por la utilidad
  `sr-only` nativa de Tailwind.

## Qué NO entra todavía

- Ningún cambio de lógica de negocio, formularios reactivos, routing ni
  `MockDataService` — solo presentación.
- Tema oscuro / preferencia de sistema — la app seguía siendo solo clara
  con Material (`color-scheme: light` fijo) y sigue igual aquí.
- Tooling automático de axe-core (llega en la rebanada 09-escaneo-axe);
  la verificación de accesibilidad de esta rebanada es manual (extensión
  de navegador), igual que en `02-maqueta-m3.md`.

## Modelo de datos que toca

Ninguno. Cambio puramente de presentación sobre los mismos datos mock de
`MockDataService`.

## Decisiones tomadas y descartadas

- **Sin librería de iconos nueva** (se descartó `lucide-angular` u otra
  dependencia): solo ~20 iconos, se justifica más tenerlos a mano en
  `AppIcon` que añadir un paquete — decisión explícita del usuario.
- **`appSelect` sobre `<select>` nativo** en vez de reconstruir un
  combobox ARIA a mano: un `<select>` nativo ya es accesible por
  construcción (teclado, lector de pantalla, móvil) y estilarlo con
  Tailwind (`appearance-none` + icono de flecha propio) es más robusto
  que reimplementar el patrón *listbox* de la APG.
- **`AppDrawer` con `cdkTrapFocus`** (Angular CDK `a11y`) en vez de una
  librería de diálogos: es exactamente el caso de uso que
  `00-producto.md §7` ya preveía para CDK `a11y` antes incluso de
  Material.
- **Tailwind v4 CSS-first**, sin `tailwind.config.js`: usa la paleta de
  color por defecto de Tailwind directamente en las plantillas en vez de
  redefinir tokens de marca — no hay marca visual que preservar de
  Material 3 (violeta/naranja eran solo la semilla M3 por defecto), así
  que no se hereda ninguna paleta custom.
- **Clases compartidas existentes (`.pantalla__cabecera`, `.formulario`,
  `.nota`, etc.) se mantienen con el mismo nombre** pero reescritas con
  `@apply` — evita tocar las 12 plantillas para renombrar clases que no
  cambian de propósito, solo de implementación.

## Riesgos identificados

- `e2e/shell.spec.ts` y `src/app/app.spec.ts` dependen de roles ARIA
  (`banner`, nombres de enlace) y de la clase `.shell__title` — el shell
  nuevo debe conservar ambos exactamente.
- `AppTabs` y `AppDrawer` son los dos componentes con comportamiento de
  teclado propio (los únicos sin equivalente 1:1 en HTML nativo) — son
  los que más conviene revisar a fondo con lector de pantalla, ya que
  fueron precisamente los fallos de Material Design (roles/gestión de
  foco) los que motivaron este cambio.

## Criterios de aceptación

- `npm start` levanta la app sin errores en consola y con Tailwind
  aplicándose (clases utilitarias con efecto visible).
- `@angular/material` no aparece en `package.json` ni en ningún import de
  `src/`.
- Las 12 pantallas y el shell se ven y navegan igual que en
  `02-maqueta-m3.md` (mismo contenido, misma navegación), solo cambia la
  implementación visual.
- `npm run lint` y `npm test` corren sin fallos.
- `e2e/shell.spec.ts` sigue pasando sin modificar sus aserciones.
- Un escaneo de axe (extensión de navegador) sobre cada pantalla no
  devuelve errores críticos.
- `00-producto.md §7` y `CLAUDE.md` reflejan componentes propios +
  Tailwind + CDK `a11y`, no Material.

## Nota de revisión (2026-09-18)

Se eliminó `AppToastHost`, el componente visual que acompañaba a
`ToastService` (banner fijo inferior). `ToastService.mostrar()` se
mantiene y sigue anunciando por `LiveAnnouncer`, pero ya no pinta ningún
aviso visual — ver `specs/15-pie-de-pagina.md`, que dependía de
`AppToastHost` para el espaciado con el pie de página.

*Revertido el mismo día (informe de la spec 22, P4):* sin aviso visual,
quien no usa lector de pantalla no recibía ninguna confirmación. Vuelve
`AppToastHost` (`src/app/shared/ui/toast.ts`, montado en el shell), ahora
como la propia región `role="status"` / `aria-live="polite"`: el texto
existe una sola vez, se ve y se anuncia (ya no se usa `LiveAnnouncer`
para los avisos). Fijo abajo y centrado (`bottom-16`, por encima del pie),
sin controles ni `pointer-events`, y desaparece solo a los 5 s.

En `pagina-checklist` (cabecera de acciones y filtros de nivel/categoría/
estado/severidad), los botones y los `app-form-field` de filtro llevaban
un ancho fijo (`min-w-[160px]`) que en móvil los dejaba a un tamaño
intermedio incómodo en vez de ocupar el ancho completo. Se corrige a
`w-full sm:w-auto` (botones) y `w-full sm:w-auto sm:min-w-[160px]`
(filtros): 100% de ancho por debajo de `sm` (640px), tamaño de contenido
a partir de ahí — mismo patrón responsive que ya usa el resto de la app,
solo que no se había aplicado aquí.

## Nota de revisión (2026-09-18) — color en los botones de `pagina-checklist` y `auditoria-detalle`

Los botones de cabecera de `pagina-checklist` (Editar página, Eliminar
página, Escanear automáticamente) y de `auditoria-detalle` (Editar,
Eliminar) usaban todos `variant="secondary"` (borde/texto slate),
indistinguibles entre sí salvo por el icono y el texto. Se añaden tres
variantes nuevas a `appButton` (`src/app/shared/ui/button.ts`) con el
mismo tratamiento visual que `secondary` (borde + texto, sin relleno)
pero con color semántico: `danger` (rojo, botones "Eliminar"), `info`
(azul, botones "Editar") y `accent` (violeta, "Escanear automáticamente"
— mismo tono que `primary`/`text`, ya que el escaneo automático es la
funcionalidad central del producto). Los botones "Progreso" y "Exportar"
de `auditoria-detalle` se mantienen en `secondary`: no forman parte de
este par editar/eliminar/escanear.

Los tonos se fijan en `-700` (`red-700`, `blue-700`, `violet-700`) porque
dan contraste ≥ 4.5:1 sobre blanco para el texto y ≥ 3:1 para el borde
(WCAG 2.2 AA, criterios 1.4.3 y 1.4.11) — el mismo motivo por el que
`--severidad-critica` en `src/styles.css` ya usa `#b91c1c` (idéntico a
`red-700`) en vez de un rojo más claro. El icono hereda el color por
`stroke="currentColor"` (`AppIcon`), así que no hace falta tocarlo aparte.

## Nota de revisión (2026-09-18) — espaciado de los formularios

Los campos del formulario de hallazgo (`criterio-revision`) quedaban
pegados: la card del hallazgo era un bloque sin separación entre hijos y
`.formulario` solo dejaba `gap-2` (8 px). Se aumenta el espaciado:

- `.formulario` (`src/styles.css`): `gap-2` → `gap-4` (16 px) entre campos,
  en todos los formularios de la app.
- `AppFormField`: `gap-1` → `gap-1.5` entre etiqueta, control y ayuda/error.
- Las cards de hallazgo en edición (nuevo y existente) pasan a
  `flex flex-col gap-4`; se quitan los `mb-3` sueltos de su interior
  (sugerencias y bloque "Ver en la biblioteca"), que ya separa el `gap`.
