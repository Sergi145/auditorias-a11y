# 16 — Adjuntar imágenes de evidencia a un hallazgo

**Estado:** Implemented
**Depende de:** Spec 06 (Checklist manual — `Hallazgo` y formularios de hallazgo en `criterio-revision`), Spec 04 (Rediseño Tailwind — `AppButton`, `AppFormField`, `AppCard`, `ToastService`)
**Fecha:** 2026-09-17

## Objetivo de esta rebanada

Permitir adjuntar, describir, ver y quitar imágenes de evidencia (PNG, JPEG o
WebP) en cada hallazgo de `criterio-revision`, justo debajo de "Descripción
del hallazgo", con un control operable por teclado y lector de pantalla que
cumple WCAG 2.2 AA.

## Qué entra

- **Modelo** (`src/app/core/models.ts`): `Evidencia` gana
  `descripcion?: string`. Es el texto alternativo de una evidencia de tipo
  `'captura'`.
- **Dexie v3** (`src/app/core/database.ts`): `evidencias: '++id, hallazgo_id'`.
  Sustituye el índice `resultado_id` de v1, que nunca llegó a usarse. No hay
  datos que migrar: ninguna pantalla ni servicio ha escrito evidencias hasta
  ahora.
- **`src/app/core/evidencias.ts`**:
  - Constantes `TIPOS_IMAGEN_EVIDENCIA = ['image/png', 'image/jpeg',
    'image/webp']` y `TAMANO_MAXIMO_EVIDENCIA = 5 * 1024 * 1024` (5 MB).
  - Función pura `validarImagenEvidencia(archivo: File): MotivoRechazoEvidencia | null`,
    que comprueba `archivo.type` y `archivo.size`.
  - `EvidenciasService`:
    - `deHallazgos$(hallazgoIds: number[]): Observable<Evidencia[]>` (liveQuery
      con `where('hallazgo_id').anyOf(...)`).
    - `aplicarCambios(hallazgoId: number, cambios: CambiosEvidencias): Promise<void>`:
      añade las nuevas, actualiza la `descripcion` de las existentes y borra
      las quitadas, todo en una transacción.
- **`HallazgosService.eliminar`** borra el hallazgo y sus evidencias en una
  única transacción `rw` sobre `hallazgos` y `evidencias`.
- **Nuevo componente `EvidenciasEditor`**
  (`src/app/features/auditorias/criterio-revision/evidencias-editor.ts` +
  `.html`). Recibe el `FormArray` `evidencias` del formulario de hallazgo. Se
  usa en los dos formularios de hallazgo de `criterio-revision` (nuevo y
  edición), justo debajo de "Descripción del hallazgo":
  - `<fieldset>` con `<legend>` "Imágenes de evidencia".
  - Un `<button appButton type="button">` visible "Adjuntar imagen" que abre
    un `<input type="file" accept="image/png,image/jpeg,image/webp" multiple>`
    oculto (`class="sr-only"`, `tabindex="-1"`, `aria-hidden="true"`). El
    botón es el único punto de interacción, tanto para teclado como para
    lector de pantalla.
  - Texto de ayuda visible "PNG, JPEG o WebP. Máximo 5 MB por imagen.",
    enlazado al botón con `aria-describedby`.
  - Al elegir archivos se aceptan los válidos y se rechazan los no válidos:
    - Cada archivo rechazado aparece en una lista de errores en línea
      (`text-red-700`) bajo el botón, con su nombre y el motivo: "formato no
      admitido" o "supera los 5 MB". La lista también va enlazada al botón
      con `aria-describedby`.
    - El resultado se anuncia con `LiveAnnouncer`, p. ej. "2 imágenes
      añadidas. 1 archivo rechazado: informe.pdf, formato no admitido."
    - La lista de errores se vacía en la siguiente selección.
    - Si se acepta al menos una imagen, el foco pasa al campo de descripción
      de la primera imagen añadida.
    - El valor del `<input type="file">` se reinicia tras cada selección, para
      poder volver a elegir el mismo archivo.
  - Lista `<ul>` de imágenes (guardadas y pendientes). Cada `<li>` muestra:
    - Una miniatura (`max-h-32 object-contain`) con `alt` igual a la
      descripción escrita, o `alt=""` mientras esté vacía.
    - El nombre del archivo, o "Imagen guardada" si ya estaba guardada.
    - Un `app-form-field` "Descripción de la imagen (texto alternativo)"
      obligatorio. Si se deja vacío, muestra el error "Describe el contenido
      de la imagen." con el mecanismo de error de `AppFormField`.
    - Un botón "Quitar imagen" con nombre accesible "Quitar imagen N". Al
      pulsarlo se quita la imagen de la lista y se anuncia "Imagen quitada.".
      El foco pasa al botón "Quitar" del siguiente elemento, o al del
      anterior, o a "Adjuntar imagen" si la lista queda vacía.
  - URLs de miniatura con `URL.createObjectURL`, revocadas al quitar la imagen
    y al destruir el componente (`DestroyRef`).
  - Botones con área táctil de al menos 24×24 px (2.5.8) y foco visible con
    los estilos de `AppButton`.
