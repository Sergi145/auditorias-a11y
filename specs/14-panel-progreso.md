# 14 — Panel de progreso: estado de los criterios y fallos por principio WCAG

**Estado:** Implemented
**Depende de:** Spec 03 (catálogo WCAG con `categoria`), Spec 06 (`Resultado` + `Hallazgo`
reales y `ProgresoService`), Spec 04 (componentes propios con Tailwind), Spec 09 (que ya
consume `ProgresoService.deAuditoria$()` en la exportación)
**Fecha:** 2026-09-18

## Objetivo de esta rebanada

Completar el panel de progreso (`/auditorias/:auditoriaId/progreso`) con el desglose de
criterios por estado y la distribución de hallazgos por principio WCAG, y dejarlo accesible y
cubierto por tests.

La pantalla ya existe desde las specs 02 y 06 (`auditoria-progreso.ts` + `ProgresoService`).
Hoy muestra el % revisado, los fallos por severidad y las páginas con más incidencias. De lo que
pide `00-producto.md` §5.8 solo le falta la **distribución por categoría WCAG**. Esta rebanada
la añade, suma el desglose por estado y corrige la accesibilidad de los bloques existentes. No
tiene tests de componente ni e2e.

## Qué entra

- **`src/app/core/progreso.ts`**: `ProgresoAuditoria` gana dos campos, calculados en el mismo
  `deAuditoria$()` y a partir de los mismos `Resultado` y `Hallazgo` que ya lee:
  - `criteriosPorEstado`: cuenta los pares página × criterio del catálogo en cada estado. Un
    criterio sin `Resultado` cuenta como `por_revisar`, así que los cuatro valores suman
    siempre `totalCriterios`.
  - `fallosPorCategoria`: cuenta **cada `Hallazgo`**, igual que `fallosPorSeveridad`, según el
    principio de su criterio (`hallazgo.resultado_id` → `Resultado.criterio_codigo` →
    `CriteriosWcagService.porCodigo()` → `categoria`). Los cuatro valores suman lo mismo que
    `fallosPorSeveridad`.
- **`src/app/shared/ui/distribucion-barras.ts`**: componente standalone de presentación
  `AppDistribucionBarras`, que sirve para los tres bloques de distribución. Recibe:
  - `filas`: una lista de `{ etiqueta, cantidad, color? }`;
  - `unidad`: el texto que sigue a la cifra solo para el lector de pantalla, p. ej.
    `"hallazgos"` o `"criterios en falla"`.

  Pinta una `<ul>` donde cada `<li>` lleva la etiqueta en texto, una barra horizontal con
  `aria-hidden="true"` (su ancho es proporcional al máximo del bloque) y la cifra en texto
  seguida de `<span class="sr-only"> {unidad}</span>`. El color nunca es la única pista: la
  etiqueta siempre está escrita. La etiqueta no se trunca, sino que se parte en varias líneas.
- **`auditoria-progreso.ts` / `.html`**, en este orden de bloques, cada uno con su `<h2>`:
  1. **Revisado** (sin cambios): el % y `AppProgressBar`.
  2. **Estado de los criterios** (nuevo): filas en el orden Falla, Pasa, No aplica, Por
     revisar, con las etiquetas y los colores de estado que ya usa `pagina-checklist`
     (`--severidad-critica`, `--severidad-baja`, neutro y `--severidad-media`). Unidad:
     `"criterios"`.
  3. **Fallos por severidad** (sin cambios en las cifras ni en las tarjetas).
  4. **Fallos por principio WCAG** (nuevo): filas en el orden Perceptible, Operable,
     Comprensible, Robusto, en color neutro. Unidad: `"hallazgos"`.
  5. **Páginas con más incidencias**: la misma métrica (criterios en Falla por página), ahora
     pintada con `AppDistribucionBarras`. Unidad: `"criterios en falla"`.
- **Estados vacíos**: todos los bloques se pintan siempre, aunque sea con ceros. Si la
  auditoría no tiene ningún hallazgo, los bloques 3 y 4 añaden la línea «Todavía no hay
  hallazgos registrados.». El mensaje del ranking cuando no hay páginas no cambia.
- **Accesibilidad de lo existente**: las barras del ranking pasan a ser `aria-hidden`, con la
  cifra y su unidad en texto, y los nombres de página largos ya no se cortan con puntos
  suspensivos. A 320 px de ancho no hay scroll horizontal.
