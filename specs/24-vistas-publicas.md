# 24 — Vistas públicas: Funcionalidades, Cómo funciona y Accesibilidad

**Estado:** Approved
**Depende de:** Spec 04 (componentes propios + Tailwind), Spec 10 (menú móvil accesible), Spec 22 (pruebas de usuario y título por pantalla)
**Fecha:** 2026-09-21

## Objetivo de esta rebanada

Crear tres vistas públicas propias (`/funcionalidades`, `/como-funciona` y
`/accesibilidad`) con un layout público compartido con la bienvenida. Los
enlaces de la landing pasan a llevar a esas vistas.

## Por qué

Los enlaces «Funcionalidades», «Cómo funciona» y «Accesibilidad» de la
cabecera, del menú móvil y del pie de la landing son `href="#…"`. Con
`<base href="/">` el navegador los resuelve como `/#funcionalidades`, no como
`/bienvenida#funcionalidades`. El resultado es una recarga completa, la
redirección a `/bienvenida` y ningún desplazamiento. En la práctica no llevan
a ningún sitio.

## Qué entra

- **`LayoutPublico`**
  (`src/app/features/publico/layout-publico/layout-publico.ts` + `.html`).
  Se extraen de `landing.html` el skip link, la cabecera, el menú móvil
  (`AppDrawer`), el `<main id="contenido">` con su `<router-outlet>` y el pie.
  - La lógica del menú (`isHandset`, `menuAbierto`, devolver el foco a
    `#botonMenu` al cerrarse) sale de `landing.ts` y pasa al layout sin
    cambios de comportamiento.
  - Los enlaces de cabecera, menú móvil y pie («Producto») pasan de
    `href="#…"` a `routerLink="/funcionalidades"`, `"/como-funciona"` y
    `"/accesibilidad"`.
  - Enlace activo: `routerLinkActive` + `ariaCurrentWhenActive="page"`.
    Se distingue con subrayado y `font-semibold`, no solo con color
    (WCAG 1.4.1). En `/bienvenida` ninguno de los tres está activo.
  - Al pulsar un enlace del menú móvil, el menú se cierra (como ahora).
  - Foco al navegar: en cada `NavigationEnd` entre vistas públicas, el foco
    va a `#contenido` (`tabindex="-1"`) tras pintar. Es el mismo patrón que
    `Shell`. Se salta la carga inicial (id 1) y las navegaciones a la misma
    ruta (solo cambia el fragmento o los query params).
- **Rutas** en `app.routes.ts`. Un padre `path: ''` con `LayoutPublico` e
  hijos `bienvenida`, `funcionalidades`, `como-funciona` y `accesibilidad`.
  Va **antes** del padre `''` del `Shell`: el router prueba el siguiente
  padre si ningún hijo coincide. Títulos de ruta: «Bienvenida»,
  «Funcionalidades», «Cómo funciona» y «Declaración de accesibilidad».
  `TituloPagina` les añade «· Auditorías A11y».
- **Contenido compartido** en `src/app/features/publico/contenido-publico.ts`.
  Los arrays `funcionalidades`, `pasos` y `compromisos` salen de `landing.ts`
  y se amplían (ver modelo de datos). La landing y las vistas leen de la misma
  fuente, así que el resumen y el detalle no pueden contradecirse.
- **Landing** (`features/landing`):
  - Solo conserva el hero, los datos clave y las tres secciones de resumen,
    sin cabecera, menú ni pie.
  - Al final de cada sección de resumen hay un enlace con texto propio
    (WCAG 2.4.4, nunca «Ver más» a secas): «Ver todas las funcionalidades»
    → `/funcionalidades`, «Ver el proceso paso a paso» → `/como-funciona`,
    «Leer la declaración de accesibilidad» → `/accesibilidad`.
  - El botón del hero «Ver cómo funciona» pasa a
    `routerLink="/como-funciona"`.
  - Los `id` de las secciones se mantienen.
