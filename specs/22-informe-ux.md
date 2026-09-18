# 22 — Informe de experiencia de usuario

**Spec:** [22-pruebas-usuario-ux.md](./22-pruebas-usuario-ux.md)
**Fecha:** 2026-09-18
**Rama:** `spec-22-pruebas-usuario-ux`
**Tests:** `e2e/recorridos-usuario.spec.ts` (+ utilidades en `e2e/utilidades/recorrido.ts`)

## Cómo se ha hecho

1. **Recorridos automatizados** con Playwright (Chromium), solo con selectores
   por rol y nombre accesible: primera auditoría, reutilizar redacciones,
   escaneo automático, corregir y borrar, persistencia al recargar y volver
   atrás con el navegador; más una variante **solo teclado** y otra **móvil
   320×640**. En cada pantalla: axe con WCAG 2.2 A/AA y, en móvil, reflow
   (1.4.10) y tamaño de objetivos (2.5.8, con su excepción de separación).
2. **Aproximación automatizada al lector de pantalla** (opción b acordada al
   implementar; **sustituye, no equivale** a una sesión real con NVDA o
   Narrator): se registra todo lo que entra en regiones `aria-live` /
   `role=status` / `role=alert` (lo que "oiría" un lector), se guarda el
   árbol de accesibilidad de las pantallas clave (adjuntos `árbol aria — …`
   del informe de Playwright) y se comprueba dónde queda el foco tras cada
   acción. No cubre cómo pronuncia cada lector, la verbosidad ni el orden de
   lectura percibido: eso sigue pendiente de una sesión real.

Resultado al cerrar el informe: **6 tests en verde y 6 marcados
`test.fixme()`**, que fallaban por los problemas P1, P2, P3, P5 y P7 de
abajo.

**Actualización (2026-09-18, tras los arreglos):** P1 a P8 están arreglados
(ver «Estado de los arreglos» al final); P9 sigue fuera de alcance por la
spec 21. Se han quitado todos los `test.fixme()` y la batería e2e completa
pasa (33 tests, 0 omitidos, incluidos los nuevos de P4 y P8).

## Resumen

| # | Problema | Gravedad | WCAG | Spec afectada |
|---|----------|----------|------|---------------|
| P1 | El estado guardado de la auditoría se muestra como «En progreso» al volver a la pantalla | **Alta** | — (4.1.2 indirecto) | 05 |
| P2 | El foco se pierde en `<body>` en cinco acciones del flujo principal | **Alta** | 2.4.3 | 06 (y 05 en la bienvenida) |
| P3 | Guardar la revisión con un hallazgo nuevo incompleto dice «Revisión guardada.» y descarta el hallazgo sin mostrar ni anunciar errores | **Alta** | 3.3.1, 4.1.3 | 06 |
| P4 | Las confirmaciones («Revisión guardada.», «Hallazgo añadido.»…) solo existen para lectores de pantalla; no hay nada visible | Media | — | 04 |
| P5 | El título de la pestaña es siempre «Auditorías A11y» | Media | 2.4.2 | Nueva (routing) |
| P6 | Los desplegables Estado y Severidad muestran valores internos (`no_aplica`, `por_revisar`, `critica`) | Media | — (3.1 legibilidad) | 06, 08 |
| P7 | Crear una auditoría o una página no se anuncia (editar sí) | Baja | 4.1.3 | 05 |
| P8 | Salir de un hallazgo con cambios sin guardar no avisa | Media | — | 06 |
| P9 | Volver con «Atrás» desde la biblioteca pierde el formulario abierto y el «Falla» sin guardar | Baja | — | 21 |

No se han encontrado **violaciones de axe** en ninguna pantalla recorrida
(escritorio ni móvil), ni **scroll horizontal** a 320 px, ni objetivos
táctiles que incumplan 2.5.8, ni **errores de consola**.

## Detalle

### P1 — El estado de la auditoría se muestra mal (Alta)

- **Pantalla:** detalle de auditoría (`/auditorias/:id`).
- **Pasos:** crear una auditoría → en «Estado de la auditoría» elegir
  «Completada» → recargar, o salir y volver a entrar.