- **Tests**:
  - Unitarios de `ProgresoService` (`progreso.spec.ts`): `criteriosPorEstado` suma
    `totalCriterios`, y un criterio sin `Resultado` cuenta como `por_revisar`. Dos hallazgos en
    el mismo criterio cuentan 2 en `fallosPorCategoria`. Sin páginas, todo queda a 0.
  - Unitarios nuevos de `AppDistribucionBarras` (las barras son `aria-hidden`, la cifra lleva
    la unidad en `sr-only` y la fila con el máximo ocupa el 100 %) y de `AuditoriaProgreso`
    (se pintan los cinco `<h2>` y aparece el aviso cuando no hay hallazgos).
  - e2e nuevo, `e2e/panel-progreso.spec.ts`, que crea los datos desde la UI como
    `evidencia-hallazgo.spec.ts`: una auditoría con una página; el criterio 1.1.1 en Falla con
    un hallazgo de severidad Alta, el 2.1.1 en Falla con un hallazgo Crítica y el 3.1.1 en
    Pasa. El test abre el panel y comprueba lo siguiente:
    - Estado: Falla 2, Pasa 1, No aplica 0 y Por revisar el total del catálogo − 3.
    - Severidad: Crítica 1 y Alta 1.
    - Principio: Perceptible 1, Operable 1, Comprensible 0 y Robusto 0.
    - El ranking muestra la página con 2.
    - `axe-core`, inyectado con `page.addScriptTag` desde `node_modules` (ya es una
      dependencia), no devuelve violaciones con las etiquetas `wcag2a`, `wcag2aa`, `wcag21aa` y
      `wcag22aa`.
- La fila 14 de `specs/README.md` pasa a enlazar esta spec, con su estado real.

## Qué NO entra todavía

- **Las nuevas distribuciones en el PDF o el Excel exportados**: `ProgresoAuditoria` gana
  campos, pero `exportacion-pdf.ts` y `exportacion-excel.ts` no cambian. Meterlas en el informe
  sería otra rebanada.
- **% revisado por página** (una barra de progreso por página): solo se muestra el total de la
  auditoría.
- **Enlaces desde el panel** (del ranking al checklist de la página, de una severidad o un
  principio a los hallazgos filtrados).
- **Filtrar por el estándar objetivo** (A frente a AA): `totalCriterios` sigue contando todo el
  catálogo, igual que hoy el checklist y la exportación. Aplicar `estandar_objetivo` afecta a
  varias pantallas y merece su propia spec.
- **Cambios en el listado de auditorías** (`auditorias-listado`), que sigue mostrando su % y sus
  fallos como hoy.
- **Una librería de gráficos** o gráficos de tarta o de donut.
- **Cruzar métricas** (severidad × principio, o principio por página).

## Modelo de datos que toca

Ninguno en Dexie: todo se calcula a partir de `Resultado`, `Hallazgo` y el catálogo WCAG que ya
existen. Solo cambian interfaces de TypeScript.

```ts
// src/app/core/progreso.ts
export interface ProgresoAuditoria {
  totalCriterios: number;
  revisados: number;
  porcentajeRevisado: number;
  fallosPorSeveridad: Record<Severidad, number>;
  criteriosPorEstado: Record<EstadoResultado, number>; // suma = totalCriterios
  fallosPorCategoria: Record<CategoriaWCAG, number>;   // suma = suma de fallosPorSeveridad
}

// src/app/shared/ui/distribucion-barras.ts
export interface FilaDistribucion {
  etiqueta: string;  // texto visible, p. ej. "Perceptible"
  cantidad: number;
  color?: string;    // p. ej. 'var(--severidad-critica)'; sin color → neutro
}
```

`PROGRESO_VACIO` y el `initialValue` de `auditoria-progreso.ts` se amplían con los dos campos a 0.

## Plan de implementación

1. Ampliar `ProgresoAuditoria` y `deAuditoria$()` con `criteriosPorEstado` y
   `fallosPorCategoria`, con sus unitarios. Nada los pinta todavía: la app, la exportación y
   sus tests siguen igual.
2. Crear `AppDistribucionBarras` con sus unitarios. Nada lo usa todavía.
3. Migrar el ranking de páginas de `auditoria-progreso.html` a `AppDistribucionBarras`: barras
   `aria-hidden`, unidad en `sr-only` y nombres sin truncar.
4. Añadir los bloques «Estado de los criterios» y «Fallos por principio WCAG», el aviso de «sin
   hallazgos» y el unitario de `AuditoriaProgreso`.
5. Escribir `e2e/panel-progreso.spec.ts`, con las cifras y el escaneo de axe.
6. Pasar `lint`, `test`, `test:api` y `e2e`, revisar el panel a 320 px y actualizar la fila 14
   de `specs/README.md`.

## Criterios de aceptación

- El panel muestra, en este orden, los encabezados `<h2>` «Revisado», «Estado de los
  criterios», «Fallos por severidad», «Fallos por principio WCAG» y «Páginas con más
  incidencias».
