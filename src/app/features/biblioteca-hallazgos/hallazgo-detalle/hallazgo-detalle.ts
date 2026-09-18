import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ComponentesService } from '../../../core/componentes';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { HallazgosPlantillaService } from '../../../core/hallazgos-plantilla';
import type { Componente, HallazgoPlantilla, Severidad } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppChip } from '../../../shared/ui/chip';
import { AppInput, AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { ToastService } from '../../../shared/ui/toast';

const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Etiquetas legibles, como en el resto de pantallas (antes se mostraba el
// valor interno «critica») — ver specs/22-informe-ux.md P6.
const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

// Pantalla 9 de specs/02-maqueta-m3.md: detalle/edición de un hallazgo de
// la biblioteca. Persistencia real desde specs/08-biblioteca-hallazgos.md:
// "Guardar cambios" actualiza la plantilla de verdad.
@Component({
  selector: 'app-hallazgo-detalle',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppChip, AppFormField, AppInput, AppSelect],
  templateUrl: './hallazgo-detalle.html',
})
export class HallazgoDetalle {
  private readonly hallazgosPlantillaService = inject(HallazgosPlantillaService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly componentesService = inject(ComponentesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly severidades = SEVERIDADES;
  protected readonly etiquetaSeveridad = ETIQUETA_SEVERIDAD;
  protected readonly hallazgoId = Number(this.route.snapshot.paramMap.get('id'));

  // Sin un porId$() dedicado en HallazgosPlantillaService (no lo pide
  // specs/08-biblioteca-hallazgos.md): se resuelve por id sobre el listado
  // completo, mismo patrón que componenteNombre() en criterio-revision.ts.
  protected readonly hallazgo = signal<HallazgoPlantilla | undefined>(undefined);
  protected readonly criterio = computed(() => {
    const hallazgo = this.hallazgo();
    return hallazgo ? this.criteriosWcag.porCodigo(hallazgo.criterio_codigo) : undefined;
  });

  private readonly componentes = toSignal(this.componentesService.todos$(), {
    initialValue: [] as Componente[],
  });
  protected readonly componente = computed(() => {
    const componenteId = this.hallazgo()?.componente_id;
    return componenteId === undefined
      ? undefined
      : this.componentes().find((componente) => componente.id === componenteId);
  });

  protected readonly formulario = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    recomendacion_fix: ['', Validators.required],
    severidad_tipica: ['media' as Severidad],
  });

  constructor() {
    void this.cargarHallazgo();
  }

  private async cargarHallazgo(): Promise<void> {
    const todos = await firstValueFrom(this.hallazgosPlantillaService.todos$());
    const hallazgo = todos.find((plantilla) => plantilla.id === this.hallazgoId);
    this.hallazgo.set(hallazgo);
    if (hallazgo) {
      this.formulario.setValue({
        titulo: hallazgo.titulo,
        descripcion: hallazgo.descripcion,
        recomendacion_fix: hallazgo.recomendacion_fix,
        severidad_tipica: hallazgo.severidad_tipica,
      });
    }
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    await this.hallazgosPlantillaService.actualizar(this.hallazgoId, this.formulario.getRawValue());
    this.toast.mostrar('Hallazgo de la biblioteca actualizado.');
    void this.router.navigate(['/biblioteca']);
  }
}
