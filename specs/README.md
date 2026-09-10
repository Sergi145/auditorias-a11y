# Índice de specs

`00-producto.md` es el documento de producto (fuente de verdad). El resto son
rebanadas verticales de implementación, en el orden pensado para construirse.

| # | Spec | Estado | Qué entrega |
|---|------|--------|-------------|
| 00 | [00-producto.md](./00-producto.md) | Referencia | Visión, alcance, modelo de datos completo, stack |
| 01 | [01-fundacion.md](./01-fundacion.md) | Construido | Esqueleto Angular + Dexie con el esquema completo, routing base |
| 02 | [02-maqueta-m3.md](./02-maqueta-m3.md) | Approved | Prototipo navegable de las 12 pantallas, sin lógica, estilo Material Design 3 |
| 03 | 03-catalogo-wcag.md | Pendiente | Dataset de criterios WCAG 2.2 A/AA cargado y consultable |
| 04 | 04-auditorias-paginas.md | Pendiente | CRUD de auditorías y páginas |
| 05 | 05-checklist-manual.md | Pendiente | Marcar estado/severidad/notas por criterio — con esto la app ya sustituye al Excel |
| 06 | 06-catalogo-componentes.md | Pendiente | Desplegable de componentes: seed Bootstrap + añadir propios |
| 07 | 07-biblioteca-hallazgos.md | Pendiente | Guardar y sugerir hallazgos reutilizables (depende de 05 y 06) |
| 08 | 08-exportacion.md | Pendiente | Export a Excel primero, PDF después |
| 09 | 09-escaneo-axe.md | Pendiente | axe-core client-side, luego función serverless para URLs |
| 10 | 10-panel-progreso.md | Pendiente | Dashboard de % completado y distribución de fallos |

Convención de cada spec de rebanada: qué entra / qué no entra todavía /
modelo de datos que toca / criterios de aceptación. Ver `CLAUDE.md` en la
raíz del repo para el detalle de la convención.