- **`/funcionalidades`** (`features/publico/funcionalidades/`).
  - `<h1>` «Funcionalidades» y una entradilla.
  - Una `<section>` por funcionalidad (las 6 actuales), cada una con `<h2>`,
    su icono (`aria-hidden`), la descripción y una lista `<ul>` de 2 a 4
    puntos concretos (`detalles`).
  - Al final, CTA «Empezar una auditoría» → `/auditorias/nueva`.
- **`/como-funciona`** (`features/publico/como-funciona/`).
  - `<h1>` «Cómo funciona» y una entradilla.
  - Un `<ol>` con los 6 pasos. Cada uno lleva `<h2>`, la descripción,
    «Dónde:» (la pantalla de la app que se usa) y «Qué obtienes:»
    (el resultado).
  - El número de paso visible es `aria-hidden`, porque el `<ol>` ya lo
    anuncia.
  - Al final, CTA «Empezar una auditoría».
- **`/accesibilidad`** (`features/publico/accesibilidad/`). Una declaración de
  accesibilidad con `<h1>` «Declaración de accesibilidad» y estas secciones
  `<h2>`:
  1. **Compromiso**: la app se diseña para cumplir WCAG 2.2 nivel AA sobre sí
     misma.
  2. **Estado de cumplimiento**: no se conocen incumplimientos de WCAG 2.2 AA
     en la interfaz. Los límites de la verificación se enumeran en
     «Limitaciones conocidas».
  3. **Cómo se comprueba**: los 5 `compromisos`, cada uno con el texto de
     cómo se verifica (axe en cada pantalla dentro de los e2e, recorridos
     solo teclado y a 320 px de la spec 22, revisión manual).
  4. **Limitaciones conocidas**:
     - No se ha hecho una sesión con un lector de pantalla real (NVDA o
       Narrator). La spec 22 usó una aproximación automatizada.
     - El PDF exportado lo genera jsPDF sin etiquetas, así que no es un PDF
       accesible. El Excel sí conserva la estructura de tabla.
     - El texto alternativo de las evidencias lo escribe el auditor: la app
       lo pide, pero no puede garantizar su calidad.
  5. **Informar de un problema**: enlace
     `mailto:sergipicazo14@gmail.com` con el texto visible
     «sergipicazo14@gmail.com».
  6. **Fecha de la declaración**: «21 de septiembre de 2026», texto fijo que
     se actualiza a mano.
  - Al final, CTA «Empezar una auditoría».
- Cada vista nueva tiene **un único CTA** hacia la app. Se actualiza el
  comentario de `landing.ts` sobre el CTA único para explicar que la regla es
  por página.
- **`e2e/vistas-publicas.spec.ts`** (ver criterios) y **fila 24** en
  `specs/README.md`.

## Qué NO entra todavía

- Capturas de pantalla o ilustraciones en las vistas nuevas.
- Un PDF exportado accesible (etiquetado). Solo se declara como limitación.
- Un formulario de contacto o un backend para recibir incidencias.
- Enlaces a las vistas públicas desde el `Shell` interno de la app.
- Mover `features/landing` a `features/publico` (solo se mueven la cabecera,
  el pie y los datos).
- Traducir las vistas a otros idiomas.
- Rutas bajo `/bienvenida/…`.

## Modelo de datos que toca

Ninguna entidad de Dexie. Solo cambian las estructuras de contenido estático,
que salen de `landing.ts` y pasan a `contenido-publico.ts`:

```ts
// src/app/features/publico/contenido-publico.ts
export interface Funcionalidad {
  icono: IconName;
  titulo: string;
  descripcion: string; // la que ya usa la landing
  detalles: string[]; // 2–4 puntos, solo en /funcionalidades
}

export interface Paso {
  titulo: string;
  descripcion: string;
  pantalla: string;  // «Dónde:», p. ej. "Auditorías → Nueva auditoría"
  resultado: string; // «Qué obtienes:»
}

export interface Compromiso {
  texto: string;        // el que ya usa la landing
  comoSeVerifica: string; // solo en /accesibilidad
}

export const FUNCIONALIDADES: Funcionalidad[];
export const PASOS: Paso[];
export const COMPROMISOS: Compromiso[];
```

