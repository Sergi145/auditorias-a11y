import type { IconName } from '../../shared/ui/icon';

// Contenido estático de la zona pública (specs/24-vistas-publicas.md): la
// landing pinta el resumen (`descripcion`, `texto`) y cada vista pública el
// detalle (`detalles`, `pantalla`/`resultado`, `comoSeVerifica`). Vive en un
// solo sitio para que el resumen y el detalle no puedan contradecirse.

export interface Funcionalidad {
  icono: IconName;
  titulo: string;
  /** La que ya usa la landing. */
  descripcion: string;
  /** 2–4 puntos, solo en /funcionalidades. */
  detalles: string[];
}

export interface Paso {
  titulo: string;
  descripcion: string;
  /** «Dónde:» — la pantalla de la app que se usa. */
  pantalla: string;
  /** «Qué obtienes:» */
  resultado: string;
}

export interface Compromiso {
  /** El que ya usa la landing. */
  texto: string;
  /** Solo en /accesibilidad. */
  comoSeVerifica: string;
}

export const FUNCIONALIDADES: Funcionalidad[] = [
  {
    icono: 'search',
    titulo: 'Escaneo automático',
    descripcion:
      'Pega el HTML o una URL y axe-core pre-rellena el checklist marcando qué falla y qué toca revisar a mano.',
    detalles: [
      'HTML pegado: se analiza en el navegador, dentro de un iframe aislado.',
      'URL en vivo: una función en la nube abre la página con Playwright y le pasa axe-core.',
      'Cada violación se guarda como hallazgo «Falla (automático)» con el texto de axe traducido al español.',
      'En el modo URL, cada hallazgo incluye una captura con el elemento señalado y su contexto.',
    ],
  },
  {
    icono: 'clipboard-check',
    titulo: 'Checklist WCAG 2.2 A/AA',
    descripcion:
      'Estado, severidad, notas y evidencia por criterio y por página, filtrable por nivel, categoría y severidad.',
    detalles: [
      'Todos los criterios de WCAG 2.2 de nivel A y AA, por página auditada.',
      'Cada criterio se marca como Pasa, Falla, No aplica o Por revisar.',
      'Un criterio en «Falla» admite varios hallazgos, cada uno con su severidad y sus notas.',
      'Filtros por nivel, categoría, estado y severidad.',
    ],
  },
  {
    icono: 'book',
    titulo: 'Biblioteca de hallazgos',
    descripcion:
      'Guarda la redacción de un hallazgo una vez y reutilízala cada vez que aparezca el mismo problema.',
    detalles: [
      'Guarda cualquier hallazgo como plantilla reutilizable.',
      'Al redactar un hallazgo nuevo, la app sugiere las plantillas de ese criterio.',
      'Desde un hallazgo puedes abrir la biblioteca, elegir una redacción y volver con ella aplicada.',
    ],
  },
  {
    icono: 'grid',
    titulo: 'Catálogo de componentes',
    descripcion:
      'Clasifica cada hallazgo por el componente afectado: catálogo de Bootstrap incluido, ampliable con los tuyos.',
    detalles: [
      'Incluye de serie los componentes de Bootstrap.',
      'Añade los componentes propios del sitio que auditas.',
      'Cada hallazgo indica a qué componente afecta, para agrupar el trabajo de corrección.',
    ],
  },
  {
    icono: 'document',
    titulo: 'Evidencia vinculada',
    descripcion:
      'Adjunta capturas por hallazgo, no por criterio entero, para documentar exactamente lo que falla y dónde.',
    detalles: [
      'Adjunta imágenes PNG, JPEG o WebP a cada hallazgo.',
      'Cada imagen lleva su propia descripción, que sirve de texto alternativo.',
      'Las miniaturas se ven tanto en la revisión del criterio como en el checklist de la página.',
    ],
  },
  {
    icono: 'download',
    titulo: 'Exportación a Excel y PDF',
    descripcion:
      'Genera el informe final sin maquetar nada a mano, con la misma estructura que ya conoces.',
    detalles: [
      'Excel con dos hojas: resumen de la auditoría y detalle de hallazgos.',
      'PDF con resumen ejecutivo, hallazgos y detalle por criterio.',
      'Los dos se generan en tu navegador a partir de los datos guardados, sin subir nada.',
    ],
  },
];

export const PASOS: Paso[] = [
  {
    titulo: 'Crea la auditoría',
    descripcion: 'Nombre, cliente y estándar objetivo — nivel A o AA.',
    pantalla: 'Auditorías → Nueva auditoría.',
    resultado: 'Una auditoría vacía, lista para añadirle lo que entra en el alcance.',
  },
  {
    titulo: 'Añade páginas o componentes',
    descripcion: 'Todo lo que entra en el alcance de esta auditoría, en una misma vista.',
    pantalla: 'Detalle de la auditoría → Añadir página.',
    resultado: 'Un checklist WCAG 2.2 propio para cada página.',
  },
  {
    titulo: 'Lanza el escaneo automático',
    descripcion:
      'HTML pegado o URL en vivo: axe-core pre-rellena el checklist con lo que ya puede detectar.',
    pantalla: 'Checklist de la página → Escaneo automático.',
    resultado:
      'Los criterios que axe-core detecta, ya marcados como «Falla (automático)» con su hallazgo.',
  },
  {
    titulo: 'Revisa cada criterio a mano',
    descripcion:
      'Confirma o corrige el resultado automático, añade severidad, notas y capturas — reutilizando hallazgos guardados cuando aplique.',
    pantalla: 'Checklist de la página → Revisión del criterio.',
    resultado: 'Cada criterio con su estado definitivo y sus hallazgos documentados.',
  },
  {
    titulo: 'Consulta el panel de progreso',
    descripcion: '% completado y fallos por severidad y categoría, actualizados en tiempo real.',
    pantalla: 'Detalle de la auditoría → Progreso.',
    resultado: 'Qué falta por revisar y qué páginas acumulan más incidencias.',
  },
  {
    titulo: 'Exporta el informe',
    descripcion:
      'Excel y PDF listos para entregar, con la misma estructura que ya conoce tu cliente.',
    pantalla: 'Detalle de la auditoría → Exportar informe.',
    resultado: 'Los archivos Excel y PDF descargados en tu equipo.',
  },
];

export const COMPROMISOS: Compromiso[] = [
  {
    texto: 'Contraste de color AA en toda la interfaz, sin excepciones.',
    comoSeVerifica:
      'axe comprueba el contraste en cada pantalla dentro de las pruebas automáticas (e2e).',
  },
  {
    texto: 'Foco visible en cada elemento interactivo — nunca indicado solo con color.',
    comoSeVerifica:
      'Todos los controles comparten el mismo anillo de foco y se revisan a mano en el recorrido solo con teclado.',
  },
  {
    texto: 'Navegable al 100% por teclado, con el foco atrapado donde corresponde.',
    comoSeVerifica:
      'Un recorrido automático completa una auditoría solo con teclado y comprueba que el foco nunca se pierde.',
  },
  {
    texto: 'Compatible con lectores de pantalla: roles y anuncios ARIA correctos.',
    comoSeVerifica:
      'Las pruebas registran los anuncios de las regiones vivas y el árbol de accesibilidad de las pantallas clave.',
  },
  {
    texto: 'Auditada contra sí misma con axe antes de cada entrega.',
    comoSeVerifica:
      'axe (WCAG 2.2 A/AA) se ejecuta en cada pantalla, en escritorio y a 320 px de ancho, sin violaciones.',
  },
];
