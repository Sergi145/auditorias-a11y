import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuditoriasService } from '../../../core/auditorias';
import type { EstadoAuditoria } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { AppButton } from '../../../shared/ui/button';
import { AppChip } from '../../../shared/ui/chip';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { AppSelect } from '../../../shared/ui/field-controls';
import { ToastService } from '../../../shared/ui/toast';

const ETIQUETA_ESTADO: Record<EstadoAuditoria, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada',
  archivada: 'Archivada',
};

// Pantalla 3 de specs/02-maqueta-m3.md: detalle de una auditoría y sus
// páginas. Lectura reactiva y acciones reales (cambiar estado, eliminar
// con cascada) desde specs/05-auditorias-paginas.md.
@Component({
  selector: 'app-auditoria-detalle',
  imports: [RouterLink, AppButton, AppChip, AppFormField, AppIcon, AppSelect],
  templateUrl: './auditoria-detalle.html',
})
export class AuditoriaDetalle {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly estados: EstadoAuditoria[] = ['en_progreso', 'completada', 'archivada'];
  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));

  protected readonly auditoria = toSignal(this.auditoriasService.porId$(this.auditoriaId), {
    initialValue: undefined,
  });
  protected readonly paginas = toSignal(this.paginasService.deAuditoria$(this.auditoriaId), {
    initialValue: [],
  });

  protected async cambiarEstado(evento: Event): Promise<void> {
    const estado = (evento.target as HTMLSelectElement).value as EstadoAuditoria;
    await this.auditoriasService.cambiarEstado(this.auditoriaId, estado);
    this.toast.mostrar('Estado actualizado.');
  }

  protected async eliminar(): Promise<void> {
    const nombre = this.auditoria()?.nombre ?? 'esta auditoría';
    const confirmado = window.confirm(
      `¿Eliminar «${nombre}»? Se eliminarán también todas sus páginas. Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    await this.auditoriasService.eliminar(this.auditoriaId);
    this.toast.mostrar('Auditoría eliminada.');
    void this.router.navigate(['/auditorias']);
  }
}
