import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule, type MatSelectChange } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MockDataService } from '../../../core/mock-data';
import type {
  CategoriaWCAG,
  CriterioWCAG,
  EstadoResultado,
  NivelWCAG,
  Resultado,
  Severidad,
} from '../../../core/models';

interface FilaChecklist {
  criterio: CriterioWCAG;
  resultado?: Resultado;
}

const ETIQUETA_ESTADO: Record<EstadoResultado, string> = {
  pasa: 'Pasa',
  falla: 'Falla',
  no_aplica: 'No aplica',
  por_revisar: 'Por revisar',
};

const ICONO_ESTADO: Record<EstadoResultado, string> = {
  pasa: 'check_circle',
  falla: 'error',
  no_aplica: 'remove_circle',
  por_revisar: 'help',
};

const ETIQUETA_CATEGORIA: Record<CategoriaWCAG, string> = {
  perceptible: 'Perceptible',
  operable: 'Operable',
  comprensible: 'Comprensible',
  robusto: 'Robusto',
};

// Pantalla 5 de specs/02-maqueta-m3.md: checklist WCAG de una página, con
// filtros por nivel/categoría/estado/severidad. El filtrado es en cliente
// sobre datos de MockDataService — no es persistencia ni lógica de negocio.
@Component({
  selector: 'app-pagina-checklist',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './pagina-checklist.html',
  styleUrl: './pagina-checklist.scss',
})
export class PaginaChecklist {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly iconoEstado = ICONO_ESTADO;
  protected readonly etiquetaCategoria = ETIQUETA_CATEGORIA;

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly pagina = this.mockData.pagina(Number(this.paginaId));

  protected readonly displayedColumns = [
    'criterio',
    'nivel',
    'categoria',
    'estado',
    'severidad',
    'acciones',
  ];

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

  private readonly filas: FilaChecklist[] = this.mockData.criteriosWCAG().map((criterio) => ({
    criterio,
    resultado: this.mockData.resultado(Number(this.paginaId), criterio.codigo),
  }));

  protected readonly filasFiltradas = computed(() =>
    this.filas.filter((fila) => {
      const estado = this.estadoDe(fila);
      if (this.filtroNivel() !== 'todos' && fila.criterio.nivel !== this.filtroNivel()) return false;
      if (this.filtroCategoria() !== 'todos' && fila.criterio.categoria !== this.filtroCategoria())
        return false;
      if (this.filtroEstado() !== 'todos' && estado !== this.filtroEstado()) return false;
      if (this.filtroSeveridad() !== 'todos' && fila.resultado?.severidad !== this.filtroSeveridad())
        return false;
      return true;
    }),
  );

  protected estadoDe(fila: FilaChecklist): EstadoResultado {
    return fila.resultado?.estado ?? 'por_revisar';
  }

  // Métodos en vez de indexar los Record directamente en la plantilla:
  // *matCellDef="let fila" no infiere tipos sin `strictTemplates`, así que
  // `fila` llega como `any` y el indexado dispara TS7053 en el build.
  protected categoriaEtiqueta(fila: FilaChecklist): string {
    return ETIQUETA_CATEGORIA[fila.criterio.categoria];
  }

  protected estadoEtiqueta(fila: FilaChecklist): string {
    return ETIQUETA_ESTADO[this.estadoDe(fila)];
  }

  protected estadoIcono(fila: FilaChecklist): string {
    return ICONO_ESTADO[this.estadoDe(fila)];
  }

  protected onFiltroNivel(evento: MatSelectChange<NivelWCAG | 'todos'>): void {
    this.filtroNivel.set(evento.value);
  }

  protected onFiltroCategoria(evento: MatSelectChange<CategoriaWCAG | 'todos'>): void {
    this.filtroCategoria.set(evento.value);
  }

  protected onFiltroEstado(evento: MatSelectChange<EstadoResultado | 'todos'>): void {
    this.filtroEstado.set(evento.value);
  }

  protected onFiltroSeveridad(evento: MatSelectChange<Severidad | 'todos'>): void {
    this.filtroSeveridad.set(evento.value);
  }
}
