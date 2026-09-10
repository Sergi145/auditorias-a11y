# Spec — App de Auditorías de Accesibilidad

## 1. Objetivo

Sustituir el flujo actual en Excel por una aplicación web que agilice las auditorías manuales de accesibilidad, cubriendo hasta WCAG 2.2 nivel AA, combinando un escaneo automático inicial (axe-core) con la revisión experta manual (teclado, lector de pantalla, criterio de cumplimiento real) que ya se realiza hoy. Sirve además como proyecto de portfolio orientado a roles frontend/UX/QA.

## 2. Alcance

- Uso individual (un auditor), sin multiusuario en el MVP.
- Interfaz en español.
- Pensada para auditar sitios institucionales/gubernamentales y sitios genéricos por igual.
- Alcance normativo: hasta WCAG 2.2 nivel AA (no incluye AAA en el MVP).
- Funciona sin backend obligatorio (local-first); backend opcional en fase 2 para sincronización/colaboración.

## 3. Problema con el Excel actual

- No hay estructura relacional (criterio ↔ página ↔ evidencia ↔ estado): todo son celdas sueltas.
- No hay escaneo automático previo: cada auditoría empieza de cero.
- No hay generación de informe formateado: hay que maquetar a mano.
- Difícil trazar progreso (% completado, criterios pendientes, severidad agregada).
- No hay adjuntos de evidencia (capturas) vinculados al criterio concreto.

## 4. Alcance MVP vs Fase 2

**MVP (uso personal, local-first):**
- Gestión de auditorías y páginas/componentes auditados.
- Checklist WCAG 2.2, niveles A y AA, por página.
- Escaneo automático con axe-core (client-side, sobre HTML pegado o URL vía función serverless).
- Registro manual por criterio: estado, severidad, notas, evidencia (capturas).
- Biblioteca de hallazgos reutilizables: guardar la redacción de un error ya detectado y reutilizarla en futuras auditorías sin volver a escribirla.
- Exportación a PDF y Excel.
- Panel de progreso por auditoría.

**Fase 2 (opcional, más adelante):**
- Backend con Supabase: multi-dispositivo, compartir auditorías con clientes/equipo.
- Comparativa histórica (re-auditorías: qué mejoró/empeoró entre versiones).
- Plantillas de informe personalizables por cliente.
- Roles/permisos si hay más de un auditor.

## 5. Funcionalidades detalladas

### 5.1 Gestión de auditorías
- Crear/editar/archivar una auditoría (nombre, cliente, URL base, fecha, nivel objetivo: A o AA — el máximo cubierto es WCAG 2.2 AA, sin AAA).
- Añadir varias páginas o componentes dentro de una misma auditoría.
- Vista de listado con estado global (% completado, nº de fallos por severidad).

### 5.2 Checklist WCAG
- Catálogo de criterios de éxito WCAG 2.2 (incluye los heredados de 2.1), niveles A y AA únicamente — código, nombre, nivel, descripción, técnicas relacionadas — precargado como dataset.
- Por cada página, cada criterio tiene: estado (Pasa / Falla / No aplica / Por revisar), severidad (si falla: crítica/alta/media/baja), notas libres, evidencia adjunta.
- Filtros: por nivel (A/AA/AAA), por estado, por severidad, por categoría (perceptible/operable/comprensible/robusto).

### 5.3 Escaneo automático (axe-core)
- Modo 1 — HTML pegado o cargado en iframe: ejecuta axe-core en el navegador y mapea los resultados a los criterios WCAG correspondientes, pre-rellenando el checklist como "Falla (automático)" o "Revisar".
- Modo 2 — URL en vivo: función serverless (Playwright + axe-core) que escanea la URL y devuelve el mismo mapeo.
- Los resultados automáticos quedan marcados como tal y requieren confirmación manual antes de considerarse definitivos (para no perder el criterio experto).

