import { Injectable } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';
import type {
  Auditoria,
  CriterioWCAG,
  Componente,
  Evidencia,
  Hallazgo,
  HallazgoPlantilla,
  Pagina,
  Resultado,
} from './models';

// Esquema completo declarado desde la fundación (v1) para evitar migraciones
// constantes en cada rebanada siguiente — ver specs/01-fundacion.md. La v2
// (specs/06-checklist-manual.md) añade la tabla `hallazgos` y recorta los
// índices de `resultados`: severidad/componente_id/hallazgo_plantilla_id se
// mudan de Resultado a Hallazgo (varios hallazgos por resultado).
class AuditoriasA11yDatabase extends Dexie {
  auditorias!: EntityTable<Auditoria, 'id'>;
  paginas!: EntityTable<Pagina, 'id'>;
  criteriosWCAG!: EntityTable<CriterioWCAG, 'codigo'>;
  resultados!: EntityTable<Resultado, 'id'>;
  hallazgos!: EntityTable<Hallazgo, 'id'>;
  evidencias!: EntityTable<Evidencia, 'id'>;
  hallazgosPlantilla!: EntityTable<HallazgoPlantilla, 'id'>;
  componentes!: EntityTable<Componente, 'id'>;

  constructor() {
    super('auditorias-a11y');
    this.version(1).stores({
      auditorias: '++id, nombre, cliente, estado',
      paginas: '++id, auditoria_id',
      criteriosWCAG: 'codigo, nivel, categoria',
      resultados: '++id, pagina_id, criterio_codigo, componente_id, estado, hallazgo_plantilla_id',
      evidencias: '++id, resultado_id',
      hallazgosPlantilla: '++id, criterio_codigo, componente_id',
      componentes: '++id, nombre, origen, visible',
    });
    this.version(2).stores({
      resultados: '++id, pagina_id, criterio_codigo, estado',
      hallazgos: '++id, resultado_id, severidad, componente_id, hallazgo_plantilla_id',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  readonly db = new AuditoriasA11yDatabase();

  constructor() {
    // Dexie abre la conexión de forma perezosa (en la primera consulta); la
    // abrimos explícitamente al arrancar para que la app cree la base de
    // datos desde el primer momento — ver specs/01-fundacion.md.
    void this.db.open();
  }
}
