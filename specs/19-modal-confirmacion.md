# 19 — Modal de confirmación propio en vez de `window.confirm()`

**Estado:** Implemented
**Depende de:** Spec 04 (componentes propios en `src/app/shared/ui/` con Tailwind y
`AppButton variant="danger"`), Spec 10 (criterios de foco de un modal: trampa de foco, Esc y
devolución del foco), Specs 05, 06, 07 y 08 (las pantallas que hoy confirman eliminaciones con
`window.confirm()`)
**Fecha:** 2026-09-18

## Objetivo de esta rebanada

Sustituir las confirmaciones de eliminación nativas del navegador ("localhost dice…") por un
modal de confirmación propio, accesible y con el estilo de la app, que se abre desde un servicio
que devuelve `Promise<boolean>`.

Hoy la app no usa `alert()` ni `prompt()`. El diálogo nativo sale de **seis llamadas a
`window.confirm()`**, todas con el mismo patrón `if (!window.confirm(...)) return;`:

| Archivo | Método | Qué elimina |
|---|---|---|
| `features/auditorias/auditoria-detalle/auditoria-detalle.ts` | `eliminar()` | Auditoría y sus páginas |
| `features/auditorias/pagina-checklist/pagina-checklist.ts` | `eliminarPagina()` | Página |
| `features/auditorias/pagina-checklist/pagina-checklist.ts` | `eliminarHallazgo()` | Hallazgo |
| `features/auditorias/criterio-revision/criterio-revision.ts` | `eliminarHallazgo()` | Hallazgo |
| `features/biblioteca-hallazgos/biblioteca-listado/biblioteca-listado.ts` | `eliminar()` | Hallazgo de la biblioteca |
| `features/componentes/componentes-listado/componentes-listado.ts` | `eliminar()` | Componente |

## Qué entra

- **`src/app/shared/ui/dialogo-confirmacion.ts`**: componente standalone
  `AppDialogoConfirmacion`, que se abre con `@angular/cdk/dialog` (ya incluido en
  `@angular/cdk`, sin dependencias nuevas). Recibe por `DIALOG_DATA` un
  `OpcionesConfirmacion` (ver el modelo de datos) y pinta:
  - un `<h2>` con el `titulo`, referenciado por `aria-labelledby`;
  - un `<p>` con el `mensaje`, referenciado por `aria-describedby`;
  - el botón **Cancelar** (`appButton variant="secondary"`) y el botón de confirmar
    (`appButton variant="danger"`) con el texto `textoConfirmar`. En ese orden: Cancelar
    primero en el DOM y a la izquierda.
  - Tarjeta blanca centrada, con esquinas redondeadas, sombra y fondo `bg-black/40`, con las
    mismas clases de Tailwind que ya usan `AppDrawer` y las tarjetas. Ancho máximo `max-w-md`,
    y a ancho de móvil deja 16 px de margen por lado.
- **`src/app/shared/ui/confirmacion.ts`**: servicio `ConfirmacionService` (`providedIn: 'root'`)
  con un único método `confirmar(opciones: OpcionesConfirmacion): Promise<boolean>`. Abre el
  diálogo con esta configuración:
  - `role: 'alertdialog'` y `ariaModal: true`;
  - `autoFocus` sobre el botón **Cancelar**;
  - `restoreFocus: true`, para devolver el foco al botón que abrió el modal;
  - `disableClose: true`, para que un clic en el fondo **no** cierre el modal. Como
    `disableClose` también desactiva Esc, el servicio se suscribe a `keydownEvents` y cierra
    con `false` al pulsar `Escape`.
  - Resuelve `true` solo con el botón de confirmar. Cancelar, Esc o cualquier cierre sin
    resultado (`closed` emite `undefined`) resuelven `false`.
- **Estilos del overlay del CDK**: se importan los estilos que necesita el CDK Dialog para
  posicionar el overlay (`@angular/cdk/overlay-prebuilt.css`, o su equivalente en `styles.css`),
  si todavía no están.
