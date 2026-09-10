import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaginasService } from '../../../core/paginas';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 4 de specs/02-maqueta-m3.md: añadir página a una auditoría.
// Persiste de verdad en Dexie desde specs/05-auditorias-paginas.md. También
// sirve para editar (ruta .../paginas/:paginaId/editar, añadida en el mismo
// spec): mismo formulario y validaciones, solo cambia si enviar() crea o
// actualiza — evita duplicar plantilla (mismo patrón que AuditoriaNueva).
@Component({
  selector: 'app-pagina-nueva',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppInput],
  templateUrl: './pagina-nueva.html',
})
export class PaginaNueva {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly paginasService = inject(PaginasService);
  private readonly toast = inject(ToastService);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  private readonly paginaId = this.route.snapshot.paramMap.get('paginaId');
  protected readonly editando = this.paginaId !== null;
  protected readonly titulo = this.editando ? 'Editar página' : 'Añadir página';
  protected readonly textoEnviar = this.editando ? 'Guardar cambios' : 'Añadir página';
  protected readonly enlaceCancelar = this.editando
    ? ['/auditorias', this.auditoriaId, 'paginas', this.paginaId!]
    : ['/auditorias', this.auditoriaId];

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    notas_generales: [''],
  });

  constructor() {
    if (this.paginaId !== null) {
      void this.cargarPagina(Number(this.paginaId));
    }
  }

  private async cargarPagina(id: number): Promise<void> {
    const pagina = await firstValueFrom(this.paginasService.porId$(id));
    if (pagina) {
      this.formulario.patchValue(pagina);
    }
  }

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.paginaId !== null) {
      const id = Number(this.paginaId);
      await this.paginasService.actualizar(id, this.formulario.getRawValue());
      this.toast.mostrar('Página actualizada.');
      void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', id]);
      return;
    }
    await this.paginasService.crear({
      auditoria_id: this.auditoriaId,
      ...this.formulario.getRawValue(),
    });
    void this.router.navigate(['/auditorias', this.auditoriaId]);
  }
}
