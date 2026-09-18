import { Injectable, inject } from '@angular/core';
import { combineLatest, map, of, type Observable } from 'rxjs';
import { CriteriosWcagService } from './criterios-wcag';
import { HallazgosService } from './hallazgos';
import type { CategoriaWCAG, EstadoResultado, Pagina, Severidad } from './models';
import { ResultadosService } from './resultados';

export interface ProgresoAuditoria {
  totalCriterios: number;
  revisados: number;
  porcentajeRevisado: number;
  fallosPorSeveridad: Record<Severidad, number>;
  // Página × criterio del catálogo, según el estado de su Resultado. Un
  // criterio sin Resultado cuenta como 'por_revisar' — ver
  // specs/14-panel-progreso.md. Las cuatro cifras suman siempre
  // totalCriterios.
  criteriosPorEstado: Record<EstadoResultado, number>;
  // Cada Hallazgo cuenta uno, según la categoría de su criterio — misma
  // unidad que fallosPorSeveridad, así que ambos bloques suman lo mismo.
  fallosPorCategoria: Record<CategoriaWCAG, number>;
}

export interface FilaRankingPagina {
  nombre: string;
  cantidad: number;
}

const FALLOS_VACIOS: Record<Severidad, number> = { critica: 0, alta: 0, media: 0, baja: 0 };
const CRITERIOS_POR_ESTADO_VACIO: Record<EstadoResultado, number> = {
  pasa: 0,
  falla: 0,
  no_aplica: 0,
  por_revisar: 0,
};
const FALLOS_POR_CATEGORIA_VACIO: Record<CategoriaWCAG, number> = {
  perceptible: 0,
  operable: 0,
  comprensible: 0,
  robusto: 0,
};
const PROGRESO_VACIO: ProgresoAuditoria = {
  totalCriterios: 0,
  revisados: 0,
  porcentajeRevisado: 0,
  fallosPorSeveridad: FALLOS_VACIOS,
  criteriosPorEstado: CRITERIOS_POR_ESTADO_VACIO,
  fallosPorCategoria: FALLOS_POR_CATEGORIA_VACIO,
};

// Progreso real de una auditoría (% revisado, fallos por severidad, estado
// de los criterios y fallos por principio WCAG) — sustituye a
// MockDataService.progresoDeAuditoria desde specs/06-checklist-manual.md.
// `fallosPorSeveridad` y `fallosPorCategoria` cuentan cada Hallazgo
// individualmente: varios hallazgos en un mismo criterio ya no cuentan como
// uno solo (a diferencia de "revisados"/`criteriosPorEstado`, que siguen
// siendo por criterio) — ver specs/14-panel-progreso.md.
@Injectable({ providedIn: 'root' })
export class ProgresoService {
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);

  deAuditoria$(paginas: Pagina[]): Observable<ProgresoAuditoria> {
    if (paginas.length === 0) return of(PROGRESO_VACIO);

    const todosCriterios = this.criteriosWcag.todos();

    return combineLatest(
      paginas.map((pagina) =>
        combineLatest([
          this.resultadosService.dePagina$(pagina.id!),
          this.hallazgosService.dePagina$(pagina.id!),
        ]),
      ),
    ).pipe(
      map((porPagina) => {
        const totalCriterios = paginas.length * todosCriterios.length;
        let revisados = 0;
        const fallosPorSeveridad: Record<Severidad, number> = { ...FALLOS_VACIOS };
        const criteriosPorEstado: Record<EstadoResultado, number> = { ...CRITERIOS_POR_ESTADO_VACIO };
        const fallosPorCategoria: Record<CategoriaWCAG, number> = { ...FALLOS_POR_CATEGORIA_VACIO };

        for (const [resultados, hallazgos] of porPagina) {
          revisados += resultados.filter((resultado) => resultado.estado !== 'por_revisar').length;

          const resultadoPorCriterio = new Map(resultados.map((r) => [r.criterio_codigo, r]));
          for (const criterio of todosCriterios) {
            const estado = resultadoPorCriterio.get(criterio.codigo)?.estado ?? 'por_revisar';
            criteriosPorEstado[estado]++;
          }

          const criterioCodigoPorResultadoId = new Map(resultados.map((r) => [r.id, r.criterio_codigo]));
          for (const hallazgo of hallazgos) {
            fallosPorSeveridad[hallazgo.severidad]++;

            const criterioCodigo = criterioCodigoPorResultadoId.get(hallazgo.resultado_id);
            const categoria = criterioCodigo
              ? this.criteriosWcag.porCodigo(criterioCodigo)?.categoria
              : undefined;
            if (categoria) fallosPorCategoria[categoria]++;
          }
        }

        return {
          totalCriterios,
          revisados,
          porcentajeRevisado: totalCriterios === 0 ? 0 : Math.round((revisados / totalCriterios) * 100),
          fallosPorSeveridad,
          criteriosPorEstado,
          fallosPorCategoria,
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