### 5.4 Revisión manual
- Formulario por criterio con: estado, severidad, notas, técnica de referencia (WAI-ARIA APG si aplica), campo para adjuntar capturas (drag & drop, guardadas localmente).
- Modo "solo pendientes" para revisar únicamente lo que el escaneo automático no cubre o marcó como "revisar".

### 5.5 Biblioteca de hallazgos reutilizables
- Cada vez que se redacta un hallazgo (descripción del error, por qué incumple, recomendación de solución) para un criterio, se puede guardar como **entrada reutilizable** vinculada a ese criterio WCAG, con etiquetas libres (ej. "botón sin aria-label", "contraste insuficiente", "focus no visible").
- Al redactar el hallazgo, un desplegable de **componente** permite clasificarlo (ej. "Modal", "Dropdown", "Navbar"). Ver 5.6 para el catálogo de componentes.
- Al marcar un criterio como "Falla" en cualquier auditoría futura, la app sugiere hallazgos guardados previamente para ese mismo criterio y/o componente (buscables por texto/etiqueta), y con un clic se insertan como base del nuevo registro — editable para adaptar el texto al caso concreto sin tocar la plantilla original.
- Vista de gestión de la biblioteca: listar, editar, fusionar o borrar entradas guardadas; filtrar por componente y por criterio; ver en cuántas auditorías se ha usado cada una.
- Opcional: al editar una redacción reutilizada, poder "actualizar la plantilla original" además de guardar el cambio solo en esa instancia.

### 5.6 Catálogo de componentes
> Nota: este catálogo clasifica los componentes de los **sitios auditados** (lo que se revisa). Es independiente del sistema de diseño de la propia app, ver §7.
- Desplegable de componentes disponible al redactar un hallazgo, para clasificarlo por el tipo de componente UI afectado (además del criterio WCAG).
- Precargado con el catálogo por defecto de componentes de Bootstrap (Accordion, Alert, Badge, Breadcrumb, Button, Button group, Card, Carousel, Close button, Collapse, Dropdown, List group, Modal, Navbar, Navs & tabs, Offcanvas, Pagination, Placeholder, Popover, Progress, Scrollspy, Spinner, Toast, Tooltip, campos de formulario — input/select/checkbox/radio/switch —, y Tabla).
- El usuario puede añadir componentes propios no incluidos en el catálogo base (ej. patrones custom, componentes de otros frameworks de UI), quedando disponibles igual que los precargados para futuras clasificaciones.
- Vista de gestión del catálogo: listar, renombrar o borrar componentes añadidos manualmente (los del catálogo base de Bootstrap no se pueden borrar, solo ocultar si no se usan).

### 5.7 Exportación de informes
- Export a Excel (.xlsx) con la misma estructura que el Excel actual, para no romper el hábito de quien lo reciba.
- Export a PDF con formato de informe (resumen ejecutivo, tabla de hallazgos por severidad, detalle por criterio con capturas).

### 5.8 Panel de progreso
- Vista resumen por auditoría: % de criterios revisados, distribución de fallos por severidad y por categoría WCAG, páginas con más incidencias.

## 6. Modelo de datos (entidades principales)

- **Auditoria**: id, nombre, cliente, url_base, fecha_inicio, estandar_objetivo, estado.
- **Pagina**: id, auditoria_id, nombre, url, notas_generales.
- **CriterioWCAG** (catálogo estático): codigo, nombre, nivel, categoria, descripcion, tecnicas.
- **Resultado**: id, pagina_id, criterio_codigo, componente_id (opcional), estado, severidad, origen (manual/automático), notas, hallazgo_plantilla_id (opcional, referencia a la biblioteca), fecha_revision.
- **Evidencia**: id, resultado_id, tipo (captura/nota), archivo o texto.
- **HallazgoPlantilla** (biblioteca reutilizable): id, criterio_codigo, componente_id (opcional), titulo, descripcion, recomendacion_fix, severidad_tipica, etiquetas, veces_usado, fecha_creacion.
- **Componente** (catálogo, precargado con Bootstrap + ampliable): id, nombre, origen (bootstrap/personalizado), visible.

