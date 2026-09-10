import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MockDataService } from '../../../core/mock-data';
import type { Severidad } from '../../../core/models';

interface StatSeveridad {
  severidad: Severidad;
  etiqueta: string;
  icono: string;
  cantidad: number;
}

interface FilaRanking {
  nombre: string;
  cantidad: number;
}

// Pantalla 11 de specs/02-maqueta-m3.md: panel de progreso. Los colores de
// severidad usan la paleta de estado fija de la skill de dataviz (nunca
// theming, siempre con icono + etiqueta) — ver auditoria-progreso.scss.
@Component({
  selector: 'app-auditoria-progreso',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './auditoria-progreso.html',
  styleUrl: './auditoria-progreso.scss',
})
export class AuditoriaProgreso {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = this.mockData.auditoria(this.auditoriaId);

  private readonly paginas = this.mockData.paginasDeAuditoria(this.auditoriaId);
  private readonly progreso = this.mockData.progresoDeAuditoria(this.auditoriaId);

  protected readonly porcentajeRevisado = this.progreso.porcentajeRevisado;

  protected readonly statsSeveridad: StatSeveridad[] = [
    {
      severidad: 'critica',
      etiqueta: 'Crítica',
      icono: 'report',
      cantidad: this.progreso.fallosPorSeveridad.critica,
    },
    {
      severidad: 'alta',
      etiqueta: 'Alta',
      icono: 'warning',
      cantidad: this.progreso.fallosPorSeveridad.alta,
    },
    {
      severidad: 'media',
      etiqueta: 'Media',
      icono: 'error_outline',
      cantidad: this.progreso.fallosPorSeveridad.media,
    },
    {
      severidad: 'baja',
      etiqueta: 'Baja',
      icono: 'info_outline',
      cantidad: this.progreso.fallosPorSeveridad.baja,
    },
  ];

  protected readonly rankingPaginas: FilaRanking[] = this.paginas
    .map((pagina) => ({
      nombre: pagina.nombre,
      cantidad: this.mockData
        .resultadosDePagina(pagina.id!)
        .filter((resultado) => resultado.estado === 'falla').length,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  protected readonly maxIncidencias = Math.max(1, ...this.rankingPaginas.map((fila) => fila.cantidad));
}
