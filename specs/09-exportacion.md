# 09 — Exportación de auditorías a Excel y PDF

**Estado:** Implemented
**Depende de:** Spec 05 (Auditorías y páginas), Spec 06 (Checklist manual), Spec 07 (Catálogo de componentes)
**Fecha:** 2026-09-16

## Objetivo de esta rebanada

Conectar los dos botones ya maquetados de `/auditorias/:id/exportar` (pantalla
12 de `specs/02-maqueta-m3.md`) para generar y descargar el informe real de
una auditoría completa: primero Excel (`.xlsx`, SheetJS), después PDF
(jsPDF + jspdf-autotable), sustituyendo el toast placeholder
("la exportación a Excel/PDF llega en la rebanada 09-exportacion") por
archivos reales generados a partir de los datos de Dexie.

## Qué entra

- Instalar las dependencias `xlsx` (SheetJS), `jspdf` y `jspdf-autotable`
  (ninguna estaba en `package.json` antes de esta rebanada).
- **`InformeDatosService`** (`src/app/core/informe-datos.ts`): ensambla,
  para una auditoría, todo lo que necesitan tanto el Excel como el PDF, para
  no duplicar consultas entre los dos servicios de exportación:
  - La `Auditoria` y sus `Pagina`s.
  - Por cada página, el checklist completo: los criterios de
    `CriteriosWcagService.todos()` cruzados con los `Resultado` ya guardados
    de esa página; un criterio sin `Resultado` guardado se trata como
    `estado: 'por_revisar'` implícito (mismo criterio que ya usa
    `ProgresoService` para calcular `revisados`).
  - Los `Hallazgo`s de cada `Resultado` en estado `falla`, con el nombre de
    `componente_id` ya resuelto vía `ComponentesService.todos$()` (no
    `visibles$()`, para que el nombre se siga mostrando aunque el componente
    esté oculto — mismo patrón que `componenteNombre()` en
    `criterio-revision`, ver `07-catalogo-componentes.md`).
  - El progreso de la auditoría, reutilizando
    `ProgresoService.deAuditoria$()` (% revisado, fallos por severidad) en
    vez de recalcularlo.
- **`ExportacionExcelService`** (`src/app/core/exportacion-excel.ts`):
  `generar(auditoriaId): Promise<void>` construye el libro con SheetJS a
  partir de `InformeDatosService` y dispara la descarga
  (`XLSX.writeFile`). Dos hojas:
  - **"Checklist"**: una fila por criterio × página (todos los criterios
    WCAG de cada página, incluidos los que no tienen `Resultado` guardado).
    Columnas: página, código de criterio, nombre de criterio, nivel,
    categoría, estado.
  - **"Hallazgos"**: una fila por `Hallazgo` (de los resultados en
    `falla`). Columnas: página, código de criterio, severidad, componente
    (nombre resuelto o vacío si no se asignó), notas.
- **`ExportacionPdfService`** (`src/app/core/exportacion-pdf.ts`):
  `generar(auditoriaId): Promise<void>` construye el PDF con jsPDF y
  dispara la descarga (`doc.save(...)`):
  - Resumen ejecutivo: nombre de la auditoría, cliente, estándar objetivo,
    % revisado, fallos por severidad, fecha de generación del informe.
  - Tabla de hallazgos por severidad (vía `jspdf-autotable`): una fila por
    `Hallazgo`, ordenada por severidad (crítica → alta → media → baja),
    con página, criterio, componente y notas.
  - Detalle por criterio en `falla`, agrupado por página: código y nombre
    del criterio, y sus hallazgos (severidad, componente, notas). Sin
    capturas/imágenes (ver "Qué NO entra todavía").
- **`auditoria-exportar.ts`/`.html`**: los dos botones llaman a los
  servicios reales en vez de mostrar el toast placeholder.
  - Mientras se genera cada archivo, el botón pulsado pasa a estado
    "Generando…" y queda deshabilitado; al terminar, un toast (mismo
    `ToastService` que ya usa esta pantalla) confirma la descarga o informa
    del error si algo falla.
  - Ambos botones aparecen deshabilitados, con un mensaje visible junto a
    ellos explicando el motivo, si la auditoría no tiene páginas o ninguna
    de sus páginas tiene al menos un `Resultado` guardado.
- Nombre del archivo descargado: `<slug-del-nombre-de-la-auditoria>-<fecha-de-generación
  en formato YYYY-MM-DD>.xlsx` / `.pdf` (slug: minúsculas, sin acentos,
  espacios y símbolos sustituidos por guiones).
- **`specs/README.md`**: marcar la fila 09 como "Implemented" y enlazarla.

## Qué NO entra todavía