- En «Estado de los criterios», las cuatro cifras suman páginas × criterios del catálogo, y un
  criterio que no se ha tocado nunca cuenta en «Por revisar».
- En «Fallos por principio WCAG», las cuatro cifras suman lo mismo que las de «Fallos por
  severidad». Un criterio con dos hallazgos suma 2 a su principio.
- Con los datos del e2e (1.1.1 Falla/Alta, 2.1.1 Falla/Crítica, 3.1.1 Pasa), el panel muestra
  Falla 2, Pasa 1, No aplica 0, Crítica 1, Alta 1, Perceptible 1, Operable 1, Comprensible 0,
  Robusto 0 y la página con 2 en el ranking.
- En una auditoría sin hallazgos, los cinco bloques aparecen con cifras a 0 donde toca, y los
  de severidad y principio muestran «Todavía no hay hallazgos registrados.».
- Ninguna barra de distribución se expone al árbol de accesibilidad (`aria-hidden="true"`), y
  cada cifra se lee con su unidad (p. ej. «2 criterios en falla»).
- Cada fila de las distribuciones muestra su etiqueta en texto: ninguna depende solo del color.
- A 320 px de ancho, el panel no tiene scroll horizontal y los nombres de página largos se leen
  completos.
- El escaneo de axe del e2e sobre el panel con datos no devuelve violaciones.
- El PDF y el Excel exportados son idénticos a los de antes de esta rebanada: los tests de
  `exportacion-pdf.spec.ts` y `exportacion-excel.spec.ts` pasan sin cambios.
- `npm run lint`, `npm test`, `npm run test:api` y `npm run e2e` pasan sin fallos.
- `specs/README.md` enlaza la fila 14 a `14-panel-progreso.md` con su estado.

## Decisiones tomadas y descartadas

- **Sí: contar hallazgos en la distribución por principio.** Es la misma unidad que «Fallos por
  severidad», así que los dos bloques suman lo mismo y se pueden comparar. **No: contar
  criterios en Falla**, que es lo que hace el ranking de páginas. Así el ranking se queda como
  está, y su unidad se explicita en el texto para que no se confunda.
- **Sí: barras CSS con la cifra en texto, en un componente compartido
  (`AppDistribucionBarras`).** No añade dependencias, las tres distribuciones se ven igual y la
  información está en el texto, así que no hace falta una alternativa aparte. **No: una tabla
  `sr-only` paralela a barras decorativas**, porque duplica los datos y puede desincronizarse.
  **No: Chart.js ni un `<canvas>`**, que añade una dependencia y obliga a crear la alternativa
  textual a mano.
- **Sí: el desglose por estado, en el orden Falla, Pasa, No aplica, Por revisar.** Lo
  accionable va primero y lo pendiente al final. Reutiliza las etiquetas y los colores de estado
  de `pagina-checklist`.
- **Sí: calcularlo todo en `ProgresoService.deAuditoria$()`.** Ya lee los `Resultado` y los
  `Hallazgo` de cada página, así que no hace falta otra consulta a Dexie. **No: un servicio o un
  observable nuevo por bloque**, que repetiría esas mismas suscripciones.
- **Sí: pintar siempre todos los bloques, a 0 si hace falta, con un aviso de texto.** La
  estructura de encabezados es estable y se navega igual con o sin datos. **No: ocultar los
  bloques vacíos.**
- **Sí: corregir la accesibilidad del ranking existente en esta rebanada**, porque lo
  sustituye el mismo componente que los bloques nuevos.
- **No: llevar las distribuciones a la exportación**, ni el % por página, ni enlaces desde el
  panel: se han dejado fuera explícitamente para acotar la rebanada.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Un `Hallazgo` cuyo `Resultado` no aparece entre los de su página, o cuyo `criterio_codigo` no está en el catálogo, no tiene principio, y entonces la suma por principio no cuadra con la de severidad | Por construcción no debería pasar: los hallazgos se leen por página desde sus resultados. Un unitario fija el comportamiento: ese hallazgo no se cuenta en ningún principio, y el servicio no lanza ningún error |
| Añadir campos a `ProgresoAuditoria` rompe algún objeto literal tipado en los tests o en `informe-datos.ts` | Se amplían `PROGRESO_VACIO` y los `initialValue`. El compilador señala cualquier literal incompleto en el paso 1 |
| El texto del e2e depende del número de criterios del catálogo (por el «Por revisar») | El e2e calcula ese valor como el total que muestra el panel − 3, en vez de fijar la cifra a mano |
| Inyectar axe-core desde `node_modules` depende de la ruta del paquete | Se resuelve con `require.resolve('axe-core')`, sin añadir `@axe-core/playwright` |
