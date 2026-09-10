import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MockDataService } from '../../../core/mock-data';
import type { EstadoAuditoria } from '../../../core/models';

const ETIQUETA_ESTADO: Record<EstadoAuditoria, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada',
  archivada: 'Archivada',
};

// Pantalla 3 de specs/02-maqueta-m3.md: detalle de una auditoría y sus
// páginas.
@Component({
  selector: 'app-auditoria-detalle',
  imports: [RouterLink, MatButtonModule, MatChipsModule, MatIconModule, MatListModule],
  templateUrl: './auditoria-detalle.html',
})
export class AuditoriaDetalle {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = this.mockData.auditoria(this.auditoriaId);
  protected readonly paginas = this.mockData.paginasDeAuditoria(this.auditoriaId);
}