`FilaEjemplo` y `filasEjemplo` (la tarjeta del hero) se quedan en
`landing.ts`.

## Plan de implementación

1. Crear `contenido-publico.ts` con las interfaces y los arrays (con
   `detalles`, `pantalla`, `resultado` y `comoSeVerifica`). Hacer que
   `landing.ts` los importe. La landing se ve igual.
2. Crear `LayoutPublico` moviendo el skip link, la cabecera, el menú móvil y
   el pie desde la landing, con un `<router-outlet>` dentro de `#contenido`.
   Reorganizar `app.routes.ts` con el padre público antes del `Shell`.
   Ejecutar `e2e/recorridos-usuario.spec.ts` y `e2e/shell.spec.ts`:
   `/bienvenida` debe comportarse igual.
3. Crear las tres vistas con sus rutas y títulos. Cambiar los enlaces del
   layout a `routerLink` con `routerLinkActive`/`ariaCurrentWhenActive`.
4. Añadir el foco en `#contenido` al navegar entre vistas públicas.
5. En la landing: añadir los tres enlaces de sección y apuntar «Ver cómo
   funciona» a `/como-funciona`.
6. Crear `e2e/vistas-publicas.spec.ts` y añadir la fila 24 a
   `specs/README.md`.

## Criterios de aceptación

- [ ] Desde `/bienvenida`, en escritorio, «Funcionalidades», «Cómo funciona»
      y «Accesibilidad» de la cabecera llevan a `/funcionalidades`,
      `/como-funciona` y `/accesibilidad`, sin recargar la página.
- [ ] Lo mismo con los enlaces del menú móvil (viewport 320×640). Al pulsar
      uno, el menú se cierra.
- [ ] Lo mismo con los enlaces «Producto» del pie.
- [ ] En cada vista, el título de la pestaña es «Funcionalidades · Auditorías
      A11y», «Cómo funciona · Auditorías A11y» y «Declaración de
      accesibilidad · Auditorías A11y».
- [ ] En cada vista hay exactamente un `<h1>` y los encabezados no saltan de
      nivel.
- [ ] En cada vista, el enlace de la cabecera correspondiente tiene
      `aria-current="page"` y los otros dos no. En `/bienvenida` ninguno lo
      tiene.
- [ ] Tras navegar de una vista pública a otra con el teclado, el foco queda
      en `#contenido` (no en `<body>`).
- [ ] Cargar directamente `/accesibilidad` (F5) muestra la vista, no redirige
      a `/auditorias`.
- [ ] `/funcionalidades` muestra 6 secciones con `<h2>`, cada una con una
      lista de 2 a 4 puntos.
- [ ] `/como-funciona` muestra un `<ol>` con 6 pasos, cada uno con «Dónde:» y
      «Qué obtienes:».
- [ ] `/accesibilidad` tiene los `<h2>` «Compromiso», «Estado de
      cumplimiento», «Cómo se comprueba», «Limitaciones conocidas»,
      «Informar de un problema» y «Fecha de la declaración».
- [ ] `/accesibilidad` tiene un enlace con `href="mailto:sergipicazo14@gmail.com"`.
- [ ] Cada vista tiene un único enlace «Empezar una auditoría», que lleva a
      `/auditorias/nueva`.
- [ ] En `/bienvenida`, «Ver todas las funcionalidades», «Ver el proceso paso
      a paso», «Leer la declaración de accesibilidad» y «Ver cómo funciona»
      llevan a su vista.
- [ ] Axe (WCAG 2.2 A/AA) sin violaciones en `/bienvenida` y en las tres
      vistas, en escritorio y a 320×640.
- [ ] A 320×640 no hay scroll horizontal en ninguna de las cuatro páginas.
- [ ] `npm run lint`, `npm test` y `npx playwright test` sin fallos
      (incluidos `e2e/vistas-publicas.spec.ts`,
      `e2e/recorridos-usuario.spec.ts` y `e2e/shell.spec.ts`).