- **Esperado:** el desplegable muestra «Completada».
- **Obtenido:** muestra «En progreso». En IndexedDB el valor sí es
  `completada` (comprobado leyendo la base de datos desde el test).
- **Causa probable:** `<select [value]="auditoria.estado">` recibe el valor
  antes de que el `@for` pinte sus `<option>`, así que el navegador se queda
  con la primera opción.
- **Por qué es Alta:** el auditor cree que su cambio se ha perdido, y si toca
  el desplegable para "arreglarlo" sobrescribe el dato bueno. El listado de
  auditorías y la exportación sí usan el valor real, así que las pantallas se
  contradicen.
- **Test:** `Recorrido 5 — persistencia` (`fixme`).

### P2 — El foco se pierde en `<body>` (Alta)

Después de estas acciones el elemento con el foco desaparece y nadie lo
recoloca, así que un usuario de teclado o de lector de pantalla vuelve al
principio de la página:

| Acción | Pantalla | Qué desaparece |
|---|---|---|
| Pulsar «Empezar una auditoría» en la bienvenida | bienvenida → nueva auditoría | toda la página (la bienvenida está fuera del shell) |
| Pulsar «Añadir hallazgo» | revisión de criterio | el propio botón (está en el `@else` del formulario nuevo) |
| Pulsar «Editar» en un hallazgo | revisión de criterio | la tarjeta, sustituida por el formulario |
| Pulsar «Guardar hallazgo» | revisión de criterio | el formulario de edición |
| Eliminar un hallazgo (tras confirmar en el modal) | revisión de criterio | la tarjeta del hallazgo |

- **Pasos:** cualquiera de las acciones de la tabla, con teclado; comprobar
  `document.activeElement`.
- **Esperado:** el foco pasa a algo con sentido: el primer campo del
  formulario que se abre, la tarjeta guardada, o el encabezado o botón
  siguiente tras eliminar.
- **Nota:** dentro del shell, cambiar de pantalla **no** pierde el foco
  (checklist, progreso, exportar…); el problema está en los cambios dentro de
  una misma pantalla y en la salida de la bienvenida. El modal de
  confirmación sí devuelve bien el foco al cerrarlo con Esc.
- **Tests:** `Recorrido 1 — solo teclado`, `Recorrido 4 — corregir y
  borrar`, `Recorrido 1` (escritorio y móvil) y `Recorrido 5` (`fixme`).

### P3 — Un hallazgo incompleto se descarta en silencio (Alta)

- **Pantalla:** revisión de criterio.
- **Pasos:** Estado «Falla» → «Añadir hallazgo» → escribir la descripción
  **sin** elegir severidad → «Guardar revisión».
- **Esperado:** no se guarda nada, el campo Severidad se marca como erróneo
  (`aria-invalid`, mensaje visible), el foco va a ese campo y se anuncia el
  error.
- **Obtenido:** se guarda el resultado «Falla» con **0 hallazgos**, se
  anuncia «Revisión guardada.», la pantalla no cambia, ningún campo tiene
  `aria-invalid` y no aparece ningún mensaje de error. Si el auditor sale
  después, pierde el hallazgo sin saberlo, y el checklist muestra un
  «Falla» sin hallazgos.
- **Contraste:** el formulario de «Nueva auditoría» sí lo hace bien: marca
  los 4 campos, lleva el foco al primero y anuncia los mensajes.
- **Test:** `Recorrido 4 — hallazgo incompleto` (`fixme`).

### P4 — No hay confirmación visible de las acciones (Media)

- `ToastService` solo llama a `LiveAnnouncer`: el texto existe en una región
  `aria-live` visualmente oculta (1×1 px, `clip: rect(0 0 0 0)`). Quien no
  usa lector de pantalla no recibe ninguna confirmación de «Revisión
  guardada.», «Hallazgo añadido.», «Estado actualizado.», «Escaneo
  completado: …» ni «Hallazgo eliminado.». La decisión viene de la spec 04
  (se retiró `AppToastHost`); este informe propone revisarla.

### P5 — El título de la pestaña no cambia (Media)

