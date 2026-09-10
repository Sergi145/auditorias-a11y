import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/mock-data';
import type { Severidad } from '../../../core/models';
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

// Pantalla 11 de specs/02-maqueta-m3.md: panel de progreso. Los colores de
// severidad usan la paleta de estado fija definida en :root de
// src/styles.scss (nunca theming, siempre con icono + etiqueta) —
// deliberadamente independiente de cualquier color de marca.
@Component({
  selector: 'app-auditoria-progreso',
  imports: [RouterLink, AppButton, AppIcon, AppProgressBar],
  templateUrl: './auditoria-progreso.html',
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
      icono: 'alert-triangle',
      cantidad: this.progreso.fallosPorSeveridad.critica,
    },
    {
      severidad: 'alta',
      etiqueta: 'Alta',
      icono: 'alert-triangle',
      cantidad: this.progreso.fallosPorSeveridad.alta,
    },
    {
      severidad: 'media',
      etiqueta: 'Media',
      icono: 'alert-circle',
      cantidad: this.progreso.fallosPorSeveridad.media,
    },
    {
      severidad: 'baja',
      etiqueta: 'Baja',
      icono: 'info',
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
