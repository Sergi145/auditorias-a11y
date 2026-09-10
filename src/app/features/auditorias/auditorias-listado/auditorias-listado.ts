import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MockDataService } from '../../../core/mock-data';
import type { Auditoria, EstadoAuditoria, Severidad } from '../../../core/models';

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
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './auditorias-listado.html',
  styleUrl: './auditorias-listado.scss',
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
