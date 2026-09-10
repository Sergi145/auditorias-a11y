# 02 — Maqueta completa (Material Design 3)

**Estado:** Implemented
**Depende de:** Spec 01 (Fundación)
**Fecha:** 2026-09-10

## Objetivo de esta rebanada

Construir un prototipo navegable de las 12 pantallas de la aplicación, con
datos ficticios y el sistema de diseño Material Design 3, sin ninguna lógica
de negocio real, para validar la UX completa de principio a fin antes de
implementar cada rebanada funcional.

## Excepción a la convención de rebanadas verticales

`CLAUDE.md` establece que cada rebanada entrega funcionalidad real de punta a
punta, nunca "solo una capa técnica aislada". Esta rebanada es una excepción
deliberada a esa regla: es una maqueta horizontal (UI + navegación, sin
lógica) que cruza todas las rebanadas de negocio futuras (03 a 10). Se
justifica porque valida la UX y el sistema de diseño una sola vez, en vez de
rehacerla en cada rebanada funcional. Las rebanadas 03+ sustituirán el mock
data de cada pantalla por lógica real, reutilizando la plantilla visual
construida aquí.

## Cambio de sistema de diseño (actualiza 00-producto.md)

`00-producto.md §7` fijaba GOV.UK Design System (`govuk-frontend`) como
sistema de diseño. Esta rebanada formaliza el cambio a **Material Design 3**
(vía Angular Material) como nueva decisión de producto. `00-producto.md` se
actualiza en el mismo cambio que esta spec, no diverge en silencio.

## Qué entra

- Instalación de `@angular/material` (soporte M3 nativo) y configuración de
  un tema M3 (esquema de color, tipografía, forma) mediante los tokens de
  https://m3.material.io/foundations.
- Desinstalación de `govuk-frontend` y eliminación de sus imports SCSS de
  01-fundacion.
- Shell de navegación M3: **top app bar** + **navigation drawer** lateral
  persistente en escritorio/tablet, colapsable a drawer modal en móvil, con
  enlaces a las tres secciones principales (Auditorías, Biblioteca,
  Componentes).
- Servicio de datos mock (`src/app/core/mock-data.service.ts`) con arrays de
  ejemplo de auditorías, páginas, criterios WCAG, resultados, hallazgos y
  componentes — pensado para sustituirse por Dexie real en rebanadas
  futuras sin tocar las plantillas.
- 12 pantallas navegables, todas en español, con routing real (`RouterLink`,
  rutas con parámetros) pero **sin persistencia ni mutación de datos**:
  formularios que no guardan, botones de acción que no ejecutan lógica.

  | # | Ruta | Pantalla |
  |---|------|----------|
  | 1 | `/auditorias` | Listado de auditorías (estado global, % completado, fallos por severidad) |
  | 2 | `/auditorias/nueva` | Crear auditoría (nombre, cliente, url base, fecha, nivel objetivo) |
  | 3 | `/auditorias/:id` | Detalle de auditoría (listado de páginas) |
  | 4 | `/auditorias/:id/paginas/nueva` | Añadir página |
  | 5 | `/auditorias/:id/paginas/:paginaId` | Checklist WCAG de la página (filtros por nivel/estado/severidad/categoría) |
  | 6 | `/auditorias/:id/paginas/:paginaId/escaneo` | Escaneo automático (pegar HTML o URL) |
  | 7 | `/auditorias/:id/paginas/:paginaId/criterios/:codigo` | Formulario de revisión manual de un criterio |
  | 8 | `/biblioteca` | Listado de hallazgos reutilizables |
  | 9 | `/biblioteca/:id` | Detalle/edición de un hallazgo |
  | 10 | `/componentes` | Catálogo de componentes (Bootstrap + propios) |
  | 11 | `/auditorias/:id/progreso` | Panel de progreso |
  | 12 | `/auditorias/:id/exportar` | Exportación (Excel/PDF) |

- Reemplazo de los stubs "Próximamente" y el layout GOV.UK de 01-fundacion
  por el shell y las pantallas nuevas en M3.

## Qué NO entra todavía

- Persistencia real: nada se guarda en Dexie desde estas pantallas (eso
  llega rebanada a rebanada: 03-auditorias-paginas, 04-checklist-manual,
  etc., que sustituyen el mock data por datos reales).
- axe-core, escaneo real, exportación real a Excel/PDF (las pantallas 6 y 12
  son solo el layout del flujo, sin ejecutar nada).
- Biblioteca de hallazgos funcional (sugerencias reales, guardado) —
  pantallas 8 y 9 son solo listado/detalle visual con datos de ejemplo.
- Catálogo de componentes funcional (añadir/renombrar/borrar reales).
- Autenticación o backend — no aplica al MVP local-first.

## Modelo de datos que toca

