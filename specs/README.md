# Índice de specs

`00-producto.md` es el documento de producto (fuente de verdad). El resto son
rebanadas verticales de implementación, en el orden pensado para construirse.

| # | Spec | Estado | Qué entrega |
|---|------|--------|-------------|
| 00 | [00-producto.md](./00-producto.md) | Referencia | Visión, alcance, modelo de datos completo, stack |
| 01 | [01-fundacion.md](./01-fundacion.md) | Construido | Esqueleto Angular + Dexie con el esquema completo, routing base |
| 02 | [02-maqueta-m3.md](./02-maqueta-m3.md) | Implemented | Prototipo navegable de las 12 pantallas, sin lógica, estilo Material Design 3 |
| 03 | [03-catalogo-wcag.md](./03-catalogo-wcag.md) | Implemented | Dataset de criterios WCAG 2.2 A/AA cargado y consultable |
| 04 | [04-rediseno-tailwind.md](./04-rediseno-tailwind.md) | Implemented | Sustituye Angular Material por componentes propios + Tailwind en shell y las 12 pantallas |
| 05 | [05-auditorias-paginas.md](./05-auditorias-paginas.md) | Implemented | CRUD completo de auditorías y páginas sobre Dexie (antes mock) |
| 06 | [06-checklist-manual.md](./06-checklist-manual.md) | Implemented | Estado/severidad/notas reales por criterio (Resultado + Hallazgo en Dexie), con varios hallazgos por criterio en un collapse por fila del checklist cuando está en "Falla" |
| 07 | [07-catalogo-componentes.md](./07-catalogo-componentes.md) | Implemented | Desplegable de componentes: seed Bootstrap + añadir propios |
| 08 | [08-biblioteca-hallazgos.md](./08-biblioteca-hallazgos.md) | Implemented | Guardar y sugerir hallazgos reutilizables (depende de 06 y 07) |
| 09 | [09-exportacion.md](./09-exportacion.md) | Implemented | Exportación de la auditoría completa a Excel (.xlsx, dos hojas) y PDF (resumen ejecutivo + hallazgos + detalle por criterio), generados en el navegador desde los datos de Dexie |
| 10 | [10-cierre-menu-movil.md](./10-cierre-menu-movil.md) | Implemented | Botón de cierre visible, foco inicial, focus trap, Esc y devolución de foco en el menú de navegación móvil (`AppDrawer`) |
| 11 | 11-escaneo-axe.md | Pendiente | axe-core client-side, luego función serverless para URLs |
| 12 | 12-panel-progreso.md | Pendiente | Dashboard de % completado y distribución de fallos |

Convención de cada spec de rebanada: qué entra / qué no entra todavía /
modelo de datos que toca / criterios de aceptación. Ver `CLAUDE.md` en la
raíz del repo para el detalle de la convención.
