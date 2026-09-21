import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppSelectorFecha } from '../../../shared/ui/selector-fecha';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 2 de specs/02-maqueta-m3.md: crear auditoría. Persiste de verdad
// en Dexie desde specs/05-auditorias-paginas.md. También sirve para
// editar (ruta /auditorias/:auditoriaId/editar, añadida en el mismo spec):
// mismo formulario y validaciones, solo cambia si enviar() crea o
// actualiza — evita duplicar plantilla.
@Component({
  selector: 'app-auditoria-nueva',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppInput, AppSelectorFecha],
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

  // Refs a los controles en el mismo orden que el formulario, para poder
  // mover el foco al primero inválido al enviar (ver enviar()). La fecha es
  // el selector de fecha (specs/25-selector-fecha.md), que expone enfocar().
  private readonly inputNombre = viewChild<ElementRef<HTMLInputElement>>('inputNombre');
  private readonly inputCliente = viewChild<ElementRef<HTMLInputElement>>('inputCliente');
  private readonly inputUrl = viewChild<ElementRef<HTMLInputElement>>('inputUrl');
  private readonly selectorFecha = viewChild(AppSelectorFecha);
  private readonly inputEstandarObjetivo = viewChild<ElementRef<HTMLInputElement>>('inputEstandarObjetivo');

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
      this.enfocarPrimerCampoInvalido();
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
    // Crear también se anuncia, igual que editar — ver specs/22-informe-ux.md P7.
    this.toast.mostrar('Auditoría creada.');
    void this.router.navigate(['/auditorias', id]);
  }

  // Error de «Fecha de inicio», o null si no hay que mostrarlo (el campo aún
  // no se ha tocado, o es válido). El formato no válido va antes que el campo
  // vacío: si hay texto escrito, «Selecciona una fecha.» no diría qué falla.
  protected errorFecha(): string | null {
    const control = this.formulario.controls.fecha_inicio;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('fechaInvalida')) {
      return 'Introduce una fecha válida con el formato dd/mm/aaaa.';
    }
    return control.hasError('required') ? 'Selecciona una fecha.' : null;
  }

  private enfocarPrimerCampoInvalido(): void {
    const controles = this.formulario.controls;
    const campos = [
      [controles.nombre, () => this.inputNombre()?.nativeElement.focus()],
      [controles.cliente, () => this.inputCliente()?.nativeElement.focus()],
      [controles.url_base, () => this.inputUrl()?.nativeElement.focus()],
      [controles.fecha_inicio, () => this.selectorFecha()?.enfocar()],
      [controles.estandar_objetivo, () => this.inputEstandarObjetivo()?.nativeElement.focus()],
    ] as const;

    for (const [control, enfocar] of campos) {
      if (control.invalid) {
        enfocar();
        return;
      }
    }
  }
}
