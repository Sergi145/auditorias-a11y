import { Injectable, inject } from '@angular/core';
import { CriteriosWcagService } from './criterios-wcag';
import type { Componente, Evidencia, HallazgoPlantilla, Pagina, Resultado } from './models';

// Datos de ejemplo para la maqueta navegable — ver specs/02-maqueta-m3.md.
// Auditoria y Pagina ya son reales (Dexie vía AuditoriasService/
// PaginasService, ver specs/05-auditorias-paginas.md); lo que queda aquí
// (Resultado, Evidencia, HallazgoPlantilla, Componente) sigue siendo mock
// hasta sus propias rebanadas (06-checklist-manual, 07-catalogo-
// componentes, 08-biblioteca-hallazgos).
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly criteriosWcag = inject(CriteriosWcagService);

  private readonly resultadosData: Resultado[] = [
    {
      id: 1,
      pagina_id: 1,
      criterio_codigo: '1.1.1',
      estado: 'falla',
      severidad: 'alta',
      origen: 'automatico',
      notas: 'El logo del cabecero no tiene texto alternativo.',
      fecha_revision: '2026-08-12',
    },
    {
      id: 2,
      pagina_id: 1,
      criterio_codigo: '1.4.3',
      estado: 'falla',
      severidad: 'media',
      origen: 'manual',
      componente_id: 5,
      notas: 'El texto de ayuda en gris claro no alcanza 4.5:1 sobre fondo blanco.',
      hallazgo_plantilla_id: 2,
      fecha_revision: '2026-08-12',
    },
    {
      id: 3,
      pagina_id: 1,
      criterio_codigo: '2.1.1',
      estado: 'pasa',
      origen: 'manual',
      notas: 'Navegación completa con Tab/Shift+Tab verificada.',
      fecha_revision: '2026-08-12',
    },
    {
      id: 4,
      pagina_id: 1,
      criterio_codigo: '2.4.7',
      estado: 'falla',
      severidad: 'critica',
      origen: 'manual',
      componente_id: 14,
      notas: 'Los enlaces del menú principal no muestran anillo de foco visible.',
      hallazgo_plantilla_id: 3,
      fecha_revision: '2026-08-13',
    },
    {
      id: 5,
      pagina_id: 1,
      criterio_codigo: '2.4.11',
      estado: 'por_revisar',
      origen: 'automatico',
      notas: '',
    },
    {
      id: 6,
      pagina_id: 1,
      criterio_codigo: '3.1.1',
      estado: 'pasa',
      origen: 'automatico',
      notas: '`<html lang="es">` presente.',
      fecha_revision: '2026-08-12',
    },
    {
      id: 7,
      pagina_id: 1,
      criterio_codigo: '3.3.2',
      estado: 'no_aplica',
      origen: 'manual',
      notas: 'La página no tiene formularios.',
      fecha_revision: '2026-08-12',
    },
    {
      id: 8,
      pagina_id: 1,
      criterio_codigo: '4.1.2',
      estado: 'por_revisar',
      origen: 'automatico',
      notas: '',
    },
    {
      id: 9,
      pagina_id: 2,
      criterio_codigo: '3.3.2',
      estado: 'falla',
      severidad: 'alta',
      origen: 'manual',
      componente_id: 25,
      notas: 'El campo "DNI" no tiene etiqueta asociada, solo placeholder.',
      hallazgo_plantilla_id: 4,
      fecha_revision: '2026-08-14',
    },
    {
      id: 10,
      pagina_id: 2,
      criterio_codigo: '2.1.1',
      estado: 'por_revisar',
      origen: 'automatico',
      notas: '',
    },
  ];

  private readonly evidenciasData: Evidencia[] = [
    {
      id: 1,
      resultado_id: 1,
      tipo: 'nota',
      texto: 'Captura pendiente de subir: cabecero con logo sin alt.',
    },
    {
      id: 2,
      resultado_id: 4,
      tipo: 'nota',
      texto: 'Verificado con navegación por teclado y extensión de contraste de foco.',
    },
  ];

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

  resultadosDePagina(paginaId: number): Resultado[] {
    return this.resultadosData.filter((resultado) => resultado.pagina_id === paginaId);
  }

  resultado(paginaId: number, criterioCodigo: string): Resultado | undefined {
    return this.resultadosData.find(
      (resultado) => resultado.pagina_id === paginaId && resultado.criterio_codigo === criterioCodigo,
    );
  }

  evidenciasDeResultado(resultadoId: number): Evidencia[] {
    return this.evidenciasData.filter((evidencia) => evidencia.resultado_id === resultadoId);
  }

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

  // Resumen de progreso de una auditoría (% revisado, fallos por severidad)
  // usado en el listado (pantalla 1) y en el panel de progreso (pantalla 11).
  // Recibe las páginas ya resueltas (por PaginasService, real desde
  // specs/05-auditorias-paginas.md) en vez de leerlas él mismo — ver
  // "Decisiones tomadas y descartadas" de esa spec.
  progresoDeAuditoria(paginas: Pagina[]): {
    totalCriterios: number;
    revisados: number;
    porcentajeRevisado: number;
    fallosPorSeveridad: Record<'critica' | 'alta' | 'media' | 'baja', number>;
  } {
    const resultados = paginas.flatMap((pagina) => this.resultadosDePagina(pagina.id!));
    const totalCriterios = paginas.length * this.criteriosWcag.todos().length;
    const revisados = resultados.filter((resultado) => resultado.estado !== 'por_revisar').length;
    const fallosPorSeveridad: Record<'critica' | 'alta' | 'media' | 'baja', number> = {
      critica: 0,
      alta: 0,
      media: 0,
      baja: 0,
    };
    for (const resultado of resultados) {
      if (resultado.estado === 'falla' && resultado.severidad) {
        fallosPorSeveridad[resultado.severidad]++;
      }
    }
    return {
      totalCriterios,
      revisados,
      porcentajeRevisado: totalCriterios === 0 ? 0 : Math.round((revisados / totalCriterios) * 100),
      fallosPorSeveridad,
    };
  }
}
