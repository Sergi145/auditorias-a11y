import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import type { Auditoria, EstadoAuditoria, Severidad } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { ProgresoService } from '../../../core/progreso';
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
// global, % completado y fallos por severidad. Auditoria y Pagina son
// reales desde specs/05-auditorias-paginas.md; el progreso (Resultado +
// Hallazgo) es real desde specs/06-checklist-manual.md — lectura reactiva
// combinando AuditoriasService + PaginasService + ProgresoService.
@Component({
  selector: 'app-auditorias-listado',
  imports: [RouterLink, AppButton, AppCard, AppChip, AppIcon, AppProgressBar],
  templateUrl: './auditorias-listado.html',
})
export class AuditoriasListado {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly progresoService = inject(ProgresoService);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  protected readonly auditorias = toSignal(
    this.auditoriasService.todas$().pipe(
      switchMap((auditorias) =>
        auditorias.length === 0
          ? of<AuditoriaConProgreso[]>([])
          : combineLatest(
              auditorias.map((auditoria) =>
                this.paginasService.deAuditoria$(auditoria.id!).pipe(
                  switchMap((paginas) =>
                    this.progresoService.deAuditoria$(paginas).pipe(
                      map(
                        (progreso): AuditoriaConProgreso => ({
                          auditoria,
                          porcentajeRevisado: progreso.porcentajeRevisado,
                          fallosPorSeveridad: progreso.fallosPorSeveridad,
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
      ),
    ),
    { initialValue: [] as AuditoriaConProgreso[] },
  );
}
