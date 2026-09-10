import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditoriasService } from '../../../core/auditorias';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 12 de specs/02-maqueta-m3.md: exportación. Solo el layout del
// flujo — los botones no generan ningún archivo (ver "Qué NO entra"). La
// auditoría es real desde specs/05-auditorias-paginas.md.
@Component({
  selector: 'app-auditoria-exportar',
  imports: [RouterLink, AppButton, AppIcon],
  templateUrl: './auditoria-exportar.html',
})
export class AuditoriaExportar {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = toSignal(this.auditoriasService.porId$(this.auditoriaId), {
    initialValue: undefined,
  });

  protected exportar(formato: 'Excel' | 'PDF'): void {
    this.toast.mostrar(`La exportación a ${formato} llega en la rebanada 09-exportacion.`);
  }
}