- **Capturas de evidencia en el PDF**: `Evidencia` (captura/nota) está
  definida en el modelo y el esquema Dexie desde `01-fundacion.md`, pero no
  existe todavía ningún `EvidenciasService` ni pantalla para subirlas —
  añadir esa funcionalidad aquí duplicaría el alcance de esta rebanada. El
  PDF de esta spec es solo texto.
- **Exportar una sola página suelta**: solo se exporta la auditoría
  completa (todas sus páginas en un archivo), coherente con la pantalla ya
  maquetada, que no pide elegir página.
- **Plantillas de informe personalizables por cliente** (Fase 2,
  `00-producto.md §4`).
- **Comparativa histórica entre auditorías** (Fase 2).
- **Envío del informe** (email, subida a la nube): solo descarga local del
  archivo generado.
- **Datos de `HallazgoPlantilla` (biblioteca) en el informe exportado**: el
  hallazgo exportado documenta el caso concreto (severidad, componente,
  notas), no el título ni el `veces_usado` de la plantilla reutilizable de
  la que pudo partir.
- Escaneo automático con axe-core — sigue en `10-escaneo-axe`.
- Panel de progreso como pantalla propia — sigue en `14-panel-progreso`;
  esta spec solo reutiliza `ProgresoService`, ya existente, para las cifras
  del resumen ejecutivo del informe.

## Modelo de datos que toca

No introduce entidades nuevas ni cambia los campos de `Auditoria`, `Pagina`,
`CriterioWCAG`, `Resultado`, `Hallazgo` ni `Componente` (ya definidos en
`00-producto.md §6`). El único punto no trivial es de lectura, no de
esquema: un criterio sin `Resultado` guardado en Dexie (la tabla
`resultados` solo tiene fila una vez que el usuario guarda su primera
revisión de ese criterio, ver `resultados.ts`) se trata como
`estado: 'por_revisar'` implícito al generar el Checklist del Excel y el
resumen del PDF — mismo criterio implícito que ya usa `ProgresoService`.

## Plan de implementación

1. Instalar `xlsx`, `jspdf` y `jspdf-autotable` (`npm install`).
2. **`InformeDatosService`**: ensambla la estructura completa de datos de
   una auditoría (auditoría, páginas, checklist completo por página con
   resultados implícitos, hallazgos con nombre de componente resuelto,
   progreso). Tests unitarios: un criterio sin `Resultado` se mapea a
   `'por_revisar'`, los hallazgos se agrupan bajo el resultado correcto, el
   nombre de un componente oculto se sigue resolviendo.
3. **`ExportacionExcelService`**: genera el libro con las dos hojas a partir
   de `InformeDatosService` y dispara la descarga. Tests unitarios de la
   forma de las filas generadas (no del archivo binario en sí). Conecta el
   botón "Exportar a Excel" de `auditoria-exportar` (estado "Generando…",
   toast de éxito/error) — al terminar este paso, la exportación a Excel
   funciona de extremo a extremo.
4. **`ExportacionPdfService`**: genera el PDF (resumen ejecutivo, tabla de
   hallazgos con `jspdf-autotable`, detalle por criterio en falla agrupado
   por página) y dispara la descarga. Conecta el botón "Exportar a PDF" con
   el mismo patrón de estado/toast — al terminar este paso, ambos formatos
   funcionan.
5. **`auditoria-exportar.ts`/`.html`**: deshabilitar ambos botones (con
   mensaje visible) cuando la auditoría no tiene páginas o ninguna tiene un
   `Resultado` guardado.
6. **`specs/README.md`**: marcar la fila 09 como "Implemented" y enlazarla.
7. **Verificación de accesibilidad**: el estado "Generando…" y los botones
   deshabilitados con su motivo, revisados con teclado y lector de
   pantalla; escaneo de axe (extensión de navegador) sobre
   `/auditorias/:id/exportar` en sus dos estados (con datos exportables, y
   deshabilitada por falta de datos).

## Criterios de aceptación

- Pulsar "Exportar a Excel" en una auditoría con al menos una página y un
  `Resultado` guardado descarga un `.xlsx` con dos hojas: "Checklist" (una
  fila por criterio × página, todos los criterios WCAG de cada página,
  incluidos los que aparecen como "Por revisar" sin `Resultado` guardado) y
  "Hallazgos" (una fila por `Hallazgo`, con página, criterio, severidad,
  componente y notas).
- Pulsar "Exportar a PDF" descarga un `.pdf` con resumen ejecutivo (nombre,
  cliente, estándar objetivo, % revisado, fallos por severidad, fecha de
  generación), una tabla de hallazgos por severidad y un detalle por
  criterio en "Falla" agrupado por página, con sus hallazgos.