- **`criterio-revision.ts`/`.html`**:
  - `formularioHallazgo` gana
    `evidencias: FormArray<FormGroup<{ id: number | null; archivo: Blob; descripcion: string }>>`,
    con `descripcion` obligatoria.
  - Un hallazgo con alguna imagen sin descripción no se puede guardar, igual
    que un hallazgo sin "Descripción del hallazgo": `markAllAsTouched` y no se
    guarda nada.
  - `empezarNuevoHallazgo` vacía el array. `empezarEditarHallazgo` lo rellena
    con las evidencias guardadas de ese hallazgo.
  - `guardarHallazgo` (llamado también desde "Guardar revisión" para el
    hallazgo nuevo) persiste el hallazgo y después llama a
    `EvidenciasService.aplicarCambios`. Las evidencias quitadas se calculan
    como las guardadas originalmente cuyo `id` ya no está en el array. Ambas
    escrituras van en una transacción `rw` sobre `hallazgos` y `evidencias`.
  - "Cancelar" descarta todos los cambios de imágenes sin tocar Dexie.
  - La tarjeta de lectura de cada hallazgo muestra una lista
    `<ul aria-label="Evidencias del hallazgo">` con sus miniaturas. Cada una
    va dentro de un enlace `<a target="_blank" rel="noopener">` a la URL del
    Blob. El nombre accesible del enlace es el `alt` más el texto
    "(se abre en una pestaña nueva)", en `sr-only`, junto a un icono visible
    de pestaña nueva.
  - Se elimina la nota "Adjuntar capturas llegará en una rebanada futura."
- **Documentación**:
  - `specs/00-producto.md` §6: `Evidencia` añade `descripcion` (texto
    alternativo de la captura).
  - `specs/README.md`: nueva fila 16 → `16-evidencia-imagen-hallazgo.md`
    ("Implemented" al terminar). La fila 13 indica que reutiliza la v3 y
    `EvidenciasService` de la spec 16.

## Qué NO entra todavía

- **Pegar desde el portapapeles y arrastrar y soltar**: solo el botón y el
  selector de archivos.
- **Visor ampliado en diálogo** (focus trap, Esc, navegación entre
  imágenes): la imagen completa se abre en una pestaña nueva.
- **Imágenes en la exportación** PDF/Excel de `specs/09-exportacion.md`.
- **Evidencias en el collapse de hallazgos de `pagina-checklist`**.
- **Evidencias de tipo `'nota'`**: solo se usa `tipo: 'captura'`.
- **Captura automática desde el escaneo de URL**: sigue en
  `13-captura-evidencia-escaneo`.
- **Recortar, anotar, redimensionar o comprimir imágenes** antes de
  guardarlas.
- **Borrado en cascada de evidencias al eliminar una página o auditoría**:
  hoy tampoco se borran en cascada sus resultados y hallazgos. Si llega, irá
  en otra spec.
- **Formatos GIF, SVG, HEIC u otros**, y archivos de más de 5 MB.

## Modelo de datos que toca

