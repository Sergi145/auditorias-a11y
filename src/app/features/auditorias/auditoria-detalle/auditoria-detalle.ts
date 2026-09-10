import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/mock-data';
import type { EstadoAuditoria } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppChip } from '../../../shared/ui/chip';
import { AppIcon } from '../../../shared/ui/icon';

const ETIQUETA_ESTADO: Record<EstadoAuditoria, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada',
  archivada: 'Archivada',
};

// Pantalla 3 de specs/02-maqueta-m3.md: detalle de una auditoría y sus
// páginas.
@Component({
  selector: 'app-auditoria-detalle',
  imports: [RouterLink, AppButton, AppChip, AppIcon],
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
