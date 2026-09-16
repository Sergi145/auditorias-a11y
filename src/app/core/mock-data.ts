import { Injectable } from '@angular/core';
import type { HallazgoPlantilla } from './models';

// Datos de ejemplo para la maqueta navegable — ver specs/02-maqueta-m3.md.
// Auditoria, Pagina, Resultado, Hallazgo y Componente ya son reales (Dexie,
// ver specs/05-auditorias-paginas.md, specs/06-checklist-manual.md y
// specs/07-catalogo-componentes.md); lo que queda aquí (HallazgoPlantilla)
// sigue siendo mock hasta su propia rebanada (08-biblioteca-hallazgos).
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
}
