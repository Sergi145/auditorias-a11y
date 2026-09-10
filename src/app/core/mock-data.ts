import { Injectable } from '@angular/core';
import type {
  Auditoria,
  Componente,
  CriterioWCAG,
  Evidencia,
  HallazgoPlantilla,
  Pagina,
  Resultado,
} from './models';

// Datos de ejemplo para la maqueta navegable — ver specs/02-maqueta-m3.md.
// Nada de esto persiste ni se lee de Dexie: es solo la forma de las
// entidades reales para poder recorrer las 12 pantallas con contenido
// plausible. Rebanadas futuras sustituyen este servicio por DatabaseService
// sin tocar las plantillas, siempre que expongan los mismos métodos.
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly auditoriasData: Auditoria[] = [
    {
      id: 1,
      nombre: 'Portal de Atención Ciudadana',
      cliente: 'Ayuntamiento de Rivas',
      url_base: 'https://atencion-ciudadana.example.org',
      fecha_inicio: '2026-08-10',
      estandar_objetivo: 'AA',
      estado: 'en_progreso',
    },
    {
      id: 2,
      nombre: 'Tienda online Kadela Home',
      cliente: 'Kadela Home S.L.',
      url_base: 'https://kadela-home.example.com',
      fecha_inicio: '2026-07-01',
      estandar_objetivo: 'AA',
      estado: 'completada',
    },
    {
      id: 3,
      nombre: 'Intranet de RRHH',
      cliente: 'Grupo Solmar',
      url_base: 'https://intranet.solmar.example.com',
      fecha_inicio: '2026-06-15',
      estandar_objetivo: 'A',
      estado: 'archivada',
    },
  ];

  private readonly paginasData: Pagina[] = [
    {
      id: 1,
      auditoria_id: 1,
      nombre: 'Home',
      url: 'https://atencion-ciudadana.example.org/',
      notas_generales: 'Página de entrada con acceso a los trámites más usados.',
    },
    {
      id: 2,
      auditoria_id: 1,
      nombre: 'Formulario de cita previa',
      url: 'https://atencion-ciudadana.example.org/cita-previa',
      notas_generales: '',
    },
    {
      id: 3,
      auditoria_id: 2,
      nombre: 'Listado de productos',
      url: 'https://kadela-home.example.com/productos',
      notas_generales: '',
    },
    {
      id: 4,
      auditoria_id: 2,
      nombre: 'Checkout',
      url: 'https://kadela-home.example.com/checkout',
      notas_generales: 'Flujo de pago en 3 pasos.',
    },
    {
      id: 5,
      auditoria_id: 3,
      nombre: 'Panel de nóminas',
      url: 'https://intranet.solmar.example.com/nominas',
      notas_generales: '',
    },
  ];

  private readonly criteriosWCAGData: CriterioWCAG[] = [
    {
      codigo: '1.1.1',
      nombre: 'Contenido no textual',
      nivel: 'A',
      categoria: 'perceptible',
      descripcion: 'Todo contenido no textual tiene una alternativa textual equivalente.',
      tecnicas: ['G94', 'G95', 'H37'],
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
      codigo: '2.1.1',
      nombre: 'Teclado',
      nivel: 'A',
      categoria: 'operable',
      descripcion: 'Toda la funcionalidad está disponible mediante teclado.',
      tecnicas: ['G202'],
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
      descripcion:
        'El elemento con foco de teclado no queda completamente oculto por otro contenido.',
      tecnicas: ['C43'],
    },
    {
      codigo: '3.1.1',
      nombre: 'Idioma de la página',
      nivel: 'A',
      categoria: 'comprensible',
      descripcion: 'El idioma por defecto de cada página se puede determinar por software.',
      tecnicas: ['H57'],
    },
    {
      codigo: '3.3.2',
      nombre: 'Etiquetas o instrucciones',
      nivel: 'A',
      categoria: 'comprensible',
      descripcion: 'Se proporcionan etiquetas o instrucciones cuando el contenido requiere entrada del usuario.',
      tecnicas: ['G131', 'G89'],
    },
    {
      codigo: '4.1.2',
      nombre: 'Nombre, función, valor',
      nivel: 'A',
      categoria: 'robusto',
      descripcion:
        'Para todo componente de interfaz, el nombre, la función y el valor se pueden determinar por software.',
      tecnicas: ['G108', 'ARIA16'],
    },
  ];

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

  auditorias(): Auditoria[] {
    return this.auditoriasData;
  }

  auditoria(id: number): Auditoria | undefined {
    return this.auditoriasData.find((auditoria) => auditoria.id === id);
  }

  paginasDeAuditoria(auditoriaId: number): Pagina[] {
    return this.paginasData.filter((pagina) => pagina.auditoria_id === auditoriaId);
  }

  pagina(id: number): Pagina | undefined {
    return this.paginasData.find((pagina) => pagina.id === id);
  }

  criteriosWCAG(): CriterioWCAG[] {
    return this.criteriosWCAGData;
  }

  criterio(codigo: string): CriterioWCAG | undefined {
    return this.criteriosWCAGData.find((criterio) => criterio.codigo === codigo);
  }

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
  progresoDeAuditoria(auditoriaId: number): {
    totalCriterios: number;
    revisados: number;
    porcentajeRevisado: number;
    fallosPorSeveridad: Record<'critica' | 'alta' | 'media' | 'baja', number>;
  } {
    const paginas = this.paginasDeAuditoria(auditoriaId);
    const resultados = paginas.flatMap((pagina) => this.resultadosDePagina(pagina.id!));
    const totalCriterios = paginas.length * this.criteriosWCAGData.length;
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