- Las 7 pantallas del recorrido 1 tienen el mismo `<title>`, «Auditorías
  A11y». Las rutas no definen `title`. WCAG 2.4.2 pide que el título
  describa la página; además, con varias pestañas abiertas no se distinguen.

### P6 — Valores internos en los desplegables (Media)

- En revisión de criterio, «Estado» ofrece `pasa`, `falla`, `no_aplica` y
  `por_revisar`, y «Severidad» ofrece `critica`, `alta`, `media` y `baja`;
  la tarjeta del hallazgo también muestra la severidad en crudo. El detalle
  de plantilla de la biblioteca repite `critica`. El checklist, el progreso y
  la exportación ya usan etiquetas legibles («No aplica», «Crítica»), así
  que la misma cosa se llama distinto según la pantalla, y un lector de
  pantalla lee «no guion bajo aplica».

### P7 — Crear no se anuncia (Baja)

- Tras «Crear auditoría» o «Añadir página» no se anuncia nada; tras editar
  sí («Auditoría actualizada.», «Página actualizada.»). El cambio de
  pantalla da una pista visual, pero no hay confirmación para el lector.

### P8 — Cambios sin guardar sin aviso (Media)

- En revisión de criterio, con un hallazgo a medio escribir, «Volver al
  checklist» (o cualquier enlace del menú) sale sin avisar y se pierde el
  texto. «Ver en la biblioteca» sí lo advierte por texto (spec 21), pero el
  resto de salidas no.

### P9 — «Atrás» desde la biblioteca pierde el formulario (Baja)

- Con un hallazgo nuevo abierto, ir a «Ver en la biblioteca» y volver con
  «Atrás» del navegador deja el criterio sin el formulario y sin el «Falla»
  si no se había guardado. Está documentado en la spec 21 («Qué NO entra
  todavía») y se avisa en pantalla; se apunta como fricción.

## Lista de comprobación de la revisión (aproximación automatizada)

| Pregunta de la spec | Respuesta |
|---|---|
| ¿Se entiende qué hacer en cada pantalla? ¿Estados vacíos con acción clara? | Sí en general. El listado vacío dice «No hay auditorías todavía.» con «Nueva auditoría» en la cabecera; el progreso sin páginas muestra los bloques a cero. |
| ¿Cada acción da respuesta visible y anunciada? ¿Errores anunciados? | Anunciada casi siempre (salvo P7); **visible nunca** (P4). Los errores de «Nueva auditoría» se anuncian y marcan; los del hallazgo no (P3). |
| ¿Texto duplicado o que sobra tras una acción? | Ya no: la sugerencia usada desaparece tras «Usar esta redacción» (arreglado en la spec 08 en esta misma rama). |
| ¿Se puede cancelar sin perder trabajo? ¿Aviso de cambios sin guardar? | El modal de confirmación permite cancelar (y Esc). No hay aviso de cambios sin guardar (P8, P9). |
| ¿Mismos nombres para la misma acción? | Sí: «Volver al checklist», «Volver a la auditoría», «Eliminar …», «Guardar cambios». Excepción: los valores de estado y severidad (P6). |
| ¿Los enlaces de vuelta llevan al sitio esperado? | Sí en todos los recorridos, incluido «Atrás» del navegador a elementos ya borrados («No se ha encontrado la auditoría.»). |
| ¿Listados largos cómodos? | El checklist (~55 criterios) tiene filtros y el botón por fila anuncia «Ver hallazgos de 1.1.1»; la biblioteca filtra por criterio y componente. Sin buscador de texto (fuera de alcance desde la spec 08). |
| ¿El `<title>` cambia en cada pantalla? | No (P5). |

**Estructura para lector de pantalla** (árbol de accesibilidad): enlace
«Saltar al contenido principal», puntos de referencia `nav` «Navegación
principal», `header`, `main` y `footer`, y un único `h1` por pantalla.

## Lo que funciona bien

- Todo se guarda y sobrevive a la recarga (auditoría, páginas, resultados,
  hallazgos, evidencias, plantillas).