- El nombre del archivo descargado sigue el patrón
  `<slug-del-nombre-de-la-auditoria>-<fecha-de-generación>.xlsx` / `.pdf`.
- Si la auditoría no tiene páginas, o ninguna de sus páginas tiene al menos
  un `Resultado` guardado, ambos botones aparecen deshabilitados con un
  mensaje visible explicando el motivo.
- Mientras se genera cada archivo, el botón pulsado muestra el estado
  "Generando…" y queda deshabilitado; al terminar, un toast confirma la
  descarga (o el error, si algo falla).
- El PDF no incluye ninguna imagen o captura.
- `npm run lint` y `npm test` corren sin fallos.
- Un escaneo de axe (extensión de navegador) sobre
  `/auditorias/:id/exportar` no devuelve errores críticos.

## Decisiones tomadas y descartadas

- **Una sola spec para Excel y PDF, Excel primero y PDF después dentro del
  mismo plan**, en vez de dos specs separadas: coincide con
  `specs/README.md` ("09 | Export a Excel primero, PDF después") y con el
  encargo original.
- **Solo exportación de la auditoría completa**, no por página individual:
  coincide con la pantalla ya maquetada, que no pide elegir página.
- **Excel en dos hojas (Checklist + Hallazgos)**, en vez de una sola hoja
  con los hallazgos concatenados en una celda de texto: refleja el modelo
  relacional real (un `Resultado` puede tener varios `Hallazgo`) sin
  aplastar datos en texto libre difícil de filtrar/ordenar en Excel.
- **Capturas de evidencia fuera de esta rebanada**: no existe todavía
  ningún `EvidenciasService` ni UI de subida — añadirlo aquí duplicaría el
  alcance de una funcionalidad que merece su propia spec.
- **Checklist del Excel incluye todos los criterios**, no solo los
  revisados: refleja fielmente el checklist completo de la app, igual que
  ya se ve en pantalla en `pagina-checklist`, útil para ver de un vistazo
  qué queda pendiente.
- **Detalle del PDF limitado a criterios en "Falla"**: un informe de
  auditoría se centra en los incumplimientos; incluir los ~50-80 criterios
  completos de cada página (la mayoría sin nada que reportar) produciría un
  PDF innecesariamente largo.
- **Botones deshabilitados (no archivo vacío) cuando la auditoría no tiene
  datos**: evita entregar un informe que parece vacío o roto en vez de un
  aviso claro de que aún no hay nada que exportar.
- **`jspdf-autotable` como dependencia adicional junto a `jsPDF`**: complemento
  estándar para tablas en jsPDF; evita maquetar filas/columnas a mano con
  coordenadas x/y, mucho más frágil ante cambios de contenido.
- **Nombre de archivo con fecha de generación**, no `fecha_inicio` de la
  auditoría: evita que descargas de distintos días se sobrescriban entre sí
  en la carpeta de Descargas.
- **`InformeDatosService` separado de los dos servicios de exportación**:
  Excel y PDF necesitan exactamente los mismos datos ensamblados (checklist
  completo + hallazgos + progreso); centralizar esa consulta evita duplicar
  lógica entre ambos, mismo principio de una responsabilidad por servicio
  que ya sigue el resto de `core/`.
- **Sin datos de `HallazgoPlantilla` en el informe exportado**: mismo
  criterio ya aplicado en `criterio-revision`, donde la tarjeta de un
  hallazgo guardado tampoco muestra qué plantilla usó (ver
  `08-biblioteca-hallazgos.md`).

## Riesgos identificados

- Generar el Excel/PDF de una auditoría grande (varias páginas × ~55-80
  criterios) en el hilo principal del navegador puede notarse como una
  pequeña congelación de la UI; el estado "Generando…" del botón mitiga la
  percepción, pero conviene medir con una auditoría de prueba con varias
  páginas antes de dar la rebanada por terminada.
- `jspdf-autotable` se registra como plugin de `jsPDF` vía efecto
  secundario de import (`import autoTable from 'jspdf-autotable'`) —
  verificar que `ng build` lo incluye correctamente y que no hay problemas
  de tree-shaking que lo dejen fuera del bundle de producción.
- El criterio "sin `Resultado` guardado ⇒ Por revisar" del Checklist del
  Excel debe coincidir exactamente con el mismo criterio implícito que ya
  usa `ProgresoService.deAuditoria$()` para calcular
  `revisados`/`porcentajeRevisado` — si diverge, el % del resumen ejecutivo
  del PDF y el nº de filas "Por revisar" del Excel podrían no cuadrar entre
  sí.
- Nombres de auditoría con caracteres especiales o vacíos podrían generar un
  nombre de archivo inválido o vacío tras el slug — verificar con un nombre
  real que incluya tildes, `/` o emoji.
