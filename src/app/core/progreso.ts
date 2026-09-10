import { Injectable, inject } from '@angular/core';
import { combineLatest, map, of, type Observable } from 'rxjs';
import { CriteriosWcagService } from './criterios-wcag';
import { HallazgosService } from './hallazgos';
import type { Pagina, Severidad } from './models';
import { ResultadosService } from './resultados';

export interface ProgresoAuditoria {
  totalCriterios: number;
  revisados: number;
  porcentajeRevisado: number;
  fallosPorSeveridad: Record<Severidad, number>;
}

export interface FilaRankingPagina {
  nombre: string;
  cantidad: number;
}

const FALLOS_VACIOS: Record<Severidad, number> = { critica: 0, alta: 0, media: 0, baja: 0 };
const PROGRESO_VACIO: ProgresoAuditoria = {
  totalCriterios: 0,
  revisados: 0,
  porcentajeRevisado: 0,
  fallosPorSeveridad: FALLOS_VACIOS,
};

// Progreso real de una auditoría (% revisado, fallos por severidad) —
// sustituye a MockDataService.progresoDeAuditoria desde
// specs/06-checklist-manual.md. `fallosPorSeveridad` cuenta cada Hallazgo
// individualmente: varios hallazgos en un mismo criterio ya no cuentan como
// uno solo (a diferencia de "revisados", que sigue siendo por criterio).
@Injectable({ providedIn: 'root' })
export class ProgresoService {
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);

  deAuditoria$(paginas: Pagina[]): Observable<ProgresoAuditoria> {
    if (paginas.length === 0) return of(PROGRESO_VACIO);

    return combineLatest(
      paginas.map((pagina) =>
        combineLatest([
          this.resultadosService.dePagina$(pagina.id!),
          this.hallazgosService.dePagina$(pagina.id!),
        ]),
      ),
    ).pipe(
      map((porPagina) => {
        const totalCriterios = paginas.length * this.criteriosWcag.todos().length;
        let revisados = 0;
        const fallosPorSeveridad: Record<Severidad, number> = { ...FALLOS_VACIOS };

        for (const [resultados, hallazgos] of porPagina) {
          revisados += resultados.filter((resultado) => resultado.estado !== 'por_revisar').length;
          for (const hallazgo of hallazgos) {
            fallosPorSeveridad[hallazgo.severidad]++;
          }
        }

        return {
          totalCriterios,
          revisados,
          porcentajeRevisado: totalCriterios === 0 ? 0 : Math.round((revisados / totalCriterios) * 100),
          fallosPorSeveridad,
        };
      }),
    );
  }

  // Ranking de páginas por nº de criterios en "Falla" — mismo criterio que
  // antes de esta rebanada (un criterio en Falla cuenta 1, tenga uno o
  // varios hallazgos).
  rankingPaginas$(paginas: Pagina[]): Observable<FilaRankingPagina[]> {
    if (paginas.length === 0) return of([]);

    return combineLatest(
      paginas.map((pagina) =>
        this.resultadosService.dePagina$(pagina.id!).pipe(
          map(
            (resultados): FilaRankingPagina => ({
              nombre: pagina.nombre,
              cantidad: resultados.filter((resultado) => resultado.estado === 'falla').length,
            }),
          ),
        ),
      ),
    ).pipe(map((filas) => [...filas].sort((a, b) => b.cantidad - a.cantidad)));
  }
}