Ninguno nuevo. Se usan las entidades ya declaradas en el esquema Dexie de
01-fundacion (`Auditoria`, `Pagina`, `CriterioWCAG`, `Resultado`,
`Evidencia`, `HallazgoPlantilla`, `Componente`) únicamente como forma para
los objetos mock del `MockDataService` — no se leen ni escriben en Dexie
desde esta rebanada.

## Plan de implementación

1. Instalar `@angular/material`, desinstalar `govuk-frontend`; quitar los
   imports SCSS de GOV.UK que dejó 01-fundacion.
2. Configurar el tema M3 (color, tipografía, forma) según
   https://m3.material.io/foundations en los estilos globales.
3. Construir el shell (`src/app/shared/shell/`): top app bar + navigation
   drawer, con las rutas de navegación a Auditorías, Biblioteca y
   Componentes.
4. Crear `MockDataService` en `src/app/core/` con datos de ejemplo para
   todas las entidades.
5. Sustituir los tres stubs de 01-fundacion (`/auditorias`, `/biblioteca`,
   `/componentes`) por las pantallas reales de listado (1, 8, 10),
   alimentadas por `MockDataService`.
6. Construir el resto de pantallas de auditorías y páginas (2, 3, 4, 5, 6,
   7, 11, 12) y registrar sus rutas, incluidas las rutas con parámetros.
7. Enlazar la navegación entre pantallas (ej. desde el listado de
   auditorías se entra al detalle, desde el detalle a una página, desde la
   página a un criterio) para que el prototipo sea recorrible de principio
   a fin sin callejones sin salida.
8. Verificar accesibilidad básica (axe, extensión de navegador) sobre cada
   pantalla nueva.

## Criterios de aceptación

- `npm start` levanta la app sin errores en consola.
- Las 12 rutas de la tabla anterior son navegables desde la UI (no solo
  tecleando la URL): existe al menos un enlace visible que lleva a cada una.
- El shell (top app bar + navigation drawer) está presente en todas las
  pantallas y permite moverse entre Auditorías, Biblioteca y Componentes.
- Ninguna pantalla ejecuta lógica real: los formularios no persisten datos
  al recargar, los botones de acción (escanear, exportar, guardar hallazgo)
  no tienen efecto más allá de la navegación.
- `govuk-frontend` no aparece en `package.json` ni en ningún import.
- `npm run lint` y `npm test` corren sin fallos.
- El smoke test de Playwright existente sigue pasando (adaptado si el shell
  cambia el layout raíz que verificaba).
- Un escaneo de axe (extensión de navegador) sobre cada pantalla no
  devuelve errores críticos.
- `00-producto.md §7` refleja Material Design 3 + Angular Material como
  sistema de diseño, no GOV.UK.

## Decisiones tomadas y descartadas

- **Material Design 3 sustituye a GOV.UK Design System** como sistema de
  diseño del proyecto. Decisión tomada en esta rebanada a petición
  explícita del usuario; `00-producto.md` se actualiza en el mismo cambio
  para no divergir en silencio.
- **Excepción documentada a la convención de rebanadas verticales**: esta
  rebanada es intencionadamente horizontal (todas las pantallas, sin
  lógica) para validar la UX completa una sola vez. Las rebanadas 03+
  sustituyen el mock data por lógica real pantalla a pantalla.
- **Angular Material** (librería) en vez de CSS a medida con tokens M3
  escritos a mano — reutiliza el soporte M3 nativo de la librería y ya
  integra accesibilidad con Angular CDK `a11y`, evitando reconstruir
  componentes accesibles desde cero.
- **`govuk-frontend` se desinstala**, no se deja instalado sin usar — evita
  código muerto y dependencias fantasma en `package.json`.
- **Servicio mock centralizado** (`MockDataService`) en vez de datos
  hardcodeados por componente — facilita sustituir mock por Dexie real en
  rebanadas futuras sin tocar las plantillas.
- **Numeración**: esta maqueta toma el número 02 (siguiente secuencial tras
  01-fundacion), desplazando el resto del roadmap pendiente un número
  (antes 02-09, ahora 03-10). Se actualiza `specs/README.md` en el mismo
  cambio.
- **Prototipo navegable, no solo maquetación visual estática**: se prefirió
  routing real con Angular sobre imágenes/wireframes estáticos, porque el
  objetivo incluye validar los flujos de navegación entre pantallas, no
  solo el aspecto visual de cada una por separado.

## Riesgos identificados

- Al sustituir el shell y las pantallas de 01-fundacion (marcada como
  "Construido"), el smoke test de Playwright y el layout que verificaba
  pueden romperse — hay que adaptarlos, no solo dejarlos fallar.
- Angular Material aplica su propia capa de accesibilidad (roles, gestión
  de foco); conviene revisar que no choque con el uso previsto de CDK
  `a11y` "a pelo" descrito en `00-producto.md §7` para el resto de la app.