## 7. Stack técnico propuesto

- **Frontend**: Angular + TypeScript, componentes standalone, Reactive Forms para el checklist.
- **Diseño / UI**: Material Design 3 (https://m3.material.io/foundations) vía Angular Material — tema M3 (color, tipografía, forma) configurado sobre los tokens oficiales. El comportamiento interactivo se apoya en la accesibilidad nativa de Angular Material más Angular CDK `a11y` donde haga falta complementarla. (Independiente del catálogo de componentes Bootstrap de §5.6, que clasifica lo auditado, no la UI propia. Sustituye la decisión previa de GOV.UK Design System, ver `specs/02-maqueta-m3.md`.)
- **Accesibilidad de la propia app**: Angular CDK `a11y` (`LiveAnnouncer`, `FocusTrap`, `FocusMonitor`, `ListKeyManager`).
- **Persistencia**: IndexedDB vía Dexie.js (MVP local-first); Supabase (Postgres) en fase 2.
- **Escaneo automático**: axe-core (client-side) + función serverless con Playwright + axe-core para URLs en vivo.
- **Exportación**: SheetJS (xlsx), jsPDF o similar (PDF).
- **Hosting**: Vercel o Netlify (estático + función serverless).
- **Testing**: Jasmine/Karma o Jest (unitario), Playwright (end-to-end) — también como señal de competencia QA en el propio portfolio.

## 8. Requisitos no funcionales

- La propia aplicación debe cumplir WCAG 2.2 AA (dogfooding: es una app de accesibilidad, tiene que dar ejemplo).
- Responsive (uso también en portátil durante auditorías de campo).
- Funcionamiento offline en el MVP (todo local, sin dependencia de red salvo el escaneo de URL).
- Rendimiento: checklist con ~50-80 criterios por página debe cargar y filtrar sin lag perceptible.
- Datos exportables en cualquier momento (no vendor lock-in del propio auditor).

## 9. Flujo de usuario principal

1. Crear auditoría (nombre, cliente, estándar objetivo).
2. Añadir página(s) a auditar.
3. Ejecutar escaneo automático (pegar HTML o URL) → checklist se pre-rellena.
4. Revisar manualmente cada criterio pendiente/marcado: si el criterio falla, se elige el componente afectado en el desplegable (catálogo Bootstrap + propios) y la app sugiere hallazgos ya guardados para ese criterio y/o componente; se reutiliza o se escribe uno nuevo (y se puede guardar en la biblioteca para el futuro), añadiendo severidad, notas y capturas.
5. Consultar panel de progreso.
6. Exportar informe (Excel y/o PDF) para el cliente.

## 10. Criterios de aceptación del MVP

- Se puede crear una auditoría con al menos una página y completar el checklist WCAG 2.2 AA de principio a fin sin salir de la app.
- El escaneo automático pre-rellena al menos los criterios cubiertos por axe-core (~30-40% del total típico).
- Se puede exportar un informe en Excel y en PDF con los datos introducidos.
- Los datos persisten entre sesiones sin backend (recarga de página no pierde la auditoría).
- La app pasa una auditoría de accesibilidad básica sobre sí misma (sin errores críticos de axe).
- Un hallazgo guardado en una auditoría aparece como sugerencia reutilizable al marcar el mismo criterio como "Falla" en una auditoría distinta, sin tener que volver a escribirlo desde cero.
- El desplegable de componente incluye el catálogo por defecto de Bootstrap desde el primer uso, y permite añadir un componente nuevo que queda disponible para siguientes hallazgos sin reiniciar la app.

## 11. Roadmap posterior

- Sincronización multi-dispositivo (Supabase).
- Comparativa entre auditorías del mismo sitio en el tiempo.
- Plantillas de informe por cliente/marca.
- Soporte multi-auditor con roles.
