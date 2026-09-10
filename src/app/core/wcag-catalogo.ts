import type { CriterioWCAG } from './models';

// Catálogo completo de criterios de éxito WCAG 2.2, niveles A y AA
// (31 + 24 = 55 criterios; AAA fuera de alcance — ver specs/00-producto.md
// §2 y specs/03-catalogo-wcag.md). Nombres según la traducción oficial de
// W3C (w3.org/Translations/WCAG22-es/). Fuente normativa:
// w3.org/TR/WCAG22 · Técnicas: w3.org/WAI/WCAG22/Techniques.
export const CATALOGO_WCAG_2_2: CriterioWCAG[] = [
  // 1.1 Alternativas textuales
  {
    codigo: '1.1.1',
    nombre: 'Contenido no textual',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion: 'Todo contenido no textual tiene una alternativa textual equivalente.',
    tecnicas: ['G94', 'G95', 'H37'],
  },
  // 1.2 Medios tempo-dependientes
  {
    codigo: '1.2.1',
    nombre: 'Solo audio y solo vídeo (grabado)',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'Se ofrece una alternativa textual o de audio equivalente para medios grabados de solo audio o solo vídeo.',
    tecnicas: ['G158', 'G159', 'G166'],
  },
  {
    codigo: '1.2.2',
    nombre: 'Subtítulos (grabado)',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion: 'Se proporcionan subtítulos para todo contenido de audio grabado en vídeo síncrono.',
    tecnicas: ['G87', 'G93'],
  },
  {
    codigo: '1.2.3',
    nombre: 'Audiodescripción o medio alternativo (grabado)',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'Se ofrece una alternativa o audiodescripción para el contenido visual relevante de vídeo grabado síncrono.',
    tecnicas: ['G69', 'G78', 'G173'],
  },
  {
    codigo: '1.2.4',
    nombre: 'Subtítulos (en directo)',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion: 'Se proporcionan subtítulos para todo contenido de audio en directo de medios síncronos.',
    tecnicas: ['G9', 'G93'],
  },
  {
    codigo: '1.2.5',
    nombre: 'Audiodescripción (grabado)',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion: 'Se proporciona audiodescripción para todo el contenido de vídeo grabado síncrono.',
    tecnicas: ['G78', 'G173'],
  },
  // 1.3 Adaptable
  {
    codigo: '1.3.1',
    nombre: 'Información y relaciones',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'La información, estructura y relaciones transmitidas visualmente se pueden determinar por software o describir en texto.',
    tecnicas: ['G115', 'H49', 'H51'],
  },
  {
    codigo: '1.3.2',
    nombre: 'Secuencia con sentido',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'Cuando el orden de lectura afecta al significado, se puede determinar por software un orden de lectura correcto.',
    tecnicas: ['G57', 'H34'],
  },
  {
    codigo: '1.3.3',
    nombre: 'Características sensoriales',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'Las instrucciones no dependen únicamente de características sensoriales como forma, color, tamaño o posición.',
    tecnicas: ['G96'],
  },
  {
    codigo: '1.3.4',
    nombre: 'Orientación',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'El contenido no restringe su visualización a una única orientación (vertical u horizontal), salvo que sea esencial.',
    tecnicas: ['G214'],
  },
  {
    codigo: '1.3.5',
    nombre: 'Identificar el propósito de la entrada',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'El propósito de cada campo de entrada que recoge información sobre el usuario se puede determinar por software.',
    tecnicas: ['H98'],
  },
  // 1.4 Distinguible
  {
    codigo: '1.4.1',
    nombre: 'Uso del color',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion: 'El color no se usa como único medio visual para transmitir información o distinguir un elemento.',
    tecnicas: ['G14', 'G182', 'G183'],
  },
  {
    codigo: '1.4.2',
    nombre: 'Control del audio',
    nivel: 'A',
    categoria: 'perceptible',
    descripcion:
      'Si un audio suena automáticamente más de 3 segundos, existe un mecanismo para pausarlo, detenerlo o controlar su volumen.',
    tecnicas: ['G60', 'G170', 'G171'],
  },
  {
    codigo: '1.4.3',
    nombre: 'Contraste (mínimo)',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion: 'El texto tiene una relación de contraste de al menos 4.5:1 con el fondo.',
    tecnicas: ['G18', 'G145'],
  },
  {
    codigo: '1.4.4',
    nombre: 'Cambio de tamaño del texto',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'El texto se puede ampliar hasta un 200% sin pérdida de contenido ni de funcionalidad, sin necesitar tecnología de asistencia.',
    tecnicas: ['G142', 'C28', 'C12'],
  },
  {
    codigo: '1.4.5',
    nombre: 'Imágenes de texto',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'Se usa texto real en lugar de imágenes de texto para transmitir información, salvo casos esenciales o personalizables.',
    tecnicas: ['G140', 'C22', 'C30'],
  },
  {
    codigo: '1.4.10',
    nombre: 'Reflow',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'El contenido se puede presentar sin scroll en dos dimensiones a un ancho equivalente a 320px, sin pérdida de información.',
    tecnicas: ['C32', 'C31', 'C33'],
  },
  {
    codigo: '1.4.11',
    nombre: 'Contraste no textual',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'Los componentes de interfaz y los elementos gráficos necesarios para entender el contenido tienen un contraste de al menos 3:1 con su entorno.',
    tecnicas: ['G195', 'G207'],
  },
  {
    codigo: '1.4.12',
    nombre: 'Espaciado del texto',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'No se pierde contenido ni funcionalidad al ajustar el espaciado de línea, párrafo, letra o palabra a valores más amplios.',
    tecnicas: ['C36', 'C35'],
  },
  {
    codigo: '1.4.13',
    nombre: 'Contenido en hover o foco',
    nivel: 'AA',
    categoria: 'perceptible',
    descripcion:
      'El contenido adicional que aparece al pasar el ratero o recibir el foco se puede descartar, es persistente y sigue siendo visible al apuntarlo.',
    tecnicas: ['SCR39', 'F95'],
  },
  // 2.1 Accesible por teclado
  {
    codigo: '2.1.1',
    nombre: 'Teclado',
    nivel: 'A',
    categoria: 'operable',
    descripcion: 'Toda la funcionalidad está disponible mediante teclado.',
    tecnicas: ['G202'],
  },
  {
    codigo: '2.1.2',
    nombre: 'Sin trampas para el foco del teclado',
    nivel: 'A',
    categoria: 'operable',
    descripcion: 'Si el foco de teclado puede moverse a un componente, también se puede alejar de él usando solo el teclado.',
    tecnicas: ['G21'],
  },
  {
    codigo: '2.1.4',
    nombre: 'Atajos de teclado de un carácter',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Si un atajo de teclado usa una sola tecla de letra, puntuación, número o símbolo, se puede desactivar, remapear o solo aplica con el foco en el componente.',
    tecnicas: ['G217'],
  },
  // 2.2 Tiempo suficiente
  {
    codigo: '2.2.1',
    nombre: 'Ajustable por tiempo',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Para cada límite de tiempo establecido por el contenido, el usuario puede desactivarlo, ajustarlo o extenderlo.',
    tecnicas: ['G133', 'G198'],
  },
  {
    codigo: '2.2.2',
    nombre: 'Poner en pausa, detener, ocultar',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Para información en movimiento, parpadeante, en desplazamiento o que se autoactualiza, el usuario puede pausarla, detenerla u ocultarla.',
    tecnicas: ['G4', 'G11'],
  },
  // 2.3 Convulsiones y reacciones físicas
  {
    codigo: '2.3.1',
    nombre: 'Umbral de tres destellos o menos',
    nivel: 'A',
    categoria: 'operable',
    descripcion: 'Ninguna parte del contenido destella más de tres veces por segundo.',
    tecnicas: ['G19', 'G176'],
  },
  // 2.4 Navegable
  {
    codigo: '2.4.1',
    nombre: 'Evitar bloques',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Existe un mecanismo para saltar bloques de contenido que se repiten en varias páginas (ej. enlace de salto al contenido principal).',
    tecnicas: ['G1', 'G123', 'G124'],
  },
  {
    codigo: '2.4.2',
    nombre: 'Página titulada',
    nivel: 'A',
    categoria: 'operable',
    descripcion: 'Cada página tiene un título que describe su tema o propósito.',
    tecnicas: ['G88', 'H25'],
  },
  {
    codigo: '2.4.3',
    nombre: 'Orden del foco',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Si una página se puede navegar secuencialmente, los componentes reciben el foco en un orden que conserva el significado y la operabilidad.',
    tecnicas: ['H4', 'G57'],
  },
  {
    codigo: '2.4.4',
    nombre: 'Propósito de los enlaces (en contexto)',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'El propósito de cada enlace se puede determinar por su texto solo o junto con su contexto programático.',
    tecnicas: ['G91', 'H30', 'H77'],
  },
  {
    codigo: '2.4.5',
    nombre: 'Múltiples vías',
    nivel: 'AA',
    categoria: 'operable',
    descripcion: 'Hay más de una vía para localizar una página dentro de un conjunto de páginas (ej. buscador y mapa del sitio).',
    tecnicas: ['G125', 'G64', 'G63'],
  },
  {
    codigo: '2.4.6',
    nombre: 'Encabezados y etiquetas',
    nivel: 'AA',
    categoria: 'operable',
    descripcion: 'Los encabezados y etiquetas describen el tema o propósito del contenido que encabezan.',
    tecnicas: ['H42', 'H44', 'G131'],
  },
  {
    codigo: '2.4.7',
    nombre: 'Foco visible',
    nivel: 'AA',
    categoria: 'operable',
    descripcion: 'Cualquier interfaz operable con teclado tiene un indicador de foco visible.',
    tecnicas: ['G149', 'G165'],
  },
  {
    codigo: '2.4.11',
    nombre: 'Foco no oscurecido (mínimo)',
    nivel: 'AA',
    categoria: 'operable',
    descripcion: 'El elemento con foco de teclado no queda completamente oculto por otro contenido.',
    tecnicas: ['C43', 'C44'],
  },
  // 2.5 Modalidades de entrada
  {
    codigo: '2.5.1',
    nombre: 'Gestos del puntero',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Toda funcionalidad que use gestos multipunto o basados en trayectoria también se puede operar con un solo puntero, sin el gesto.',
    tecnicas: ['G215', 'G216'],
  },
  {
    codigo: '2.5.2',
    nombre: 'Cancelación del puntero',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Para funciones que se activan con un solo puntero, la activación se puede cancelar o revertir antes de completarse.',
    tecnicas: ['G210', 'G212'],
  },
  {
    codigo: '2.5.3',
    nombre: 'Etiqueta en el nombre',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'Para componentes de interfaz con etiqueta de texto visible, el nombre accesible incluye el texto de esa etiqueta visible.',
    tecnicas: ['G211'],
  },
  {
    codigo: '2.5.4',
    nombre: 'Actuación por movimiento',
    nivel: 'A',
    categoria: 'operable',
    descripcion:
      'La funcionalidad que se activa moviendo el dispositivo o el usuario también se puede operar con controles de interfaz convencionales.',
    tecnicas: ['G213'],
  },
  {
    codigo: '2.5.7',
    nombre: 'Movimientos de arrastre',
    nivel: 'AA',
    categoria: 'operable',
    descripcion:
      'Toda funcionalidad que se opere mediante un movimiento de arrastre también se puede lograr con un solo puntero, sin arrastrar.',
    tecnicas: ['G219', 'G220'],
  },
  {
    codigo: '2.5.8',
    nombre: 'Tamaño del objetivo (mínimo)',
    nivel: 'AA',
    categoria: 'operable',
    descripcion:
      'El tamaño del objetivo para eventos de puntero es de al menos 24x24 píxeles CSS, salvo excepciones (enlace en línea, control equivalente disponible, etc.).',
    tecnicas: ['C42'],
  },
  // 3.1 Legible
  {
    codigo: '3.1.1',
    nombre: 'Idioma de la página',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion: 'El idioma por defecto de cada página se puede determinar por software.',
    tecnicas: ['H57'],
  },
  {
    codigo: '3.1.2',
    nombre: 'Idioma de las partes',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion: 'El idioma de cada pasaje o frase del contenido se puede determinar por software.',
    tecnicas: ['H58'],
  },
  // 3.2 Predecible
  {
    codigo: '3.2.1',
    nombre: 'Al recibir el foco',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion: 'Al recibir el foco, ningún componente de interfaz provoca un cambio de contexto.',
    tecnicas: ['G107'],
  },
  {
    codigo: '3.2.2',
    nombre: 'Al recibir entradas',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion:
      'Cambiar el valor de un componente de interfaz no provoca automáticamente un cambio de contexto, salvo que se advierta antes de usarlo.',
    tecnicas: ['G80', 'H32'],
  },
  {
    codigo: '3.2.3',
    nombre: 'Navegación coherente',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion:
      'Los mecanismos de navegación que se repiten en varias páginas aparecen en el mismo orden relativo cada vez.',
    tecnicas: ['G61'],
  },
  {
    codigo: '3.2.4',
    nombre: 'Identificación coherente',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion:
      'Los componentes con la misma funcionalidad se identifican de forma coherente en todo el conjunto de páginas.',
    tecnicas: ['G197'],
  },
  {
    codigo: '3.2.6',
    nombre: 'Ayuda coherente',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion:
      'Si una página ofrece mecanismos de ayuda (contacto, chat, FAQ), aparecen en el mismo orden relativo en todas las páginas donde están disponibles.',
    tecnicas: ['G227'],
  },
  // 3.3 Asistencia de entrada
  {
    codigo: '3.3.1',
    nombre: 'Identificación de errores',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion: 'Si se detecta automáticamente un error de entrada, se identifica y se describe al usuario en texto.',
    tecnicas: ['G83', 'G84', 'G85'],
  },
  {
    codigo: '3.3.2',
    nombre: 'Etiquetas o instrucciones',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion: 'Se proporcionan etiquetas o instrucciones cuando el contenido requiere entrada del usuario.',
    tecnicas: ['G131', 'H90'],
  },
  {
    codigo: '3.3.3',
    nombre: 'Sugerencia ante errores',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion:
      'Si se detecta automáticamente un error de entrada y se conocen sugerencias de corrección, se muestran al usuario.',
    tecnicas: ['G177'],
  },
  {
    codigo: '3.3.4',
    nombre: 'Prevención de errores (legales, financieros, de datos)',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion:
      'Para páginas con consecuencias legales, financieras o de datos, los envíos son reversibles, se validan o se pueden confirmar antes de finalizar.',
    tecnicas: ['G98', 'G155', 'G164'],
  },
  {
    codigo: '3.3.7',
    nombre: 'Entrada redundante',
    nivel: 'A',
    categoria: 'comprensible',
    descripcion:
      'La información que el usuario ya proporcionó antes en el mismo proceso se rellena automáticamente o queda disponible para seleccionar, salvo excepciones.',
    tecnicas: ['G221'],
  },
  {
    codigo: '3.3.8',
    nombre: 'Autenticación accesible (mínimo)',
    nivel: 'AA',
    categoria: 'comprensible',
    descripcion:
      'Un paso de autenticación no exige una prueba cognitiva (recordar una contraseña, resolver un puzzle) salvo que exista una alternativa que no la requiera.',
    tecnicas: ['G218'],
  },
  // 4.1 Compatible
  {
    codigo: '4.1.2',
    nombre: 'Nombre, función, valor',
    nivel: 'A',
    categoria: 'robusto',
    descripcion:
      'Para todo componente de interfaz, el nombre, la función y el valor se pueden determinar por software.',
    tecnicas: ['G108', 'ARIA16'],
  },
  {
    codigo: '4.1.3',
    nombre: 'Mensajes de estado',
    nivel: 'AA',
    categoria: 'robusto',
    descripcion:
      'Los mensajes de estado se pueden determinar por software (ej. mediante roles o propiedades ARIA) sin necesitar que reciban el foco.',
    tecnicas: ['ARIA22', 'ARIA23'],
  },
];