- `Evidencia` (existente) gana un campo opcional y pasa a persistirse:

```ts
export interface Evidencia {
  id?: number;
  hallazgo_id: number;
  tipo: TipoEvidencia; // en esta rebanada siempre 'captura'
  archivo?: Blob;
  texto?: string;
  descripcion?: string; // nuevo: texto alternativo de la captura
}
```

- Dexie v3:

```ts
this.version(3).stores({
  evidencias: '++id, hallazgo_id',
});
```

- Tipos de `src/app/core/evidencias.ts` (no se persisten):

```ts
type MotivoRechazoEvidencia = 'formato-no-admitido' | 'tamano-excedido';

interface CambiosEvidencias {
  nuevas: { archivo: Blob; descripcion: string }[];
  actualizadas: { id: number; descripcion: string }[];
  eliminadas: number[];
}
```

- `Hallazgo` no cambia.

## Plan de implementación

1. **Modelo y esquema**: `descripcion` en `Evidencia` y Dexie v3. `npm test`
   sigue pasando y la app abre una base de datos v2 existente sin errores.
2. **`src/app/core/evidencias.ts`** con tests (`evidencias.spec.ts`):
   - `validarImagenEvidencia` con PNG/JPEG/WebP válidos, un `application/pdf`,
     un `image/gif` y un archivo de 5 MB + 1 byte.
   - `aplicarCambios` añade, actualiza y elimina en una sola llamada.
   - `deHallazgos$` solo devuelve las evidencias de los ids pedidos.
3. **Cascada en `HallazgosService.eliminar`** con un test en
   `hallazgos.spec.ts`: al eliminar un hallazgo desaparecen sus evidencias y
   no las de otro hallazgo.
4. **`EvidenciasEditor`** (botón, input oculto, ayuda, validación, errores en
   línea, anuncios, lista con miniatura, descripción y "Quitar", gestión de
   foco, revocado de URLs), con tests de componente para: archivo aceptado,
   archivo rechazado y foco tras quitar.
5. **Integración en `criterio-revision`**: `FormArray` `evidencias`, editor en
   los dos formularios, carga en edición, guardado transaccional, "Cancelar"
   y miniaturas enlazadas en la tarjeta de lectura. Se elimina la nota de
   "rebanada futura". Al terminar este paso, adjuntar imágenes funciona de
   extremo a extremo.
6. **`e2e/evidencia-hallazgo.spec.ts`** con una imagen PNG de ejemplo en
   `e2e/fixtures/`:
   - (a) Crear un hallazgo con una imagen y su descripción (`setInputFiles`).
     La tarjeta de lectura muestra la miniatura con ese `alt`.
   - (b) Intentar guardar una imagen sin descripción: aparece el error y no
     se crea el hallazgo.
   - (c) Elegir un `.txt`: aparece el error en línea con el nombre del
     archivo y no se añade a la lista.
   - (d) Editar el hallazgo, quitar la imagen y guardar: la tarjeta ya no
     muestra miniaturas.
7. **Documentación**: `00-producto.md` §6 y `specs/README.md` (filas 13 y 16).
8. **Verificación de accesibilidad**:
   - Recorrer con teclado y con lector de pantalla (NVDA) el flujo completo:
     adjuntar, archivo rechazado, describir, quitar, guardar y abrir la
     imagen desde la tarjeta.
   - Escaneo de axe (extensión de navegador) sobre
     `/auditorias/:id/paginas/:id/criterios/:codigo` con el formulario de
     hallazgo abierto y al menos una imagen en la lista.

## Criterios de aceptación

- En los formularios de hallazgo nuevo y de edición de `criterio-revision`,
  el grupo "Imágenes de evidencia" aparece justo debajo de "Descripción del
  hallazgo".
- Con solo teclado (Tab + Enter/Espacio) se puede abrir el selector de
  archivos desde "Adjuntar imagen". El `<input type="file">` no recibe foco
  con Tab.
- El lector de pantalla anuncia el botón "Adjuntar imagen" junto con el texto
  "PNG, JPEG o WebP. Máximo 5 MB por imagen.".
