# 01 — Fundación

## Objetivo de esta rebanada

Dejar el esqueleto técnico del proyecto funcionando: workspace Angular
arrancable, base de datos local con el esquema completo declarado, routing
base y tooling de calidad (lint, formato, testing) configurado. No hay
todavía ninguna pantalla de negocio real — es la base sobre la que se
construyen el resto de rebanadas (ver `specs/README.md`).

## Qué entra

- Workspace Angular (standalone components, sin `NgModule` raíz) generado
  con Angular CLI, TypeScript en modo estricto.
- Estructura de carpetas inicial:
  - `src/app/core/` — servicios transversales (acceso a Dexie, etc.).
  - `src/app/features/` — una subcarpeta por rebanada futura (auditorias,
    checklist, biblioteca-hallazgos, componentes, exportacion, panel).
  - `src/app/shared/` — componentes/utilidades compartidas.
- Routing base con rutas vacías (placeholder) para: `/auditorias`,
  `/biblioteca`, `/componentes` — cada una renderiza un componente stub
  ("Próximamente") hasta que su rebanada la implemente.
- Dexie.js instalado y configurado con el **esquema completo** de la base
  de datos (todas las tablas del modelo de datos de `00-producto.md §6`),
  aunque de momento no las use ninguna pantalla:
  - `auditorias`, `paginas`, `criteriosWCAG`, `resultados`, `evidencias`,
    `hallazgosPlantilla`, `componentes`.
- Angular CDK instalado (`@angular/cdk`), listo para usar `a11y` en
  rebanadas futuras.
- `govuk-frontend` instalado y el SCSS base importado (tokens de color,
  tipografía, espaciado), sirviendo un layout mínimo con su cabecera y
  tipografía aplicadas — sin componentes de negocio todavía, solo para
  verificar que el sistema de diseño está cableado desde el principio.
- ESLint + Prettier configurados con reglas de accesibilidad
  (`eslint-plugin-jsx-a11y` no aplica a Angular; usar
  `angular-eslint` + reglas de plantillas accesibles donde existan).
- Testing configurado: Jest (o Karma/Jasmine, según se decida al montar el
  proyecto) para unitarios, Playwright instalado para e2e — con un único
  smoke test de cada uno que solo comprueba que la app arranca.
- `README.md` del proyecto con instrucciones de arranque (`npm install`,
  `npm start`, `npm test`).
- Despliegue mínimo verificado: build de producción (`ng build`) sirve
  correctamente en local (`npx http-server dist/...` o similar) — sin
  desplegar todavía a Vercel/Netlify (eso puede ir en esta rebanada o
  dejarse para cuando haya algo real que mostrar; no es bloqueante).

## Qué NO entra todavía

- Ninguna pantalla de negocio funcional (ni auditorías, ni checklist, ni
  biblioteca, ni componentes reales).
- Datos precargados: el catálogo de criterios WCAG 2.2 A/AA vacío en esta
  rebanada (llega en `02-catalogo-wcag.md`); el catálogo de componentes
  Bootstrap también vacío (llega en `05-catalogo-componentes.md`).
- axe-core, exportación (Excel/PDF), función serverless.
- Autenticación o backend (Supabase) — no aplica al MVP local-first.

## Modelo de datos que toca

Se declara el **esquema completo** de Dexie (versión 1 de la base de
datos), con todas las entidades de `00-producto.md §6`, aunque queden
vacías hasta que rebanadas posteriores las pueblen y las usen:

- `Auditoria`, `Pagina`, `CriterioWCAG`, `Resultado`, `Evidencia`,
  `HallazgoPlantilla`, `Componente`.

Declarar el esquema completo desde el principio evita migraciones de Dexie
constantes en cada rebanada siguiente.

## Criterios de aceptación

- `npm start` levanta la app en local sin errores en consola.
- Las tres rutas placeholder (`/auditorias`, `/biblioteca`,
  `/componentes`) son navegables y muestran su stub correspondiente.
- Al abrir la app, Dexie crea/abre la base de datos IndexedDB sin errores
  (verificable en las DevTools → Application → IndexedDB).
- `npm run lint` y `npm test` corren sin fallos sobre el esqueleto.
- El smoke test de Playwright abre la app y comprueba que el shell
  principal (layout/navegación) se renderiza.
- Un escaneo de axe (manual, con la extensión de navegador, ya que
  axe-core aún no está integrado en la app) sobre la shell vacía no
  devuelve errores críticos.
