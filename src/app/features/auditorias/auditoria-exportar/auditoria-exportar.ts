import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockDataService } from '../../../core/mock-data';

// Pantalla 12 de specs/02-maqueta-m3.md: exportación. Solo el layout del
// flujo — los botones no generan ningún archivo (ver "Qué NO entra").
@Component({
  selector: 'app-auditoria-exportar',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './auditoria-exportar.html',
})
export class AuditoriaExportar {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = this.mockData.auditoria(this.auditoriaId);

  protected exportar(formato: 'Excel' | 'PDF'): void {
    this.snackBar.open(`La exportación a ${formato} llega en la rebanada 08-exportacion.`, 'Cerrar', {
      duration: 4000,
    });
  }
}