- El re-escaneo respeta la revisión manual (spec 11).
- La biblioteca cuenta bien los usos y no se duplica nada al ir y volver con
  «Atrás» / «Adelante» (spec 21).
- Las eliminaciones actualizan el listado y el progreso sin recargar.
- El modal de confirmación: foco inicial en «Cancelar», Esc lo cierra y el
  foco vuelve al botón que lo abrió.
- Móvil: sin scroll horizontal, el menú plegado se abre, navega y se cierra
  con Esc devolviendo el foco.
- Exportación a Excel y PDF, también con teclado.

## Falsos positivos descartados durante la prueba

- **Contraste en el listado tras eliminar:** axe medía mientras el fondo del
  modal se desvanecía. `pasarAxe` ahora espera a que no haya fondo ni
  animaciones en curso.
- **Objetivos táctiles de la bienvenida y las casillas:** son menores de
  24 px, pero cumplen la excepción de separación de 2.5.8.
- **Selector de archivos en la variante de teclado:** a veces no se emitía
  `filechooser` aunque el foco estaba en el botón. La causa estaba en el test,
  no en la app: Playwright activa la interceptación del selector de forma
  asíncrona al empezar a escucharlo, y el Enter a veces llegaba antes. Ahora
  se escucha antes de tabular hasta el botón (ver «Estado de los arreglos»).

## Tareas de arreglo (problemas Alta)

Añadidas como «Arreglos pendientes» en su spec, siguiendo la convención de
ampliar la spec existente cuando el arreglo cae en su alcance:

- P1 → `specs/05-auditorias-paginas.md`
- P2 y P3 → `specs/06-checklist-manual.md` (P2 incluye el caso de la
  bienvenida)

Los problemas Media y Baja quedan en este informe para priorizarlos después.
Al arreglar cada uno, quitar el `test.fixme` correspondiente de
`e2e/recorridos-usuario.spec.ts`.

## Pendiente

- **Sesión real con lector de pantalla** (NVDA + Firefox o Narrator + Edge)
  siguiendo la misma lista de comprobación. La aproximación automatizada no
  la sustituye del todo.

## Estado de los arreglos (2026-09-18)

| # | Estado | Dónde |
|---|--------|-------|
| P1 | Arreglado | `auditoria-detalle.html`: `[selected]` por opción (spec 05) |
| P2 | Arreglado | `criterio-revision.ts` (foco al abrir, guardar, cancelar, descartar y eliminar) y `shell.ts` (foco al contenido también al venir de la bienvenida) (spec 06) |
| P3 | Arreglado | `criterio-revision`: no guarda nada con un hallazgo nuevo incompleto, errores visibles con `aria-invalid`, foco al primero y aviso; nuevo botón «Descartar hallazgo» (spec 06) |
| P4 | Arreglado (decidido por el usuario) | `AppToastHost` vuelve como la propia región `role="status"`: el aviso se ve, se anuncia una sola vez y desaparece a los 5 s (specs 04 y 15) |
| P5 | Arreglado | `title` en cada ruta + `TituloPagina` (`TitleStrategy`) (spec 01) |
| P6 | Arreglado | Etiquetas legibles en `criterio-revision`, filtro de severidad del checklist y `/biblioteca/:id` (specs 06 y 08) |
| P7 | Arreglado | «Auditoría creada.» y «Página añadida.» (spec 05) |
| P8 | Arreglado (decidido por el usuario) | `canDeactivate` con el modal propio si el hallazgo abierto ha cambiado, y aviso del navegador al cerrar o recargar (spec 06) |
| P9 | Sin cambios | Fuera de alcance por decisión de la spec 21 («Qué NO entra todavía») |

Efecto en los tests: los e2e que elegían opciones por el valor interno
(`selectOption('falla')`) eligen ahora por la etiqueta visible
(`selectOption({ label: 'Falla' })`), como haría un usuario. La variante
de teclado empieza a escuchar `filechooser` antes de tabular hasta
«Adjuntar imagen». Así se corrige la causa real del fallo intermitente que
antes se reintentaba: si el Enter llegaba antes de que Playwright activara
la interceptación, se abría el selector nativo.
