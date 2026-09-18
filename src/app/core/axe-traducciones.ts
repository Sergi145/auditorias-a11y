// Traducción al español del `help` de cada regla de axe-core que ejecuta
// TAGS_WCAG_2_2_A_AA (70 reglas en axe-core 4.13) — ver
// specs/19-traduccion-axe.md. Se traduce por id de regla, no por el texto
// inglés: los `help` cambian entre versiones de axe-core, los ids no.
//
// Origen de cada entrada (comentario al final de la línea):
// - es.json: tomada tal cual de node_modules/axe-core/locales/es.json.
// - revisada: parte de es.json, reescrita por literal, poco natural,
//   desfasada o por no estar en forma de requisito.
// - propia: la regla no existe en es.json.
//
// Estilo: forma de requisito, sin punto final (como los `help` de axe);
// atributos, roles y elementos literales. Sin imports: el test de cobertura
// (axe-traducciones.spec.ts) compara este diccionario con axe.getRules().
export const TRADUCCIONES_AXE: Readonly<Record<string, string>> = {
  'area-alt': 'Los elementos <area> activos deben tener texto alternativo', // es.json
  'aria-allowed-attr': 'Los elementos solo deben usar atributos ARIA admitidos para su rol', // revisada
  'aria-braille-equivalent': 'Los atributos aria-braille deben tener un equivalente que no sea braille', // propia
  'aria-command-name': 'Los comandos ARIA deben tener un nombre accesible', // propia
  'aria-conditional-attr': 'Los atributos ARIA deben usarse según lo especificado para el rol del elemento', // propia
  'aria-deprecated-role': 'No deben usarse roles ARIA obsoletos', // propia
  'aria-hidden-body': 'aria-hidden="true" no debe estar presente en el <body> del documento', // revisada
  'aria-hidden-focus':
    'Los elementos ocultos con aria-hidden no deben poder recibir el foco ni contener elementos que puedan recibirlo', // revisada
  'aria-input-field-name': 'Los campos de entrada ARIA deben tener un nombre accesible', // revisada
  'aria-meter-name': 'Los elementos con role="meter" deben tener un nombre accesible', // propia
  'aria-progressbar-name': 'Los elementos con role="progressbar" deben tener un nombre accesible', // propia
  'aria-prohibited-attr': 'Los elementos solo deben usar atributos ARIA permitidos', // propia
  'aria-required-attr': 'Deben proporcionarse los atributos ARIA requeridos', // es.json
  'aria-required-children': 'Algunos roles ARIA deben contener determinados elementos hijos', // revisada
  'aria-required-parent': 'Algunos roles ARIA deben estar contenidos en determinados elementos padre', // revisada
  'aria-roledescription': 'aria-roledescription solo debe usarse en elementos con un rol semántico', // propia
  'aria-roles': 'Los roles ARIA usados deben tener valores válidos', // revisada
  'aria-tab-name': 'Los elementos con role="tab" deben tener un nombre accesible', // propia
  'aria-toggle-field-name': 'Los campos de alternancia ARIA deben tener un nombre accesible', // revisada
  'aria-tooltip-name': 'Los elementos con role="tooltip" deben tener un nombre accesible', // propia
  'aria-valid-attr-value': 'Los atributos ARIA deben tener valores válidos', // revisada
  'aria-valid-attr': 'Los atributos ARIA deben tener nombres válidos', // revisada
  'audio-caption': 'Los elementos <audio> deben tener una pista de subtítulos', // es.json
  'autocomplete-valid': 'El atributo autocomplete debe usarse correctamente', // es.json
  'avoid-inline-spacing':
    'El espaciado del texto definido en línea debe poder ajustarse con hojas de estilo personalizadas', // revisada
  blink: 'Los elementos <blink> están obsoletos y no deben usarse', // es.json
  'button-name': 'Los botones deben tener texto discernible', // es.json
  bypass: 'Las páginas deben ofrecer un mecanismo para saltar los bloques repetidos', // revisada
  'color-contrast': 'Los elementos deben cumplir la relación de contraste de color mínima', // revisada
  'css-orientation-lock': 'Las media queries de CSS no deben bloquear la orientación de la pantalla', // revisada
  'definition-list':
    'Los elementos <dl> solo deben contener directamente grupos <dt> y <dd> correctamente ordenados, o elementos <script>, <template> o <div>', // revisada
  dlitem: 'Los elementos <dt> y <dd> deben estar contenidos en un <dl>', // es.json
  'document-title': 'Los documentos deben tener un elemento <title> para facilitar la navegación', // revisada
  'duplicate-id-aria': 'Los id usados en atributos ARIA y en etiquetas <label> deben ser únicos', // revisada
  'form-field-multiple-labels': 'Un campo de formulario no debe tener varios elementos <label>', // revisada
  'frame-focusable-content': 'Los marcos con contenido que puede recibir el foco no deben tener tabindex="-1"', // propia
  'frame-title-unique': 'Los marcos deben tener un atributo title único', // revisada
  'frame-title': 'Los marcos deben tener un nombre accesible', // revisada
  'html-has-lang': 'El elemento <html> debe tener un atributo lang', // es.json
  'html-lang-valid': 'El elemento <html> debe tener un valor válido para el atributo lang', // es.json
  'html-xml-lang-mismatch': 'Los elementos HTML con lang y xml:lang deben tener el mismo idioma base', // es.json
  'image-alt': 'Las imágenes deben tener texto alternativo', // es.json
  'input-button-name': 'Los botones <input> deben tener texto discernible', // revisada
  'input-image-alt': 'Los botones de imagen deben tener texto alternativo', // revisada
  'label-content-name-mismatch':
    'Los elementos deben tener su texto visible como parte de su nombre accesible', // es.json
  label: 'Los elementos de formulario deben tener etiquetas', // es.json
  'link-in-text-block': 'Los enlaces deben poder distinguirse sin depender del color', // revisada
  'link-name': 'Los enlaces deben tener texto discernible', // es.json
  list: 'Los elementos <ul> y <ol> solo deben contener directamente elementos <li>, <script> o <template>', // revisada
  listitem: 'Los elementos <li> deben estar contenidos en un <ul> o un <ol>', // es.json
  marquee: 'Los elementos <marquee> están obsoletos y no deben usarse', // es.json
  'meta-refresh': 'No deben usarse recargas automáticas con un retardo inferior a 20 horas', // revisada
  'meta-viewport': 'No debe desactivarse el zoom ni el escalado', // revisada
  'nested-interactive': 'Los controles interactivos no deben estar anidados', // propia
  'no-autoplay-audio': 'Los elementos <video> o <audio> no deben reproducirse automáticamente', // propia
  'object-alt': 'Los elementos <object> deben tener texto alternativo', // es.json
  'p-as-heading': 'No deben usarse elementos <p> con estilo como encabezados', // revisada
  'role-img-alt': 'Los elementos con [role="img"] y [role="image"] deben tener texto alternativo', // revisada
  'scrollable-region-focusable': 'Las regiones desplazables deben ser accesibles con el teclado', // revisada
  'select-name': 'Los elementos <select> deben tener un nombre accesible', // propia
  'server-side-image-map': 'No deben usarse mapas de imágenes del lado del servidor', // es.json
  'summary-name': 'Los elementos <summary> deben tener texto discernible', // propia
  'svg-img-alt': 'Los elementos <svg> con rol img o image deben tener texto alternativo', // propia
  'table-fake-caption':
    'No deben usarse celdas de datos o de encabezado para poner título a una tabla de datos', // revisada
  'target-size':
    'Todos los objetivos táctiles deben medir al menos 24 px o dejar espacio suficiente a su alrededor', // propia
  'td-has-header':
    'Los elementos <td> no vacíos de las tablas grandes deben tener un encabezado de tabla asociado', // revisada
  'td-headers-attr':
    'El atributo headers de las celdas solo debe hacer referencia a elementos <th> de la misma tabla', // revisada
  'th-has-data-cells': 'Los encabezados de una tabla de datos deben hacer referencia a celdas de datos', // revisada
  'valid-lang': 'El atributo lang debe tener un valor válido', // es.json
  'video-caption': 'Los elementos <video> deben tener subtítulos', // es.json
};

// Texto en español de una violación de axe-core; si su regla no está en el
// diccionario (o la violación llega sin id, p. ej. desde una versión antigua
// de /api/escanear-url), devuelve el `help` original en inglés.
export function textoViolacionEs(violacion: { id?: string; help: string }): string {
  const id = violacion.id;
  if (id && Object.prototype.hasOwnProperty.call(TRADUCCIONES_AXE, id)) {
    return TRADUCCIONES_AXE[id];
  }
  return violacion.help;
}