## Decisiones

- **Sí:** vistas propias con ruta. Es lo que se pidió, y cada página tiene
  URL, título de pestaña y se puede compartir.
- **No:** arreglar solo los anclas (`routerLink` + `fragment` y
  `anchorScrolling`). Desplaza la página, pero no crea las vistas.
- **Sí:** `LayoutPublico` compartido. El menú móvil accesible (spec 10) vive
  en un solo sitio.
- **No:** copiar la cabecera y el pie en cada vista. Serían cuatro copias del
  menú móvil que mantener.
- **No:** colgar las vistas del `Shell`. Mezclaría páginas informativas con
  vistas de trabajo.
- **Sí:** rutas planas (`/funcionalidades`…). Son cortas y están al mismo
  nivel que `/bienvenida`.
- **No:** `/bienvenida/funcionalidades`. URLs más largas sin beneficio.
- **Sí:** la landing mantiene las secciones como resumen y enlaza a cada
  vista. El contenido sale de un único `contenido-publico.ts`.
- **No:** quitar las secciones de la landing. La landing se quedaría sin
  explicar qué hace la app.
- **Sí:** enlaces con texto propio («Ver todas las funcionalidades»…).
  Varios «Ver más» iguales incumplen WCAG 2.4.4 fuera de contexto.
- **Sí:** «Accesibilidad» es una declaración de accesibilidad con
  limitaciones reales. Una herramienta de accesibilidad debe ser honesta
  sobre lo que no cumple o no ha verificado.
- **No:** ampliar solo los compromisos. Sin estado ni limitaciones no es una
  declaración.
- **Sí:** estado «no se conocen incumplimientos» con limitaciones
  explícitas. No haber verificado con un lector real no es lo mismo que
  incumplir.
- **Sí:** contacto por correo (`sergipicazo14@gmail.com`), confirmado por el
  usuario sabiendo que queda público.
- **No:** GitHub Issues. El usuario prefirió el correo.
- **Sí:** texto estático e iconos existentes.
- **No:** capturas de la app. Habría que describirlas y mantenerlas en cada
  rediseño.
- **Sí:** foco en `#contenido` al navegar y `aria-current="page"` en el
  enlace activo. Es el mismo comportamiento que el `Shell` (spec 22, P2).
- **Sí:** un CTA por vista. La regla de la landing (no repetir el mismo CTA)
  es por página.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Dos padres con `path: ''` (público y `Shell`): el `'**'` del `Shell` podría capturar rutas públicas o al revés. | El padre público va primero y solo tiene hijos con ruta explícita. Hay un criterio de F5 en `/accesibilidad`, y `e2e/shell.spec.ts` sigue pasando. |
| Mover la cabecera y el menú fuera de la landing cambia el foco o el cierre del menú móvil (spec 10). | Se mueve la lógica sin cambios y se ejecutan `recorridos-usuario.spec.ts` (móvil 320 px y solo teclado) en el paso 2. |
| El foco del layout y el del `Shell` compiten al pasar de `/bienvenida` a `/auditorias/nueva`. | El foco del layout solo actúa en navegaciones cuyo destino es una vista pública. El `Shell` ya enfoca `#contenido` al crearse (spec 22, P2). |
| La declaración se queda desactualizada (fecha y limitaciones). | La fecha es visible. Cualquier spec que resuelva una limitación actualiza la declaración en el mismo PR. |
| El correo publicado recibe spam. | El usuario lo aceptó. Cambiarlo es editar una línea de `accesibilidad.html`. |

## Lo que **no** entra en esta spec

- Capturas o ilustraciones en las vistas.
- PDF exportado accesible (etiquetado).
- Formulario de contacto o backend de incidencias.
- Enlaces a las vistas públicas desde el `Shell`.
- Mover `features/landing` a `features/publico`.
- Traducciones.
