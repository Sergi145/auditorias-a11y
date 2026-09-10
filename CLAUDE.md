# CLAUDE.md — Convenciones del repositorio

Este archivo orienta a cualquier asistente (o persona) que trabaje en este repo.

## Fuente de verdad

`specs/00-producto.md` es el documento de producto completo: objetivo, alcance,
funcionalidades, modelo de datos, stack técnico y criterios de aceptación del
MVP. Cualquier decisión de diseño que contradiga ese documento debe o bien
ajustarse al documento, o bien actualizar el documento primero — nunca
divergir en silencio.

## Convención de specs por rebanada

El producto completo NO se implementa de una sola vez. Se divide en
**rebanadas verticales** (vertical slices): cada una entrega algo que se
puede ejecutar y verificar, no una capa técnica aislada (nunca "solo el
backend" o "solo los estilos").

- Cada rebanada tiene su propio archivo `specs/NN-nombre.md`.
- Un spec de rebanada se escribe justo antes de empezar a construirla, no
  todas de golpe al inicio del proyecto — evita que se desincronicen del
  código real.
- Formato de cada spec de rebanada (una página, cuatro apartados):
  1. **Qué entra** — funcionalidad concreta que se implementa.
  2. **Qué NO entra todavía** — explícitamente fuera de esta rebanada, para
     evitar scope creep.
  3. **Modelo de datos que toca** — qué entidades de `00-producto.md` se
     crean o modifican.
  4. **Criterios de aceptación** — verificables, no ambiguos.
- Convención de trabajo: una rebanada = una rama = un pull request.

Ver `specs/README.md` para el índice y el orden de rebanadas.

## Stack técnico (resumen — el detalle está en 00-producto.md §7)

- Frontend: Angular + TypeScript, componentes standalone, Reactive Forms.
- Accesibilidad de la propia app: Angular CDK `a11y`.
- Persistencia: IndexedDB vía Dexie.js (MVP local-first).
- Escaneo automático: axe-core (client-side) + función serverless con
  Playwright para URLs en vivo.
- Exportación: SheetJS (xlsx), jsPDF (PDF).
- Hosting: Vercel o Netlify.
- Testing: Jasmine/Karma o Jest (unitario), Playwright (e2e).

## Principio guía

La app es en sí misma una herramienta de accesibilidad — debe cumplir
WCAG 2.2 AA sobre sí misma en todo momento (dogfooding). Cualquier
componente nuevo se valida con axe antes de darse por terminado.
