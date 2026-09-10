import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import { MockDataService } from '../../../core/mock-data';
import type { Severidad } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon, type IconName } from '../../../shared/ui/icon';
import { AppProgressBar } from '../../../shared/ui/progress-bar';

interface StatSeveridad {
  severidad: Severidad;
  etiqueta: string;
  icono: IconName;
  cantidad: number;
}

interface FilaRanking {
  nombre: string;
  cantidad: number;
}

const FALLOS_VACIOS: Record<Severidad, number> = { critica: 0, alta: 0, media: 0, baja: 0 };

// Pantalla 11 de specs/02-maqueta-m3.md: panel de progreso. Los colores de
// severidad usan la paleta de estado fija definida en :root de
// src/styles.scss (nunca theming, siempre con icono + etiqueta) —
// deliberadamente independiente de cualquier color de marca. Auditoria y
// Pagina son reales desde specs/05-auditorias-paginas.md; el progreso en
// sí sigue calculándose sobre los resultados mock de MockDataService.
@Component({
  selector: 'app-auditoria-progreso',
  imports: [RouterLink, AppButton, AppIcon, AppProgressBar],
  templateUrl: './auditoria-progreso.html',
})
export class AuditoriaProgreso {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = toSignal(this.auditoriasService.porId$(this.auditoriaId), {
    initialValue: undefined,
  });

  private readonly datos = toSignal(
    this.paginasService.deAuditoria$(this.auditoriaId).pipe(
      map((paginas) => {
        const progreso = this.mockData.progresoDeAuditoria(paginas);
        const rankingPaginas: FilaRanking[] = paginas
          .map((pagina) => ({
            nombre: pagina.nombre,
            cantidad: this.mockData
              .resultadosDePagina(pagina.id!)
              .filter((resultado) => resultado.estado === 'falla').length,
          }))
          .sort((a, b) => b.cantidad - a.cantidad);
        return { progreso, rankingPaginas };
      }),
    ),
    {
      initialValue: {
        progreso: { totalCriterios: 0, revisados: 0, porcentajeRevisado: 0, fallosPorSeveridad: FALLOS_VACIOS },
        rankingPaginas: [] as FilaRanking[],
      },
    },
  );

  protected readonly porcentajeRevisado = computed(() => this.datos().progreso.porcentajeRevisado);
  protected readonly rankingPaginas = computed(() => this.datos().rankingPaginas);
  protected readonly maxIncidencias = computed(() =>
    Math.max(1, ...this.rankingPaginas().map((fila) => fila.cantidad)),
  );

  protected readonly statsSeveridad = computed<StatSeveridad[]>(() => {
    const fallos = this.datos().progreso.fallosPorSeveridad;
    return [
      { severidad: 'critica', etiqueta: 'Crítica', icono: 'alert-triangle', cantidad: fallos.critica },
      { severidad: 'alta', etiqueta: 'Alta', icono: 'alert-triangle', cantidad: fallos.alta },
      { severidad: 'media', etiqueta: 'Media', icono: 'alert-circle', cantidad: fallos.media },
      { severidad: 'baja', etiqueta: 'Baja', icono: 'info', cantidad: fallos.baja },
    ];
  });
}
