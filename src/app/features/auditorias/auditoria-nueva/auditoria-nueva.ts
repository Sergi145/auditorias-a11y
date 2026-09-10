import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';

// Pantalla 2 de specs/02-maqueta-m3.md: crear auditoría. Sin persistencia —
// al enviar navega a una auditoría de ejemplo para mostrar el siguiente
// paso del flujo, sin guardar los datos introducidos (ver "Qué NO entra").
@Component({
  selector: 'app-auditoria-nueva',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppInput],
  templateUrl: './auditoria-nueva.html',
})
export class AuditoriaNueva {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    cliente: ['', Validators.required],
    url_base: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    fecha_inicio: ['', Validators.required],
    estandar_objetivo: ['AA' as 'A' | 'AA', Validators.required],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/auditorias', 1]);
  }
}
