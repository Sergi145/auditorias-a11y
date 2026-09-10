import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { MockDataService } from '../../../core/mock-data';
import type { Severidad } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppChip } from '../../../shared/ui/chip';
import { AppInput, AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';

const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Pantalla 9 de specs/02-maqueta-m3.md: detalle/edición de un hallazgo de
// la biblioteca. Formulario prerrellenado sin persistencia — "Guardar
// cambios" vuelve al listado sin escribir nada (ver "Qué NO entra").
@Component({
  selector: 'app-hallazgo-detalle',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppChip, AppFormField, AppInput, AppSelect],
  templateUrl: './hallazgo-detalle.html',
})
export class HallazgoDetalle {
  private readonly mockData = inject(MockDataService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly severidades = SEVERIDADES;
  protected readonly hallazgoId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly hallazgo = this.mockData.hallazgoPlantilla(this.hallazgoId);
  protected readonly criterio = this.hallazgo
    ? this.criteriosWcag.porCodigo(this.hallazgo.criterio_codigo)
    : undefined;
  protected readonly componente =
    this.hallazgo?.componente_id !== undefined
      ? this.mockData.componente(this.hallazgo.componente_id)
      : undefined;

  protected readonly formulario = this.fb.nonNullable.group({
    titulo: [this.hallazgo?.titulo ?? '', Validators.required],
    descripcion: [this.hallazgo?.descripcion ?? '', Validators.required],
    recomendacion_fix: [this.hallazgo?.recomendacion_fix ?? '', Validators.required],
    severidad_tipica: [(this.hallazgo?.severidad_tipica ?? 'media') as Severidad],
  });

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/biblioteca']);
  }
}