- **Las seis llamadas** de la tabla pasan a
  `if (!(await this.confirmacion.confirmar({...}))) return;`. Lo que ocurre tras confirmar
  (servicio, toast, navegación) no cambia. Textos:

  | Sitio | `titulo` | `mensaje` | `textoConfirmar` |
  |---|---|---|---|
  | `auditoria-detalle` | ¿Eliminar la auditoría? | «{nombre}» y todas sus páginas se eliminarán. Esta acción no se puede deshacer. | Eliminar auditoría |
  | `pagina-checklist` (página) | ¿Eliminar la página? | «{nombre}» se eliminará. Esta acción no se puede deshacer. | Eliminar página |
  | `pagina-checklist` (hallazgo) | ¿Eliminar el hallazgo? | Esta acción no se puede deshacer. | Eliminar hallazgo |
  | `criterio-revision` | ¿Eliminar el hallazgo? | Esta acción no se puede deshacer. | Eliminar hallazgo |
  | `biblioteca-listado` | ¿Eliminar de la biblioteca? | «{titulo}» se eliminará de la biblioteca. Esta acción no se puede deshacer. | Eliminar de la biblioteca |
  | `componentes-listado` | ¿Eliminar el componente? | «{nombre}» se eliminará. Esta acción no se puede deshacer. | Eliminar componente |

- Se actualiza el comentario de `biblioteca-listado.ts` que cita "mismo patrón
  window.confirm()" para que remita a `ConfirmacionService`.
- **Tests**:
  - Unitarios de `ConfirmacionService` y `AppDialogoConfirmacion`: el botón de confirmar
    resuelve `true`; Cancelar y Esc resuelven `false`; un clic en el fondo no cierra el modal; el
    diálogo tiene `role="alertdialog"` y `aria-modal="true"`, y `aria-labelledby` y
    `aria-describedby` apuntan al título y al mensaje; al abrirse, el foco está en Cancelar.
  - e2e nuevo (`e2e/confirmacion-eliminar.spec.ts`) sobre `componentes-listado`: se crea un
    componente propio y se pulsa Eliminar. El `alertdialog` aparece con su nombre accesible y
    el foco en Cancelar. Cancelar lo cierra, el componente sigue en la lista y el foco vuelve al
    botón Eliminar. Al volver a abrirlo, Esc lo cierra sin borrar nada. Al abrirlo una tercera
    vez, «Eliminar componente» lo borra y aparece el toast. Ningún `page.on('dialog')` nativo
    salta en todo el flujo.

## Qué NO entra todavía

- **Un modal genérico con contenido libre** (`<ng-content>`, formularios dentro del modal,
  visor de imágenes o lightbox): esta rebanada solo crea el modal de confirmación. Si más
  adelante hace falta otro tipo de modal, tendrá su propia spec, y podrá reutilizar la misma
  base del CDK Dialog.
- **Confirmaciones que no son eliminaciones**, como avisar de cambios sin guardar al salir de
  un formulario (`CanDeactivate`): hoy no existen y no se añaden.
- **Cambiar el toast** (`toast.ts`) ni el flujo que sigue a la eliminación: tras confirmar, cada
  pantalla hace exactamente lo mismo que hoy.
- **Deshacer la eliminación** (un "Deshacer" en el toast): borrar sigue siendo definitivo.
- **Una variante de botón `danger` rellena**: se reutiliza la `danger` de borde que ya existe.
- **e2e de las otras cinco eliminaciones**: comparten el servicio, así que el e2e de
  componentes y los unitarios bastan como red.

## Modelo de datos que toca

Ninguno en Dexie. Solo se añade una interfaz de TypeScript, en `src/app/shared/ui/confirmacion.ts`:

```ts
export interface OpcionesConfirmacion {
  titulo: string;          // <h2>, nombre accesible del alertdialog
  mensaje: string;         // <p>, descripción accesible
  textoConfirmar: string;  // texto del botón danger, p. ej. "Eliminar auditoría"
}
```

## Plan de implementación

1. Crear `OpcionesConfirmacion`, `ConfirmacionService` y `AppDialogoConfirmacion`, con sus
   unitarios, e importar los estilos del overlay del CDK. En este paso nada lo usa todavía y la
   app sigue funcionando igual.
2. Migrar `componentes-listado` y escribir el e2e `confirmacion-eliminar.spec.ts`.
3. Migrar las cinco llamadas restantes (`auditoria-detalle`, las dos de `pagina-checklist`,
   `criterio-revision` y `biblioteca-listado`) y actualizar el comentario de
   `biblioteca-listado.ts`.
4. Comprobar que `grep -rn "window.confirm\|alert(\|prompt(" src` no devuelve nada. Pasar
   `lint`, `test`, `test:api` y `e2e`, hacer un escaneo de axe con el modal abierto y añadir la
   fila 19 a `specs/README.md`.

