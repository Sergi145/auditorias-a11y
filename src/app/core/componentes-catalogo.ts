// Catálogo por defecto de componentes Bootstrap — ver specs/07-catalogo-componentes.md
// y 00-producto.md §5.6. Sembrado una sola vez en la tabla `componentes` de
// Dexie por ComponentesService. Los ids se conservan tal cual estaban en el
// mock anterior (MockDataService.componentesData) porque HallazgoPlantilla
// (real desde 08-biblioteca-hallazgos) puede referenciar algunos de estos
// ids en su campo componente_id.
import type { Componente } from './models';

// Nombres del catálogo que NO están en inglés (el resto son los nombres
// oficiales de Bootstrap). Hay que listar aquí cualquier nombre en español
// que se añada al catálogo, o se marcará como inglés en pantalla.
const NOMBRES_BOOTSTRAP_EN_ESPANOL: ReadonlySet<string> = new Set(['Tabla']);

// Valor del atributo `lang` con el que mostrar el nombre de un componente
// (WCAG 3.1.2, Idioma de las partes): los Bootstrap están en inglés y el
// resto de la app en español, así que se marcan para que el lector de
// pantalla use la voz correcta. Los personalizados los escribe el auditor y
// no sabemos en qué idioma, así que devuelven null y heredan el de la página.
export function idiomaNombreComponente(componente: Pick<Componente, 'origen' | 'nombre'>): 'en' | null {
  return componente.origen === 'bootstrap' && !NOMBRES_BOOTSTRAP_EN_ESPANOL.has(componente.nombre)
    ? 'en'
    : null;
}

export const CATALOGO_COMPONENTES_BOOTSTRAP: Componente[] = [
  { id: 1, nombre: 'Accordion', origen: 'bootstrap', visible: true },
  { id: 2, nombre: 'Alert', origen: 'bootstrap', visible: true },
  { id: 3, nombre: 'Badge', origen: 'bootstrap', visible: true },
  { id: 4, nombre: 'Breadcrumb', origen: 'bootstrap', visible: true },
  { id: 5, nombre: 'Button', origen: 'bootstrap', visible: true },
  { id: 6, nombre: 'Button group', origen: 'bootstrap', visible: true },
  { id: 7, nombre: 'Card', origen: 'bootstrap', visible: true },
  { id: 8, nombre: 'Carousel', origen: 'bootstrap', visible: true },
  { id: 9, nombre: 'Close button', origen: 'bootstrap', visible: true },
  { id: 10, nombre: 'Collapse', origen: 'bootstrap', visible: true },
  { id: 11, nombre: 'Dropdown', origen: 'bootstrap', visible: true },
  { id: 12, nombre: 'List group', origen: 'bootstrap', visible: true },
  { id: 13, nombre: 'Modal', origen: 'bootstrap', visible: true },
  { id: 14, nombre: 'Navbar', origen: 'bootstrap', visible: true },
  { id: 15, nombre: 'Navs & tabs', origen: 'bootstrap', visible: true },
  { id: 16, nombre: 'Offcanvas', origen: 'bootstrap', visible: true },
  { id: 17, nombre: 'Pagination', origen: 'bootstrap', visible: true },
  { id: 18, nombre: 'Placeholder', origen: 'bootstrap', visible: true },
  { id: 19, nombre: 'Popover', origen: 'bootstrap', visible: true },
  { id: 20, nombre: 'Progress', origen: 'bootstrap', visible: true },
  { id: 21, nombre: 'Scrollspy', origen: 'bootstrap', visible: true },
  { id: 22, nombre: 'Spinner', origen: 'bootstrap', visible: true },
  { id: 23, nombre: 'Toast', origen: 'bootstrap', visible: true },
  { id: 24, nombre: 'Tooltip', origen: 'bootstrap', visible: true },
  { id: 25, nombre: 'Input', origen: 'bootstrap', visible: true },
  { id: 26, nombre: 'Select', origen: 'bootstrap', visible: true },
  { id: 27, nombre: 'Checkbox', origen: 'bootstrap', visible: true },
  { id: 28, nombre: 'Radio', origen: 'bootstrap', visible: true },
  { id: 29, nombre: 'Switch', origen: 'bootstrap', visible: true },
  { id: 30, nombre: 'Tabla', origen: 'bootstrap', visible: true },
];