- Elegir un PNG, un JPEG o un WebP de hasta 5 MB lo añade a la lista con su
  miniatura. El foco pasa a su campo "Descripción de la imagen (texto
  alternativo)" y se anuncia cuántas imágenes se han añadido.
- Se pueden añadir varias imágenes a un mismo hallazgo, en una o en varias
  selecciones.
- Elegir un archivo de otro formato o de más de 5 MB no lo añade a la lista.
  Muestra junto al botón un error visible con el nombre del archivo y el
  motivo, y lo anuncia `LiveAnnouncer`. Si se eligen a la vez archivos
  válidos y no válidos, los válidos sí se añaden.
- Intentar guardar un hallazgo con alguna imagen sin descripción no guarda
  nada y muestra "Describe el contenido de la imagen." en ese campo.
- Al guardar un hallazgo nuevo con imágenes, en Dexie hay una `Evidencia`
  por imagen con `hallazgo_id` del hallazgo, `tipo: 'captura'`, el `archivo`
  como Blob y su `descripcion`.
- En modo edición se pueden cambiar la descripción de una imagen guardada,
  quitarla o añadir otras nuevas. Todos esos cambios se persisten al pulsar
  "Guardar hallazgo".
- "Cancelar" en un hallazgo en edición deja sus evidencias en Dexie tal como
  estaban.
- "Quitar imagen N" quita la imagen, anuncia "Imagen quitada." y deja el foco
  en el siguiente "Quitar", en el anterior o en "Adjuntar imagen" si la lista
  queda vacía.
- La tarjeta de lectura de un hallazgo con evidencias muestra sus miniaturas
  con `alt` igual a su descripción. Cada una abre la imagen completa en una
  pestaña nueva y su nombre accesible incluye "(se abre en una pestaña
  nueva)".
- Eliminar un hallazgo borra también todas sus evidencias de Dexie, sin tocar
  las de otros hallazgos.
- Una base de datos existente en v2 se actualiza a v3 al abrir la app, sin
  perder auditorías, páginas, resultados ni hallazgos.
- La nota "Adjuntar capturas llegará en una rebanada futura." ya no aparece.
- `npm run lint`, `npm test` y `npm run e2e` pasan sin fallos (incluido
  `e2e/evidencia-hallazgo.spec.ts`).
- Un escaneo de axe (extensión de navegador) sobre la pantalla de revisión de
  criterio con el formulario de hallazgo abierto y una imagen en la lista no
  devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Sí: varias imágenes por hallazgo.** Un error suele necesitar más de una
  captura (antes/después, varios estados). El modelo `Evidencia` con
  `hallazgo_id` ya lo permitía. **No: una sola imagen**: se queda corto.
- **Sí: descripción (alt) obligatoria por imagen**, guardada en un campo
  nuevo `descripcion`. La app debe cumplir 1.1.1 sobre sí misma y el alt
  servirá en futuras exportaciones. **No: alt opcional o genérico**: en una
  herramienta de accesibilidad sería incoherente. **No: reutilizar `texto`**:
  ese campo es el contenido de las evidencias de tipo `'nota'` y mezclar
  ambos significados confunde.
- **Sí: PNG, JPEG y WebP, máximo 5 MB, validando por `File.type`.** Son los
  formatos habituales de captura y se muestran en cualquier navegador. El
  límite evita agotar la cuota de IndexedDB. **No: GIF** (más peso, y las
  animaciones son discutibles como evidencia estática). **No: cualquier
  `image/*`**: HEIC o TIFF no se muestran en todos los navegadores.
- **Sí: botón visible + `<input type="file">` oculto y fuera del orden de
  tabulación.** Nombre, estado de foco y estilo son los de `AppButton`,
  idénticos en todos los navegadores. **No: `<label>` estilado como botón
  sobre un input `sr-only` enfocable**: el anillo de foco y el anuncio del
  lector de pantalla varían entre navegadores. **No: arrastrar y soltar ni
  pegar** en esta rebanada: el botón ya cubre 2.1.1 y 2.5.7, y el resto
  añade superficie sin sumar accesibilidad.
