import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 2 de specs/02-maqueta-m3.md: crear auditoría. Persiste de verdad
// en Dexie desde specs/05-auditorias-paginas.md. También sirve para
// editar (ruta /auditorias/:auditoriaId/editar, añadida en el mismo spec):
// mismo formulario y validaciones, solo cambia si enviar() crea o
// actualiza — evita duplicar plantilla.
@Component({
  selector: 'app-auditoria-nueva',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppInput],
  templateUrl: './auditoria-nueva.html',
})
export class AuditoriaNueva {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly toast = inject(ToastService);

  private readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId');
  protected readonly editando = this.auditoriaId !== null;
  protected readonly titulo = this.editando ? 'Editar auditoría' : 'Nueva auditoría';
  protected readonly textoEnviar = this.editando ? 'Guardar cambios' : 'Crear auditoría';
  protected readonly enlaceCancelar = this.editando
    ? ['/auditorias', this.auditoriaId!]
    : ['/auditorias'];

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    cliente: ['', Validators.required],
    url_base: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    fecha_inicio: ['', Validators.required],
    estandar_objetivo: ['AA' as 'A' | 'AA', Validators.required],
  });

  constructor() {
    if (this.auditoriaId !== null) {
      void this.cargarAuditoria(Number(this.auditoriaId));
    }
  }

  private async cargarAuditoria(id: number): Promise<void> {
    const auditoria = await firstValueFrom(this.auditoriasService.porId$(id));
    if (auditoria) {
      this.formulario.patchValue(auditoria);
    }
  }

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.auditoriaId !== null) {
      const id = Number(this.auditoriaId);
      await this.auditoriasService.actualizar(id, this.formulario.getRawValue());
      this.toast.mostrar('Auditoría actualizada.');
      void this.router.navigate(['/auditorias', id]);
      return;
    }
    const id = await this.auditoriasService.crear({
      ...this.formulario.getRawValue(),
      estado: 'en_progreso',
    });
    void this.router.navigate(['/auditorias', id]);
  }
}
