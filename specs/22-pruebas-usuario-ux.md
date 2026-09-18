# 22 — Pruebas de usuario: recorridos completos y revisión de experiencia

**Estado:** Implemented
**Depende de:** Specs 05–21 (prueba lo ya construido; no añade funcionalidad)
**Fecha:** 2026-09-18

## Objetivo de esta rebanada

Hasta ahora cada rebanada se ha probado por separado con sus propios e2e
(`e2e/*.spec.ts`), que comprueban que cada función cumple su spec. Ninguna
prueba recorre la app de principio a fin como lo haría un auditor real,
así que se escapan los problemas que solo aparecen al encadenar pantallas:
foco que se pierde al navegar, mensajes que no se anuncian, pasos de más,
datos que no se refrescan al volver atrás, textos duplicados (como la
descripción de la sugerencia que seguía visible tras "Usar esta redacción",
corregido en la spec 08). Esta rebanada añade **recorridos de usuario
automatizados** y una **revisión de experiencia** guiada que termina con un
informe de problemas priorizado.

## Qué entra

- **`e2e/recorridos-usuario.spec.ts`**: recorridos completos con Playwright,
  usando solo selectores por rol y nombre accesible (como navegaría un lector
  de pantalla) y fallando si hay errores en la consola:
  1. *Primera auditoría*: `/bienvenida` → crear auditoría → añadir 2 páginas →
     revisar 3 criterios (Cumple, No aplica, Falla con hallazgo, componente y
     evidencia) → checklist → panel de progreso → exportar Excel y PDF (se
     comprueba que se descarga un archivo no vacío).
  2. *Reutilizar redacciones*: guardar un hallazgo en la biblioteca →
     reutilizarlo desde una sugerencia y desde "Ver en la biblioteca" en otra
     página → editar la plantilla en `/biblioteca/:id` → `veces_usado`
     correcto.
  3. *Escaneo automático*: pegar HTML con fallos → checklist prerrellenado
     como "Falla (automático)" → revisar y cambiar a mano uno de ellos.
  4. *Corregir y borrar*: editar auditoría, página y hallazgo; eliminar
     hallazgo, página y auditoría con el modal de confirmación y comprobar
     que el listado y el progreso se actualizan sin recargar.
  5. *Persistencia*: recargar (F5) a mitad de cada recorrido y comprobar que
     no se pierde nada ya guardado.
  6. *Volver atrás*: usar el botón "Atrás" del navegador en los puntos donde
     se navega con query params (biblioteca en modo selección, `?hallazgo=`)
     y comprobar que no se repiten acciones ni queda un estado incoherente.
- **Solo teclado**: el recorrido 1 repetido sin ratón (Tab, Shift+Tab, Enter,
  Espacio, Esc), comprobando en cada cambio de pantalla o bloque que el foco
  queda en un sitio con sentido (encabezado, primer campo, o el elemento que
  lo abrió) y nunca en `<body>`.
- **Axe en cada pantalla** del recorrido con `@axe-core/playwright` (nueva
  dependencia de desarrollo), con las etiquetas WCAG 2.2 A/AA, en escritorio
  y en móvil.
- **Móvil**: los recorridos 1 y 2 con un viewport de 320×640 (reflow,
  WCAG 1.4.10): sin scroll horizontal, menú móvil usable y objetivos táctiles
  de al menos 24×24 px (WCAG 2.5.8).
- **Revisión manual guiada** (una sesión, 30–45 min, con NVDA + Firefox o
  Narrator + Edge) siguiendo la lista de comprobación de abajo; es la parte
  que no se puede automatizar (claridad de textos, orden lógico, si un paso
  sobra).
  *Decisión al implementar (2026-09-18):* como el agente no puede escuchar
  un lector de pantalla, la sesión se sustituye por una **aproximación
  automatizada** (lo anunciado en regiones `aria-live`, el árbol de
  accesibilidad y el foco tras cada acción) y la lista de comprobación se
  responde con ella en el informe. La sesión real con NVDA o Narrator queda
  como pendiente en `22-informe-ux.md`.
- **`specs/22-informe-ux.md`**: informe resultante. Por cada problema: pantalla,
  pasos para reproducirlo, qué se esperaba, gravedad (Bloqueante / Alta /
  Media / Baja), criterio WCAG si aplica y la spec a la que pertenece.

### Lista de comprobación de la revisión manual

- ¿Se entiende qué hacer en cada pantalla sin leer documentación? ¿Hay
  estados vacíos con una acción clara ("Añade tu primera página")?
- ¿Cada acción da respuesta visible y anunciada (toast / `LiveAnnouncer`)?
  ¿Se anuncian también los errores de formulario?
- ¿Se ve texto duplicado o información que ya no hace falta tras una acción?
- ¿Se puede deshacer o cancelar sin perder trabajo? ¿Se avisa antes de
  perder cambios sin guardar?
- ¿Los nombres de botones y enlaces son los mismos en todas las pantallas
  para la misma acción?
- ¿Las migas / enlaces de vuelta llevan al sitio esperado?
- ¿Los listados largos (checklist de ~55 criterios, biblioteca) se pueden
  recorrer y filtrar con comodidad?
- ¿El título de la pestaña (`<title>`) cambia en cada pantalla?

## Qué NO entra todavía

- **Arreglar los problemas encontrados**: esta rebanada solo los detecta y los
  documenta. Cada arreglo se hace después, ampliando la spec a la que
  pertenece (si cae en su alcance) o con una spec nueva.
- Pruebas con usuarios reales externos, métricas de uso o analítica.
- Pruebas de rendimiento o de carga (auditorías con cientos de páginas).
- Otros navegadores aparte de Chromium en la parte automatizada.
- Pruebas de regresión visual (comparar capturas).

## Modelo de datos que toca

Ninguno. Solo lee y escribe a través de la UI las entidades existentes
(`Auditoria`, `Pagina`, `Resultado`, `Hallazgo`, `Evidencia`,
`HallazgoPlantilla`, `Componente`), sobre una base de datos IndexedDB vacía
en cada test (contexto de navegador nuevo de Playwright).

## Criterios de aceptación

- `e2e/recorridos-usuario.spec.ts` existe con los 6 recorridos, más la
  variante solo teclado y la móvil, y se ejecuta con `npx playwright test`.
  Los recorridos que fallen por un problema real de la app se marcan con
  `test.fixme()` y enlazan a su entrada del informe; nunca se relaja una
  comprobación para que pase.
- Cada pantalla del recorrido pasa por axe (WCAG 2.2 A/AA) en escritorio y
  en móvil; las violaciones aparecen en el informe.
- En la variante solo teclado, ningún cambio de pantalla ni acción deja el
  foco en `<body>` (`document.activeElement !== document.body`).
- Ningún recorrido produce errores de consola (`page.on('console')` /
  `pageerror`).
- `specs/22-informe-ux.md` existe, con la revisión hecha (aproximación
  automatizada, ver la decisión en «Qué entra»), y
  cada problema tiene pasos para reproducirlo, gravedad y spec afectada.
- Los problemas Bloqueante y Alta tienen una tarea de arreglo (en su spec o
  en una spec nueva añadida a `specs/README.md`).
- `npm run lint` y `npm test` siguen sin fallos.
