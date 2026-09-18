import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import type { CategoriaWCAG, EstadoResultado, Severidad } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { type FilaRankingPagina, ProgresoService } from '../../../core/progreso';
import { AppButton } from '../../../shared/ui/button';
import { AppDistribucionBarras, type FilaDistribucion } from '../../../shared/ui/distribucion-barras';
import { AppIcon, type IconName } from '../../../shared/ui/icon';
import { AppProgressBar } from '../../../shared/ui/progress-bar';

interface StatSeveridad {
  severidad: Severidad;
  etiqueta: string;
  icono: IconName;
  cantidad: number;
}

const FALLOS_VACIOS: Record<Severidad, number> = { critica: 0, alta: 0, media: 0, baja: 0 };

// Orden y colores del bloque "Estado de los criterios": lo accionable
// primero (Falla), lo pendiente al final (Por revisar). Mismos colores de
// estado que pagina-checklist (severidad-critica/baja/media, y neutro para
// "No aplica") — ver specs/14-panel-progreso.md.
const ORDEN_ESTADO: EstadoResultado[] = ['falla', 'pasa', 'no_aplica', 'por_revisar'];

const ETIQUETA_ESTADO: Record<EstadoResultado, string> = {
  falla: 'Falla',
  pasa: 'Pasa',
  no_aplica: 'No aplica',
  por_revisar: 'Por revisar',
};

const COLOR_ESTADO: Record<EstadoResultado, string | null> = {
  falla: 'var(--severidad-critica)',
  pasa: 'var(--severidad-baja)',
  no_aplica: null,
  por_revisar: 'var(--severidad-media)',
};

// Orden del bloque "Fallos por principio WCAG": el mismo de la norma
// (Perceptible, Operable, Comprensible, Robusto). Sin color propio: usa el
// violeta neutro por defecto de AppDistribucionBarras, igual que el
// ranking de páginas — no son severidades, así que no llevan su paleta.
const ORDEN_CATEGORIA: CategoriaWCAG[] = ['perceptible', 'operable', 'comprensible', 'robusto'];

const ETIQUETA_CATEGORIA: Record<CategoriaWCAG, string> = {
  perceptible: 'Perceptible',
  operable: 'Operable',
  comprensible: 'Comprensible',
  robusto: 'Robusto',
};

// Pantalla 11 de specs/02-maqueta-m3.md: panel de progreso. Los colores de
// severidad usan la paleta de estado fija definida en :root de
// src/styles.scss (nunca theming, siempre con icono + etiqueta) —
// deliberadamente independiente de cualquier color de marca. Auditoria y
// Pagina son reales desde specs/05-auditorias-paginas.md; el progreso
// (Resultado + Hallazgo) es real desde specs/06-checklist-manual.md.
@Component({
  selector: 'app-auditoria-progreso',
  imports: [RouterLink, AppButton, AppDistribucionBarras, AppIcon, AppProgressBar],
  templateUrl: './auditoria-progreso.html',
})
export class AuditoriaProgreso {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly progresoService = inject(ProgresoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = toSignal(this.auditoriasService.porId$(this.auditoriaId), {
    initialValue: undefined,
  });

  private readonly datos = toSignal(
    this.paginasService.deAuditoria$(this.auditoriaId).pipe(
      switchMap((paginas) =>
        combineLatest([
          this.progresoService.deAuditoria$(paginas),
          this.progresoService.rankingPaginas$(paginas),
        ]).pipe(map(([progreso, rankingPaginas]) => ({ progreso, rankingPaginas }))),
      ),
    ),
    {
      initialValue: {
        progreso: {
          totalCriterios: 0,
          revisados: 0,
          porcentajeRevisado: 0,
          fallosPorSeveridad: FALLOS_VACIOS,
          criteriosPorEstado: { pasa: 0, falla: 0, no_aplica: 0, por_revisar: 0 },
          fallosPorCategoria: { perceptible: 0, operable: 0, comprensible: 0, robusto: 0 },
        },
        rankingPaginas: [] as FilaRankingPagina[],
      },
    },
  );

  protected readonly porcentajeRevisado = computed(() => this.datos().progreso.porcentajeRevisado);
  protected readonly rankingPaginas = computed(() => this.datos().rankingPaginas);
  protected readonly filasRanking = computed<FilaDistribucion[]>(() =>
    this.rankingPaginas().map((fila) => ({ etiqueta: fila.nombre, cantidad: fila.cantidad })),
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

  protected readonly filasEstado = computed<FilaDistribucion[]>(() => {
    const criteriosPorEstado = this.datos().progreso.criteriosPorEstado;
    return ORDEN_ESTADO.map((estado) => ({
      etiqueta: ETIQUETA_ESTADO[estado],
      cantidad: criteriosPorEstado[estado],
      color: COLOR_ESTADO[estado],
    }));
  });

  protected readonly filasCategoria = computed<FilaDistribucion[]>(() => {
    const fallosPorCategoria = this.datos().progreso.fallosPorCategoria;
    return ORDEN_CATEGORIA.map((categoria) => ({
      etiqueta: ETIQUETA_CATEGORIA[categoria],
      cantidad: fallosPorCategoria[categoria],
    }));
  });

  // Controla el aviso de «Todavía no hay hallazgos registrados.» en los
  // bloques de severidad y de principio WCAG — ver
  // specs/14-panel-progreso.md.
  protected readonly sinHallazgos = computed(() => {
    const fallos = this.datos().progreso.fallosPorSeveridad;
    return Object.values(fallos).every((cantidad) => cantidad === 0);
  });
}
