import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { HallazgosService } from '../../../core/hallazgos';
import { MockDataService } from '../../../core/mock-data';
import type {
  CategoriaWCAG,
  CriterioWCAG,
  EstadoResultado,
  Hallazgo,
  NivelWCAG,
  Resultado,
  Severidad,
} from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { ResultadosService } from '../../../core/resultados';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon, type IconName } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

interface FilaChecklist {
  criterio: CriterioWCAG;
  resultado?: Resultado;
  hallazgos: Hallazgo[];
}

const ETIQUETA_ESTADO: Record<EstadoResultado, string> = {
  pasa: 'Pasa',
  falla: 'Falla',
  no_aplica: 'No aplica',
  por_revisar: 'Por revisar',
};

const ICONO_ESTADO: Record<EstadoResultado, IconName> = {
  pasa: 'check-circle',
  falla: 'x-circle',
  no_aplica: 'minus-circle',
  por_revisar: 'help-circle',
};

const ETIQUETA_CATEGORIA: Record<CategoriaWCAG, string> = {
  perceptible: 'Perceptible',
  operable: 'Operable',
  comprensible: 'Comprensible',
  robusto: 'Robusto',
};

const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

// Pantalla 5 de specs/02-maqueta-m3.md: checklist WCAG de una página, con
// filtros por nivel/categoría/estado/severidad. Resultado y Hallazgo son
// reales desde specs/06-checklist-manual.md: las filas se recalculan solas
// (liveQuery) y cada fila en "Falla" puede expandirse para ver/editar/
// eliminar sus hallazgos sin salir del checklist.
@Component({
  selector: 'app-pagina-checklist',
  imports: [RouterLink, AppButton, AppCard, AppFormField, AppIcon, AppSelect],
  templateUrl: './pagina-checklist.html',
})
export class PaginaChecklist {
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly mockData = inject(MockDataService);
  private readonly paginasService = inject(PaginasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly iconoEstado = ICONO_ESTADO;
  protected readonly etiquetaCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetaSeveridad = ETIQUETA_SEVERIDAD;

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  private readonly paginaIdNum = Number(this.paginaId);
  protected readonly pagina = toSignal(this.paginasService.porId$(this.paginaIdNum), {
    initialValue: undefined,
  });

  protected readonly niveles: NivelWCAG[] = ['A', 'AA'];
  protected readonly categorias: CategoriaWCAG[] = [
    'perceptible',
    'operable',
    'comprensible',
    'robusto',
  ];
  protected readonly estados: EstadoResultado[] = ['pasa', 'falla', 'no_aplica', 'por_revisar'];
  protected readonly severidades: Severidad[] = ['critica', 'alta', 'media', 'baja'];

  protected readonly filtroNivel = signal<NivelWCAG | 'todos'>('todos');
  protected readonly filtroCategoria = signal<CategoriaWCAG | 'todos'>('todos');
  protected readonly filtroEstado = signal<EstadoResultado | 'todos'>('todos');
  protected readonly filtroSeveridad = signal<Severidad | 'todos'>('todos');

  private readonly filas = toSignal(
    combineLatest([
      this.resultadosService.dePagina$(this.paginaIdNum),
      this.hallazgosService.dePagina$(this.paginaIdNum),
    ]).pipe(
      map(([resultados, hallazgos]): FilaChecklist[] =>
        this.criteriosWcag.todos().map((criterio) => {
          const resultado = resultados.find((r) => r.criterio_codigo === criterio.codigo);
          return {
            criterio,
            resultado,
            hallazgos: resultado ? hallazgos.filter((h) => h.resultado_id === resultado.id) : [],
          };
        }),
      ),
    ),
    { initialValue: [] as FilaChecklist[] },
  );

  protected readonly filasFiltradas = computed(() =>
    this.filas().filter((fila) => {
      const estado = this.estadoDe(fila);
      if (this.filtroNivel() !== 'todos' && fila.criterio.nivel !== this.filtroNivel()) return false;
      if (this.filtroCategoria() !== 'todos' && fila.criterio.categoria !== this.filtroCategoria())
        return false;
      if (this.filtroEstado() !== 'todos' && estado !== this.filtroEstado()) return false;
      if (
        this.filtroSeveridad() !== 'todos' &&
        !fila.hallazgos.some((hallazgo) => hallazgo.severidad === this.filtroSeveridad())
      )
        return false;
      return true;
    }),
  );

  protected estadoDe(fila: FilaChecklist): EstadoResultado {
    return fila.resultado?.estado ?? 'por_revisar';
  }

  // Métodos en vez de indexar los Record directamente en la plantilla:
  // el control de tipos estricto de la plantilla no infiere el tipo de
  // `fila` dentro de @for sin ayuda, así que se resuelve en el componente.
  protected categoriaEtiqueta(fila: FilaChecklist): string {
    return ETIQUETA_CATEGORIA[fila.criterio.categoria];
  }

  protected estadoEtiqueta(fila: FilaChecklist): string {
    return ETIQUETA_ESTADO[this.estadoDe(fila)];
  }

  protected estadoIcono(fila: FilaChecklist): IconName {
    return ICONO_ESTADO[this.estadoDe(fila)];
  }

  protected collapseId(codigoCriterio: string): string {
    return `hallazgos-${codigoCriterio.replace(/\./g, '-')}`;
  }

  protected componenteNombre(hallazgo: Hallazgo): string | undefined {
    return hallazgo.componente_id === undefined
      ? undefined
      : this.mockData.componente(hallazgo.componente_id)?.nombre;
  }

  private readonly expandidas = signal<ReadonlySet<string>>(new Set());

  protected estaExpandida(codigoCriterio: string): boolean {
    return this.expandidas().has(codigoCriterio);
  }

  protected toggleExpandir(codigoCriterio: string): void {
    const actualizado = new Set(this.expandidas());
    if (actualizado.has(codigoCriterio)) {
      actualizado.delete(codigoCriterio);
    } else {
      actualizado.add(codigoCriterio);
    }
    this.expandidas.set(actualizado);
  }

  protected async eliminarHallazgo(hallazgo: Hallazgo): Promise<void> {
    const confirmado = window.confirm('¿Eliminar este hallazgo? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    await this.hallazgosService.eliminar(hallazgo.id!);
    this.toast.mostrar('Hallazgo eliminado.');
  }

  protected onFiltroNivel(evento: Event): void {
    this.filtroNivel.set((evento.target as HTMLSelectElement).value as NivelWCAG | 'todos');
  }

  protected onFiltroCategoria(evento: Event): void {
    this.filtroCategoria.set((evento.target as HTMLSelectElement).value as CategoriaWCAG | 'todos');
  }

  protected onFiltroEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value as EstadoResultado | 'todos');
  }

  protected onFiltroSeveridad(evento: Event): void {
    this.filtroSeveridad.set((evento.target as HTMLSelectElement).value as Severidad | 'todos');
  }

  protected async eliminarPagina(): Promise<void> {
    const nombre = this.pagina()?.nombre ?? 'esta página';
    const confirmado = window.confirm(
      `¿Eliminar «${nombre}»? Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    await this.paginasService.eliminar(this.paginaIdNum);
    this.toast.mostrar('Página eliminada.');
    void this.router.navigate(['/auditorias', this.auditoriaId]);
  }
}