## Criterios de aceptación

- `grep -rnE "window\.confirm|\balert\(|\bprompt\(" src` no devuelve ninguna coincidencia.
- En las seis eliminaciones de la tabla aparece el modal propio con su título, su mensaje y su
  botón específico. En ninguna aparece el diálogo nativo del navegador.
- Al abrirse, el modal tiene `role="alertdialog"` y `aria-modal="true"`, su nombre accesible es
  el título y su descripción es el mensaje. El foco empieza en **Cancelar**.
- Tab y Shift+Tab no sacan el foco del modal mientras está abierto.
- **Cancelar** y **Esc** cierran el modal sin eliminar nada, y el foco vuelve al botón que lo
  abrió.
- Un clic en el fondo oscuro no cierra el modal ni elimina nada.
- El botón de confirmar elimina el elemento y muestra el mismo toast que antes de esta
  rebanada. En `auditoria-detalle` y en la eliminación de página navega al mismo destino que
  antes.
- A 320 px de ancho, el modal cabe sin scroll horizontal y los dos botones se pueden pulsar.
- Un escaneo de axe (extensión del navegador) con el modal abierto no devuelve errores
  críticos.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- `specs/README.md` lista la fila 19.

## Decisiones tomadas y descartadas

- **Sí: `@angular/cdk/dialog`.** Ya está instalado con `@angular/cdk` y resuelve la trampa de
  foco, la devolución del foco, `aria-modal` y el bloqueo del scroll. **No: `<dialog>` nativo
  con `showModal()`**: habría que devolver el foco a mano, y es más difícil de probar en los
  unitarios. **No: un overlay propio con `cdkTrapFocus`**, como `AppDrawer`: habría que
  reimplementar a mano lo que el CDK Dialog ya da hecho.
- **Sí: un servicio que devuelve `Promise<boolean>`.** Sustituye a `window.confirm()` línea por
  línea y no toca ninguna plantilla. **No: un `<app-modal>` declarado en cada plantilla con una
  signal de apertura**: tocaría cinco plantillas y repetiría seis veces el mismo estado.
- **Sí: `role="alertdialog"`.** Interrumpe al usuario y le pide una decisión, que es justo el
  caso de uso que la APG de WAI-ARIA describe para ese rol.
- **Sí: el foco empieza en Cancelar.** En una acción destructiva e irreversible, un Enter por
  inercia no debe borrar nada. **No: el foco en el botón de confirmar**, aunque sea lo que hace
  `window.confirm()`.
- **Sí: el clic en el fondo no cierra.** **No: el mismo criterio que `AppDrawer`**, donde el
  clic fuera cierra: allí cerrar es inocuo, pero aquí el modal espera una decisión.
- **Sí: `variant="danger"` existente con un texto específico** ("Eliminar auditoría"). **No:
  "Aceptar"/"OK" genéricos**, porque no dicen qué va a pasar. **No: una variante nueva
  rellena**, que añadiría superficie a `AppButton` sin ninguna necesidad.
- **Sí: solo el modal de confirmación.** **No: un modal genérico con contenido libre**: hoy no
  lo necesita ninguna pantalla.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Al eliminar un elemento de una lista (hallazgo, componente, entrada de la biblioteca), el botón que abrió el modal desaparece, y `restoreFocus` no tiene adónde devolver el foco, que acaba en `<body>` | Es el mismo comportamiento que tiene hoy `window.confirm()`: esta rebanada no lo empeora. El criterio de devolución del foco se verifica en **Cancelar** y **Esc**, donde el botón sigue existiendo. Si hace falta, llevar el foco a un destino lógico tras borrar se resuelve en otra rebanada |
| `disableClose: true` también desactiva el cierre con Esc del CDK | El servicio escucha `keydownEvents` y cierra con `false` al pulsar `Escape`. Lo cubren un unitario y el e2e |
| Sin los estilos del overlay del CDK, el modal se pinta sin posicionar, al final del `<body>` | El paso 1 importa esos estilos, y el e2e comprueba que el modal es visible y que se puede interactuar con él |
| Algún test existente depende de `window.confirm` (un `spyOn(window, 'confirm')` o un `page.on('dialog')`) | Se buscan con grep al migrar y pasan a usar un doble de `ConfirmacionService` |
