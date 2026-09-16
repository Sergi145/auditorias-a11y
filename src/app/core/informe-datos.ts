import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuditoriasService } from './auditorias';
import { ComponentesService } from './componentes';
import { CriteriosWcagService } from './criterios-wcag';
import { HallazgosService } from './hallazgos';
import type { Auditoria, CriterioWCAG, EstadoResultado, Pagina, Severidad } from './models';
import { PaginasService } from './paginas';
import { ProgresoService, type ProgresoAuditoria } from './progreso';
import { ResultadosService } from './resultados';

export interface FilaChecklistInforme {
  pagina: Pagina;
  criterio: CriterioWCAG;
  estado: EstadoResultado;
}

export interface HallazgoInforme {
  pagina: Pagina;
  criterio: CriterioWCAG;
  severidad: Severidad;
  componenteNombre?: string;
  notas: string;
}

export interface InformeAuditoria {
  auditoria: Auditoria;
  paginas: Pagina[];
  checklist: FilaChecklistInforme[];
  hallazgos: HallazgoInforme[];
  progreso: ProgresoAuditoria;
}

// Ensambla, para una auditoría, todo lo que necesitan tanto
// ExportacionExcelService como ExportacionPdfService, para no duplicar
// consultas entre los dos — ver specs/09-exportacion.md. Lectura puntual
// (no reactiva): toma un snapshot con firstValueFrom() sobre los mismos
// servicios $ ya reactivos del resto de la app, mismo patrón que
// HallazgoDetalle.cargarHallazgo().
@Injectable({ providedIn: 'root' })
export class InformeDatosService {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly componentesService = inject(ComponentesService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly progresoService = inject(ProgresoService);

  async ensamblar(auditoriaId: number): Promise<InformeAuditoria | undefined> {
    const auditoria = await firstValueFrom(this.auditoriasService.porId$(auditoriaId));
    if (!auditoria) return undefined;

    const paginas = await firstValueFrom(this.paginasService.deAuditoria$(auditoriaId));
    const criterios = this.criteriosWcag.todos();

    const [componentes, progreso, datosPorPagina] = await Promise.all([
      firstValueFrom(this.componentesService.todos$()),
      firstValueFrom(this.progresoService.deAuditoria$(paginas)),
      Promise.all(
        paginas.map(async (pagina) => {
          const [resultados, hallazgos] = await Promise.all([
            firstValueFrom(this.resultadosService.dePagina$(pagina.id!)),
            firstValueFrom(this.hallazgosService.dePagina$(pagina.id!)),
          ]);
          return { pagina, resultados, hallazgos };
        }),
      ),
    ]);

    const checklist: FilaChecklistInforme[] = [];
    const hallazgosInforme: HallazgoInforme[] = [];

    for (const { pagina, resultados, hallazgos } of datosPorPagina) {
      const resultadosPorId = new Map(resultados.map((resultado) => [resultado.id!, resultado]));

      for (const criterio of criterios) {
        const resultado = resultados.find((r) => r.criterio_codigo === criterio.codigo);
        checklist.push({ pagina, criterio, estado: resultado?.estado ?? 'por_revisar' });
      }

      // Solo los hallazgos cuyo Resultado sigue en "falla" ahora mismo —
      // un hallazgo puede seguir existiendo aunque el estado del criterio
      // haya cambiado después (ver specs/09-exportacion.md).
      for (const hallazgo of hallazgos) {
        const resultado = resultadosPorId.get(hallazgo.resultado_id);
        if (resultado?.estado !== 'falla') continue;

        hallazgosInforme.push({
          pagina,
          criterio: this.criteriosWcag.porCodigo(resultado.criterio_codigo)!,
          severidad: hallazgo.severidad,
          componenteNombre:
            hallazgo.componente_id === undefined
              ? undefined
              : componentes.find((componente) => componente.id === hallazgo.componente_id)?.nombre,
          notas: hallazgo.notas,
        });
      }
    }

    return { auditoria, paginas, checklist, hallazgos: hallazgosInforme, progreso };
  }
}