- **Sí: errores en línea enlazados con `aria-describedby` + `LiveAnnouncer`**,
  aceptando los archivos válidos de una selección mixta. **No: toast**: el
  mensaje no quedaría junto al control y desaparece solo.
- **Sí: foco a la descripción de la primera imagen añadida**, que es el
  siguiente paso obligatorio. **Sí: foco al "Quitar" contiguo tras quitar**,
  para no perder el foco en `<body>` (2.4.3).
- **Sí: guardar las imágenes al guardar el hallazgo**, en la misma
  transacción. Mismo modelo mental que el resto de campos del formulario.
  Funciona con el hallazgo nuevo, que aún no tiene id, y "Cancelar" descarta
  todo. **No: guardado inmediato al elegirlas**: rompe con el hallazgo nuevo
  y con "Cancelar".
- **Sí: miniaturas en el formulario y en la tarjeta de lectura, con la imagen
  completa en pestaña nueva avisada.** **No: visor modal**: sería un
  componente de UI nuevo con focus trap. Se deja para otra spec.
- **Sí: borrado en cascada al eliminar un hallazgo.** Evita Blobs huérfanos
  ocupando cuota. **No: cascada desde página o auditoría** en esta rebanada:
  es una laguna previa que afecta también a resultados y hallazgos.
- **Sí: Blob en IndexedDB.** Coherente con el MVP local-first y con
  `Evidencia.archivo?: Blob`, que ya existía. **No: base64 en un string**:
  ocupa un 33 % más.
- **Sí: esta spec es la 16 y crea la v3 y `EvidenciasService`.** La 13
  (captura automática del escaneo) los reutilizará. **No: renumerar** la 13:
  habría que tocar referencias en la spec 12.
- **Sí: exportación de imágenes fuera.** Maquetar imágenes con jsPDF es otro
  dominio (escalado, saltos de página, tamaño del PDF).

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Se agota la cuota de IndexedDB (`QuotaExceededError`) con muchas imágenes | La transacción no crea el hallazgo a medias. `criterio-revision` captura el error y muestra el toast "No se han podido guardar las imágenes: no queda espacio de almacenamiento." El formulario sigue abierto con los datos. |
| `File.type` vacío o incorrecto (extensión renombrada, algunos sistemas) | Se rechaza como "formato no admitido". Comprobar la firma binaria del archivo queda fuera de esta rebanada. |
| Fugas de memoria por URLs de Blob no revocadas | `EvidenciasEditor` y la tarjeta de lectura revocan al quitar la imagen y en `DestroyRef`. El test de componente comprueba que se llama a `URL.revokeObjectURL` al quitar. |
| El enlace a la URL del Blob deja de funcionar si la pestaña original navega y revoca la URL antes de abrirse | La pestaña nueva carga la imagen al abrirse. Si se recarga después de revocar, mostrará un error. Riesgo aceptado hasta que llegue el visor modal. |
| La actualización de v2 a v3 cambia el índice de `evidencias` | La tabla está vacía en todas las instalaciones: ningún código ha escrito en ella. Se verifica abriendo una base v2 real (paso 1). |
| Guardar solo cambios de imágenes en un hallazgo automático lo promociona a `origen: 'manual'` (comportamiento actual de `actualizar`) | Comportamiento aceptado y coherente con la spec 11: añadir evidencia es una edición manual. |

## Lo que **no** entra en esta spec

- Pegar desde el portapapeles y arrastrar y soltar.
- Visor ampliado en diálogo.
- Imágenes en la exportación PDF/Excel.
- Evidencias en el collapse de hallazgos de `pagina-checklist`.
- Evidencias de tipo `'nota'`.
- Captura automática desde el escaneo de URL (`13-captura-evidencia-escaneo`).
- Recortar, anotar, redimensionar o comprimir imágenes.
- Cascada de evidencias al eliminar una página o auditoría.
- Formatos distintos de PNG/JPEG/WebP y archivos de más de 5 MB.

Cada uno de estos puntos, si llega, irá en su propia spec.
