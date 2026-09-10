// Entidades del modelo de datos — ver specs/00-producto.md §6.

export type EstandarObjetivo = 'A' | 'AA';
export type EstadoAuditoria = 'en_progreso' | 'completada' | 'archivada';

export interface Auditoria {
  id?: number;
  nombre: string;
  cliente: string;
  url_base: string;
  fecha_inicio: string;
  estandar_objetivo: EstandarObjetivo;
  estado: EstadoAuditoria;
}

export interface Pagina {
  id?: number;
  auditoria_id: number;
  nombre: string;
  url: string;
  notas_generales: string;
}

export type NivelWCAG = 'A' | 'AA';
export type CategoriaWCAG = 'perceptible' | 'operable' | 'comprensible' | 'robusto';

export interface CriterioWCAG {
  codigo: string;
  nombre: string;
  nivel: NivelWCAG;
  categoria: CategoriaWCAG;
  descripcion: string;
  tecnicas: string[];
}

export type EstadoResultado = 'pasa' | 'falla' | 'no_aplica' | 'por_revisar';
export type Severidad = 'critica' | 'alta' | 'media' | 'baja';
export type OrigenResultado = 'manual' | 'automatico';

export interface Resultado {
  id?: number;
  pagina_id: number;
  criterio_codigo: string;
  estado: EstadoResultado;
  origen: OrigenResultado;
  notas: string;
  fecha_revision?: string;
}

// Instancia de un error concreto registrado sobre un Resultado — distinto de
// HallazgoPlantilla, que es la redacción reutilizable de la biblioteca (ver
// specs/06-checklist-manual.md). Varios hallazgos pueden colgar del mismo
// Resultado (mismo criterio en la misma página).
export interface Hallazgo {
  id?: number;
  resultado_id: number;
  severidad: Severidad;
  componente_id?: number;
  notas: string;
  hallazgo_plantilla_id?: number;
  fecha_creacion: string;
}

export type TipoEvidencia = 'captura' | 'nota';

export interface Evidencia {
  id?: number;
  hallazgo_id: number;
  tipo: TipoEvidencia;
  archivo?: Blob;
  texto?: string;
}

export interface HallazgoPlantilla {
  id?: number;
  criterio_codigo: string;
  componente_id?: number;
  titulo: string;
  descripcion: string;
  recomendacion_fix: string;
  severidad_tipica: Severidad;
  etiquetas: string[];
  veces_usado: number;
  fecha_creacion: string;
}

export type OrigenComponente = 'bootstrap' | 'personalizado';

export interface Componente {
  id?: number;
  nombre: string;
  origen: OrigenComponente;
  visible: boolean;
}
