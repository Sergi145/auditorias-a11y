import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/mock-data';
import type { Auditoria, EstadoAuditoria, Severidad } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { AppIcon } from '../../../shared/ui/icon';
import { AppProgressBar } from '../../../shared/ui/progress-bar';

interface AuditoriaConProgreso {
  auditoria: Auditoria;
  porcentajeRevisado: number;
  fallosPorSeveridad: Record<Severidad, number>;
}

const ETIQUETA_ESTADO: Record<EstadoAuditoria, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada',
  archivada: 'Archivada',
};

// Pantalla 1 de specs/02-maqueta-m3.md: listado de auditorías con estado
// global, % completado y fallos por severidad — datos de MockDataService.
@Component({
  selector: 'app-auditorias-listado',
  imports: [RouterLink, AppButton, AppCard, AppChip, AppIcon, AppProgressBar],
  templateUrl: './auditorias-listado.html',
})
export class AuditoriasListado {
  private readonly mockData = inject(MockDataService);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  protected readonly auditorias: AuditoriaConProgreso[] = this.mockData.auditorias().map((auditoria) => {
    const progreso = this.mockData.progresoDeAuditoria(auditoria.id!);
    return {
      auditoria,
      porcentajeRevisado: progreso.porcentajeRevisado,
      fallosPorSeveridad: progreso.fallosPorSeveridad,
    };
  });
}
