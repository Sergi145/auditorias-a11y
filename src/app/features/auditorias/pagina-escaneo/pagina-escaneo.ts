import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MockDataService } from '../../../core/mock-data';

// Pantalla 6 de specs/02-maqueta-m3.md: escaneo automático (HTML pegado o
// URL en vivo). Solo el layout del flujo — no ejecuta axe-core de verdad
// (ver "Qué NO entra").
@Component({
  selector: 'app-pagina-escaneo',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
  ],
  templateUrl: './pagina-escaneo.html',
  styleUrl: './pagina-escaneo.scss',
})
export class PaginaEscaneo {
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly pagina = this.mockData.pagina(Number(this.paginaId));

  protected readonly formularioHtml = this.fb.nonNullable.group({ html: [''] });
  protected readonly formularioUrl = this.fb.nonNullable.group({ url: [this.pagina?.url ?? ''] });

  protected ejecutarEscaneo(): void {
    this.snackBar.open(
      'El escaneo automático con axe-core llega en la rebanada 09-escaneo-axe.',
      'Cerrar',
      { duration: 4000 },
    );
  }
}
