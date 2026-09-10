import { Injectable } from '@angular/core';
import type { Componente, HallazgoPlantilla } from './models';

// Datos de ejemplo para la maqueta navegable — ver specs/02-maqueta-m3.md.
// Auditoria, Pagina, Resultado y Hallazgo ya son reales (Dexie, ver
// specs/05-auditorias-paginas.md y specs/06-checklist-manual.md); lo que
// queda aquí (HallazgoPlantilla, Componente) sigue siendo mock hasta sus
// propias rebanadas (07-catalogo-componentes, 08-biblioteca-hallazgos).
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly hallazgosPlantillaData: HallazgoPlantilla[] = [
    {
      id: 1,
      criterio_codigo: '1.1.1',
      componente_id: 5,
      titulo: 'Imagen decorativa sin marcar como tal',
      descripcion:
        'La imagen se anuncia con un nombre accesible irrelevante en lugar de omitirse del árbol de accesibilidad.',
      recomendacion_fix: 'Usar `alt=""` o `role="presentation"` si la imagen es puramente decorativa.',
      severidad_tipica: 'media',
      etiquetas: ['imagen', 'alt', 'decorativo'],
      veces_usado: 6,
      fecha_creacion: '2026-05-02',
    },
    {
      id: 2,
      criterio_codigo: '1.4.3',
      componente_id: 5,
      titulo: 'Contraste insuficiente en texto secundario',
      descripcion:
        'El texto de ayuda o metadatos usa un gris claro sobre fondo blanco que no alcanza 4.5:1.',
      recomendacion_fix: 'Oscurecer el color del texto hasta cumplir al menos 4.5:1, o aumentar su tamaño a "grande" según WCAG.',
      severidad_tipica: 'media',
      etiquetas: ['contraste', 'texto secundario'],
      veces_usado: 11,
      fecha_creacion: '2026-04-18',
    },
    {
      id: 3,
      criterio_codigo: '2.4.7',
      componente_id: 14,
      titulo: 'Foco no visible en enlaces del menú',
      descripcion:
        'El CSS del componente elimina el `outline` por defecto del navegador sin sustituirlo por un indicador de foco propio.',
      recomendacion_fix: 'Restaurar un `outline` o `box-shadow` visible en `:focus-visible` con contraste suficiente.',
      severidad_tipica: 'critica',
      etiquetas: ['foco', 'navegación', 'outline'],
      veces_usado: 9,
      fecha_creacion: '2026-03-27',
    },
    {
      id: 4,
      criterio_codigo: '3.3.2',
      componente_id: 25,
      titulo: 'Campo de formulario sin etiqueta visible',
      descripcion:
        'El campo solo tiene un `placeholder` como pista, que desaparece al escribir y no se asocia como etiqueta accesible.',
      recomendacion_fix: 'Añadir un `<label>` visible asociado con `for`/`id`, o `aria-label` si el diseño no permite label visible.',
      severidad_tipica: 'alta',
      etiquetas: ['formulario', 'etiqueta', 'placeholder'],
      veces_usado: 14,
      fecha_creacion: '2026-02-09',
    },
  ];

  private readonly componentesData: Componente[] = [
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
    { id: 31, nombre: 'Selector de fecha custom', origen: 'personalizado', visible: true },
    { id: 32, nombre: 'Chip de filtro', origen: 'personalizado', visible: true },
  ];

  hallazgosPlantilla(): HallazgoPlantilla[] {
    return this.hallazgosPlantillaData;
  }

  hallazgoPlantilla(id: number): HallazgoPlantilla | undefined {
    return this.hallazgosPlantillaData.find((hallazgo) => hallazgo.id === id);
  }

  hallazgosSugeridosPara(criterioCodigo: string, componenteId?: number): HallazgoPlantilla[] {
    return this.hallazgosPlantillaData.filter(
      (hallazgo) =>
        hallazgo.criterio_codigo === criterioCodigo &&
        (componenteId === undefined || hallazgo.componente_id === componenteId),
    );
  }

  componentes(): Componente[] {
    return this.componentesData;
  }

  componente(id: number): Componente | undefined {
    return this.componentesData.find((componente) => componente.id === id);
  }
}
