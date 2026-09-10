# Auditorías A11y

App para agilizar auditorías manuales de accesibilidad web (WCAG 2.2 AA),
sustituyendo el flujo actual en Excel. Combina un escaneo automático inicial
(axe-core) con la revisión experta manual, y añade una biblioteca de
hallazgos reutilizables para no reescribir errores ya detectados.

## Dónde empezar

- El documento de producto completo está en
  [`specs/00-producto.md`](./specs/00-producto.md): objetivo, alcance,
  funcionalidades, modelo de datos y stack técnico.
- El proyecto se construye por rebanadas verticales, cada una con su spec
  en `specs/`. El orden y el estado de cada una están en
  [`specs/README.md`](./specs/README.md).
- Las convenciones de trabajo (cómo se escribe cada spec de rebanada, una
  rebanada = una rama = un PR) están en [`CLAUDE.md`](./CLAUDE.md).

## Stack

Angular + TypeScript · Angular CDK a11y · Dexie.js (IndexedDB) · axe-core ·
SheetJS / jsPDF · Vercel o Netlify.

## Estado actual

Fase de especificación. Siguiente paso: rebanada 01 — fundación (ver
[`specs/01-fundacion.md`](./specs/01-fundacion.md)).
