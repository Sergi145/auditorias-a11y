# 25 — Selector de fecha accesible (patrón «Date Picker Dialog» de la APG)

**Estado:** Implemented
**Depende de:** Spec 04 (componentes propios en `src/app/shared/ui/` con Tailwind, `AppFormField`,
`AppInput`, `AppIcon`), Spec 05 (formulario de auditoría con «Fecha de inicio»), Spec 19 (base
`@angular/cdk/dialog` y estilos del overlay del CDK), Spec 22 (foco al primer campo erróneo y
recorridos e2e que rellenan «Fecha de inicio»)
**Fecha:** 2026-09-21

## Objetivo de esta rebanada

Crear un selector de fecha propio que siga el ejemplo
[Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
de la APG de WAI-ARIA, y usarlo en «Fecha de inicio» del formulario de auditoría en lugar del
`<input type="date">` nativo.

## Por qué

El `<input type="date">` nativo cambia de aspecto, de formato y de soporte de teclado y de lector
de pantalla según el navegador y el sistema operativo. No se puede estilar con Tailwind, y su
calendario desplegable no se puede auditar con axe ni probar en Playwright de forma estable. La
app es una herramienta de accesibilidad (dogfooding): el único campo de fecha que tiene debe
comportarse igual en todas partes y seguir un patrón de referencia verificable.

## Qué entra

- **`src/app/shared/ui/fechas.ts`**: funciones puras, sin Angular, con sus unitarios
  (`fechas.spec.ts`):
  - `parsearFechaEs(texto: string): string | null` — acepta `d/m/aaaa` o `dd/mm/aaaa` (separador
    `/`, año de 4 dígitos, espacios alrededor ignorados). Devuelve la fecha ISO `aaaa-mm-dd` si es
    una fecha real del calendario, o `null` si no lo es (`31/02/2026`, `29/02/2027`, `hola`).
  - `formatearFechaEs(iso: string): string` — `2026-09-21` → `21/09/2026`.
  - `fechaLarga(iso: string): string` — `2026-09-21` → `lunes, 21 de septiembre de 2026`, con
    `Intl.DateTimeFormat('es-ES')`.
  - `semanasDelMes(anio: number, mes: number): (string | null)[][]` — filas de 7 celdas, de lunes
    a domingo. Cada celda es la fecha ISO del día, o `null` si pertenece a otro mes.
  - Todas trabajan con fechas de calendario (año, mes, día), nunca con `Date` en hora local
    convertida a UTC, para que no haya desfases de un día por zona horaria.
- **`src/app/shared/ui/selector-fecha.ts`**: componente standalone `AppSelectorFecha`
  (`selector: 'app-selector-fecha'`). Implementa `ControlValueAccessor` y `Validator`
  (`NG_VALUE_ACCESSOR` + `NG_VALIDATORS`), así que funciona con `formControlName`. Pinta:
  - un `<input type="text" appInput>` con `inputmode="numeric"` y `autocomplete="off"`. Recibe
    por inputs `inputId`, `describedBy` e `invalido`, que se enlazan a `id`,
    `aria-describedby` y `aria-invalid`, igual que el resto de controles dentro de
    `AppFormField`;
  - a su derecha, un botón de icono (`AppIcon` `calendar`, `aria-hidden`) que abre el
    calendario. Su nombre accesible es «Elegir fecha» si no hay fecha válida, y «Cambiar fecha,
    {fechaLarga}» si la hay (p. ej. «Cambiar fecha, lunes, 21 de septiembre de 2026»);
  - valor del control: siempre ISO `aaaa-mm-dd` o `''`. `writeValue('2026-09-21')` muestra
    `21/09/2026` en el input. Al escribir: texto vacío → `''`; texto válido → su ISO; texto no
    válido → `''` y el validador devuelve `{ fechaInvalida: true }`. Al salir del input (blur),
    un texto válido se reescribe con ceros (`1/9/2026` → `01/09/2026`) y el control se marca
    como `touched`;
  - un método público `enfocar()` que pone el foco en el input de texto.
- **`src/app/shared/ui/calendario-dialogo.ts`**: componente standalone `AppCalendarioDialogo`,
  que abre `AppSelectorFecha` con `@angular/cdk/dialog`. Recibe por `DIALOG_DATA` la fecha ISO
  seleccionada (o `null`) y se cierra con la ISO elegida o con `undefined` si se cancela.
  Estructura, siguiendo la APG:
  - `role="dialog"`, `aria-modal="true"` y `aria-labelledby` apuntando al `<h2>` con el mes y el
    año («septiembre de 2026»), que tiene `aria-live="polite"` para anunciar los cambios de mes;
  - en la cabecera, cuatro botones de icono con nombre accesible: «Año anterior», «Mes
    anterior», «Mes siguiente» y «Año siguiente». Se añaden a `AppIcon` los iconos
    `calendar`, `chevrons-left` y `chevrons-right` (propios, de trazo, sin copiar path data con
    licencia externa, como el resto);
  - una tabla `role="grid"` con `aria-labelledby` al `<h2>`. Encabezados de columna `<th
    scope="col">` con la abreviatura visible (`L M X J V S D`) y el nombre completo en `abbr`
    (`lunes`… `domingo`). Las celdas de otros meses quedan vacías y no son enfocables;
  - cada día es un `<td>` con el número visible, `tabindex` itinerante (solo el día activo tiene
    `0`) y un nombre accesible con la fecha larga. El día seleccionado lleva
    `aria-selected="true"` y el de hoy `aria-current="date"`. Se distinguen sin depender solo
    del color (WCAG 1.4.1): el seleccionado va relleno (`bg-violet-700 text-white`) y el de
    hoy lleva borde. Cada celda mide al menos 36 × 36 px (WCAG 2.5.8);
  - bajo la rejilla, un `<p aria-live="polite">` que muestra «Usa las flechas para moverte entre
    los días.» mientras el foco está en la rejilla, y se vacía cuando sale;
  - al pie, **Cancelar** (`appButton variant="secondary"`) y **Aceptar** (`appButton`
    primario), en ese orden.
- **Teclado en la rejilla** (el de la APG):
  - ← / → : día anterior / siguiente. ↑ / ↓ : misma fecha una semana antes / después.
  - Inicio / Fin: lunes / domingo de esa semana.
  - RePág / AvPág: mismo día del mes anterior / siguiente. Si ese día no existe (31 → febrero),
    va al último día del mes.
  - Mayús + RePág / Mayús + AvPág: mismo día del año anterior / siguiente, con la misma regla.
  - Si el movimiento sale del mes visible, la rejilla cambia de mes y el foco va al nuevo día.
  - Intro / Espacio: elige el día activo y cierra el diálogo.
- **Resto del diálogo**:
  - Al abrirse, el foco va al día seleccionado. Si no hay fecha válida, va a hoy.
  - Tab y Mayús+Tab recorren, en bucle y sin salir del diálogo: los cuatro botones de la
    cabecera → la rejilla (una sola parada, en el día activo) → Cancelar → Aceptar.
  - Los botones de mes y año cambian el mes visible sin mover el foco del botón. El día activo
    pasa a ser el mismo día en el nuevo mes, con la misma regla de fin de mes.
  - Un clic en un día lo elige y cierra.
  - **Aceptar** elige el día activo y cierra. **Cancelar**, **Esc** y un clic fuera del
    diálogo cierran sin cambiar nada.
  - Al cerrarse por cualquier vía, el foco vuelve al botón del calendario (`restoreFocus`). Si
    se ha elegido un día, el input muestra `dd/mm/aaaa`, el control recibe la ISO y queda
    `dirty` y `touched`.
- **Posición del diálogo**: en escritorio, anclado bajo el botón del calendario
  (`flexibleConnectedTo`, con posiciones alternativas encima y alineado a la derecha si no
  cabe), con fondo transparente. En `Breakpoints.Handset`, centrado en pantalla con fondo
  `bg-black/40`, igual que el modal de la spec 19. A 320 px de ancho cabe con 16 px de margen
  por lado.
- **Integración en `auditoria-nueva`** (crear y editar):
  - `auditoria-nueva.html`: el `<input type="date">` de «Fecha de inicio» pasa a
    `<app-selector-fecha formControlName="fecha_inicio">`, con `inputId`, `describedBy` e
    `invalido` enlazados a `campoFecha` como el resto de campos. `AppFormField` recibe el
    `hint` «Formato: dd/mm/aaaa.».
  - Mensajes de error, con este orden de prioridad: `fechaInvalida` → «Introduce una fecha
    válida con el formato dd/mm/aaaa.»; `required` → «Selecciona una fecha.» (el texto actual).
  - `auditoria-nueva.ts`: `inputFecha` pasa a ser un `viewChild(AppSelectorFecha)`, y
    `enfocarPrimerCampoInvalido()` llama a su `enfocar()`.
  - El modelo `Auditoria.fecha_inicio` sigue siendo un `string` ISO. En modo editar,
    `patchValue` pinta la fecha guardada como `dd/mm/aaaa`.
- **e2e existentes**: las llamadas `getByLabel('Fecha de inicio').fill('2026-01-01')` (en
  `utilidades/recorrido.ts`, `card-enlace-estirado`, `elegir-desde-biblioteca`, `escaneo-url`,
  `evidencia-hallazgo`, `panel-progreso` y `recorridos-usuario`) pasan a escribir
  `01/01/2026`. En el recorrido solo teclado de `recorridos-usuario.spec.ts` se escribe
  `01/09/2026` y se espera ese mismo valor en el input.
- **Tests**:
  - Unitarios de `AppSelectorFecha`: `writeValue` formatea; escribir un texto válido emite su
    ISO; un texto inválido deja `fechaInvalida`; el blur rellena con ceros; el nombre del botón
    cambia con la fecha.
  - Unitarios de `AppCalendarioDialogo`: roles y atributos ARIA (`dialog`, `aria-modal`,
    `aria-labelledby`, `grid`, `aria-selected`, `aria-current`); foco inicial en el día
    seleccionado o en hoy; cada tecla de la lista de teclado, incluidos los saltos de mes, de
    año y de fin de mes (31/01 + AvPág → 28/02 o 29/02 en bisiesto); Intro y Aceptar cierran
    con la ISO; Cancelar y Esc cierran con `undefined`.
  - e2e nuevo `e2e/selector-fecha.spec.ts`, sobre «Nueva auditoría»:
    1. Solo teclado: Tab hasta el botón, Intro abre el diálogo, el foco está en hoy, flechas y
       AvPág mueven el foco, Intro elige, el diálogo se cierra, el foco vuelve al botón y el
       input muestra la fecha elegida.
    2. Esc cierra sin cambiar el valor y devuelve el foco al botón.
    3. Escribir `31/02/2026` y enviar: aparece el error de formato y el foco va al input.
    4. En modo editar, la fecha guardada aparece como `dd/mm/aaaa` y el calendario abre en ese
       día.
    5. Escaneo de axe con el diálogo abierto: sin violaciones.
    6. A 320 px, el diálogo abierto no provoca scroll horizontal y se puede elegir un día.

## Qué NO entra todavía

- **Restricciones de fecha**: fecha mínima, máxima o días deshabilitados. «Fecha de inicio» no
  las necesita. Si otro campo las pide, tendrán su propia spec.
- **Nuevos campos de fecha** en otras pantallas (`fecha_revision`, `fecha_creacion` y demás las
  pone la app, no el usuario). Esta rebanada solo sustituye el campo que ya existe.
- **Rangos de fechas** (desde–hasta) y selección de hora.
- **Otros idiomas o formatos**: la app está solo en español. El formato es `dd/mm/aaaa`, la
  semana empieza en lunes y los nombres salen de `Intl` con `es-ES`.
- **Selector de mes o de año desplegable** (saltar a un año lejano): se llega con los botones de
  año o con Mayús + RePág / AvPág, como en la APG.
- **Máscara de entrada** que inserte las barras solas al escribir.
- **Cambiar el modelo de Dexie**: `fecha_inicio` sigue siendo un `string` ISO.

## Modelo de datos que toca

Ninguno en Dexie. `Auditoria.fecha_inicio` sigue siendo `string` con formato `aaaa-mm-dd`.

Se añaden solo tipos de TypeScript:

```ts
// src/app/shared/ui/selector-fecha.ts
// Valor del control: fecha ISO 'aaaa-mm-dd' o '' si está vacío o el texto no es válido.
type ValorFecha = string;

// Error del validador cuando el texto escrito no es una fecha real en dd/mm/aaaa.
interface ErrorFecha { fechaInvalida: true }

// src/app/shared/ui/icon.ts — IconName gana: 'calendar' | 'chevrons-left' | 'chevrons-right'
```

## Plan de implementación

1. Crear `fechas.ts` con sus unitarios (incluidos bisiestos, fin de mes y la zona horaria). Nada
   lo usa todavía y la app sigue igual.
2. Añadir los iconos `calendar`, `chevrons-left` y `chevrons-right` a `AppIcon`.
3. Crear `AppCalendarioDialogo` con la rejilla, la cabecera, Cancelar/Aceptar, el teclado y sus
   unitarios. Todavía no lo abre nadie.
4. Crear `AppSelectorFecha` (input + botón + `ControlValueAccessor` + `Validator` + apertura del
   diálogo anclado o centrado), con sus unitarios.
5. Sustituir el `<input type="date">` de `auditoria-nueva` por `<app-selector-fecha>`, con los
   mensajes de error y `enfocarPrimerCampoInvalido()`. Actualizar los e2e que rellenan «Fecha de
   inicio».
6. Escribir `e2e/selector-fecha.spec.ts`, pasar `lint`, `test`, `test:api` y `e2e`, y añadir la
   fila 25 a `specs/README.md`.

## Criterios de aceptación

- `grep -rn 'type="date"' src` no devuelve ninguna coincidencia.
- En «Nueva auditoría» y en «Editar auditoría», «Fecha de inicio» muestra un input de texto con
  la pista «Formato: dd/mm/aaaa.» y un botón «Elegir fecha» (o «Cambiar fecha, {fecha larga}»
  si hay una fecha válida).
- Escribir `1/9/2026` y salir del campo deja `01/09/2026` en el input. La auditoría creada
  guarda `fecha_inicio: '2026-09-01'`.
- Escribir `31/02/2026` y pulsar «Crear auditoría» muestra «Introduce una fecha válida con el
  formato dd/mm/aaaa.», no crea la auditoría y lleva el foco al input de fecha.
- Dejar el campo vacío y enviar muestra «Selecciona una fecha.».
- El diálogo abierto tiene `role="dialog"`, `aria-modal="true"` y un nombre accesible igual al
  mes y año visibles. La rejilla tiene `role="grid"` y 7 encabezados de columna con su nombre
  completo.
- Al abrirse, el foco está en el día seleccionado o, si no hay fecha, en el día de hoy.
- Cada tecla de la lista «Teclado en la rejilla» hace exactamente lo descrito. 31/01/2026 +
  AvPág lleva a 28/02/2026, y 31/01/2028 + AvPág lleva a 29/02/2028.
- Tab y Mayús+Tab no sacan el foco del diálogo. La rejilla es una única parada de tabulación.
- Intro, Espacio, clic en un día y Aceptar eligen la fecha y cierran. Cancelar, Esc y un clic
  fuera cierran sin cambiar el valor. En todos los casos el foco vuelve al botón del
  calendario.
- El día seleccionado y el de hoy se distinguen en escala de grises (relleno frente a borde).
  Cada celda de día mide al menos 36 × 36 px.
- A 320 px de ancho, el diálogo aparece centrado, no hay scroll horizontal y se puede elegir
  cualquier día del mes.
- El escaneo de axe de `e2e/selector-fecha.spec.ts` con el diálogo abierto no devuelve
  violaciones.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- `specs/README.md` lista la fila 25.

## Decisiones tomadas y descartadas

- **Sí: seguir el ejemplo «Date Picker Dialog» de la APG** (input de texto + botón + diálogo
  modal con rejilla). Es el patrón de referencia del W3C, y se puede escribir la fecha sin abrir
  el calendario. **No: solo botón + diálogo**, porque obliga a pasar por la rejilla para
  cualquier fecha. **No: calendario siempre visible en el formulario**, que ocupa mucho y se
  aleja del ejemplo.
- **Sí: `@angular/cdk/dialog`**, la misma base que el modal de la spec 19 (trampa de foco,
  `restoreFocus`, `aria-modal`). **No: `<dialog>` nativo**, descartado ya en la spec 19 por la
  devolución del foco y los unitarios.
- **Sí: anclado bajo el botón en escritorio y centrado en móvil.** Mantiene la relación visual
  con el campo, como en la APG, y en móvil no hay espacio para anclarlo. **No: centrado
  siempre**, que pierde esa relación en pantallas grandes.
- **Sí: `dd/mm/aaaa` visible y ISO en el control.** Es el formato natural en español, y el resto
  de la app, Dexie y la exportación no cambian. **No: `aaaa-mm-dd` visible**, poco natural para
  el usuario.
- **Sí: todos los controles de la APG** (año y mes anterior/siguiente, Cancelar y Aceptar).
  **No: quitar Cancelar/Aceptar o los botones de año**: se aparta del ejemplo y hace menos
  descubribles esas acciones.
- **Sí: validador propio `fechaInvalida` con su mensaje.** Le dice al usuario qué está mal. **No:
  vaciar el valor ante un texto inválido** y mostrar «Selecciona una fecha.», que confunde a
  quien sí ha escrito algo.
- **Sí: el clic fuera cierra sin cambios**, como en la APG. **No: el criterio de la spec 19**
  (el clic en el fondo no cierra): allí el modal espera una decisión destructiva; aquí cerrar
  es inocuo.
- **Sí: sin restricciones de fecha en esta rebanada.** «Fecha de inicio» no las necesita.
- **Sí: funciones de fecha propias en `fechas.ts`, sobre año/mes/día.** **No: una librería de
  fechas** (date-fns, Luxon): para esto basta `Intl`, y no se añaden dependencias.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Desfase de un día por zona horaria al pasar entre `Date` e ISO (`new Date('2026-09-01')` es UTC) | `fechas.ts` trabaja con año, mes y día, y construye los `Date` en hora local solo para `Intl`. Un unitario fija una zona horaria negativa y comprueba que no hay desfase |
| `getByLabel('Fecha de inicio')` deja de ser único o apunta al botón en los e2e existentes | El `<label>` de `AppFormField` solo se asocia al input de texto (`for`/`id`). El nombre del botón no contiene «Fecha de inicio». El paso 5 pasa toda la suite e2e |
| La posición anclada tapa el input o sale de la pantalla en ventanas bajas | `flexibleConnectedTo` con posiciones alternativas (encima, alineado a la derecha) y `withPush`. En `Handset`, el diálogo va centrado |
| El `aria-live` del `<h2>` y el del mensaje de ayuda se pisan al abrir el diálogo | El mensaje de ayuda solo se escribe al entrar el foco en la rejilla, no al abrir. Se verifica en la revisión manual con lector de pantalla |
| El foco devuelto por `restoreFocus` va a un botón cuyo nombre acaba de cambiar | Es lo esperado: el lector anuncia «Cambiar fecha, {fecha}», lo que confirma la elección |
