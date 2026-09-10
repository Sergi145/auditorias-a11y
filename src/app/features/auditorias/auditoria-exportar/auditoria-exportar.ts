import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/mock-data';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 12 de specs/02-maqueta-m3.md: exportación. Solo el layout del
// flujo — los botones no generan ningún archivo (ver "Qué NO entra").
@Component({
  selector: 'app-auditoria-exportar',
  imports: [RouterLink, AppButton, AppIcon],
  templateUrl: './auditoria-exportar.html',
})
export class AuditoriaExportar {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = this.mockData.auditoria(this.auditoriaId);

  protected exportar(formato: 'Excel' | 'PDF'): void {
    this.toast.mostrar(`La exportación a ${formato} llega en la rebanada 09-exportacion.`);
  }
}
