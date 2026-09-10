import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Pantalla 4 de specs/02-maqueta-m3.md: añadir página a una auditoría. Sin
// persistencia — al enviar vuelve al detalle de la auditoría.
@Component({
  selector: 'app-pagina-nueva',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './pagina-nueva.html',
})
export class PaginaNueva {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    notas_generales: [''],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/auditorias', this.auditoriaId]);
  }
}
