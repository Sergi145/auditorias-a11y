import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentesService } from '../../../core/componentes';
import type { Componente } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { ConfirmacionService } from '../../../shared/ui/confirmacion';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 10 de specs/02-maqueta-m3.md: catálogo de componentes (Bootstrap
// + propios) usado para clasificar hallazgos. Persistencia y gestión real
// (añadir, renombrar, ocultar/mostrar, borrar) desde
// specs/07-catalogo-componentes.md.
@Component({
  selector: 'app-componentes-listado',
  imports: [ReactiveFormsModule, AppButton, AppCard, AppChip, AppFormField, AppIcon, AppInput],
  templateUrl: './componentes-listado.html',
})
export class ComponentesListado {
  private readonly componentesService = inject(ComponentesService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);

  private readonly todos = toSignal(this.componentesService.todos$(), { initialValue: [] as Componente[] });

  protected readonly bootstrap = computed(() =>
    this.todos().filter((componente) => componente.origen === 'bootstrap'),
  );
  protected readonly personalizados = computed(() =>
    this.todos().filter((componente) => componente.origen === 'personalizado'),
  );

  protected readonly formularioNuevo = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });
  // Foco al input al enviar vacío — mismo patrón que
  // enfocarPrimerCampoInvalido() en auditoria-nueva.ts.
  private readonly inputNuevoComponente = viewChild<ElementRef<HTMLInputElement>>('inputNuevoComponente');

  protected readonly componenteEnEdicion = signal<number | null>(null);
  protected readonly formularioRenombrar = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  protected async anadirComponente(): Promise<void> {
    if (this.formularioNuevo.invalid) {
      this.formularioNuevo.markAllAsTouched();
      this.inputNuevoComponente()?.nativeElement.focus();
      return;
    }
    await this.componentesService.crear(this.formularioNuevo.getRawValue().nombre);
    this.toast.mostrar('Componente añadido.');
    this.formularioNuevo.reset({ nombre: '' });
  }

  protected empezarRenombrar(componente: Componente): void {
    this.componenteEnEdicion.set(componente.id!);
    this.formularioRenombrar.setValue({ nombre: componente.nombre });
  }

  protected cancelarRenombrar(): void {
    this.componenteEnEdicion.set(null);
  }

  protected async guardarRenombrar(id: number): Promise<void> {
    if (this.formularioRenombrar.invalid) {
      this.formularioRenombrar.markAllAsTouched();
      return;
    }
    await this.componentesService.renombrar(id, this.formularioRenombrar.getRawValue().nombre);
    this.toast.mostrar('Componente renombrado.');
    this.componenteEnEdicion.set(null);
  }

  protected async alternarVisible(componente: Componente): Promise<void> {
    await this.componentesService.alternarVisible(componente.id!, !componente.visible);
    this.toast.mostrar(componente.visible ? 'Componente ocultado.' : 'Componente mostrado.');
  }

  protected chipId(componente: Componente): string {
    return `chip-nombre-${componente.id}`;
  }

  protected botonVisibleId(componente: Componente): string {
    return `boton-visible-${componente.id}`;
  }

  protected async eliminar(componente: Componente): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar el componente?',
      mensaje: `«${componente.nombre}» se eliminará. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar componente',
    });
    if (!confirmado) return;

    await this.componentesService.eliminar(componente.id!);
    this.toast.mostrar('Componente eliminado.');
  }
}
