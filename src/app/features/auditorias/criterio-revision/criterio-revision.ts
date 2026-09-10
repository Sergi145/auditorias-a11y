import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { MockDataService } from '../../../core/mock-data';
import type { EstadoResultado, Severidad } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { AppInput, AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';

const ESTADOS: EstadoResultado[] = ['pasa', 'falla', 'no_aplica', 'por_revisar'];
const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Pantalla 7 de specs/02-maqueta-m3.md: revisión manual de un criterio.
// Sin persistencia — "Guardar revisión" vuelve al checklist sin escribir
// nada. Elegir una redacción sugerida de la biblioteca, o marcar "guardar
// en la biblioteca" al añadir un hallazgo nuevo, solo rellena el
// formulario en memoria (interacción de UI, no lógica de negocio real).
@Component({
  selector: 'app-criterio-revision',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AppButton,
    AppCard,
    AppChip,
    AppFormField,
    AppIcon,
    AppInput,
    AppSelect,
  ],
  templateUrl: './criterio-revision.html',
})
export class CriterioRevision {
  private readonly mockData = inject(MockDataService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly estados = ESTADOS;
  protected readonly severidades = SEVERIDADES;
  protected readonly componentes = this.mockData.componentes();

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly codigo = this.route.snapshot.paramMap.get('codigo')!;

  protected readonly criterio = this.criteriosWcag.porCodigo(this.codigo);
  protected readonly criterios = this.criteriosWcag.todos();
  protected readonly resultado = this.mockData.resultado(Number(this.paginaId), this.codigo);
  protected readonly evidencias = this.resultado?.id
    ? this.mockData.evidenciasDeResultado(this.resultado.id)
    : [];

  protected readonly formulario = this.fb.nonNullable.group({
    estado: [(this.resultado?.estado ?? 'por_revisar') as EstadoResultado, Validators.required],
    severidad: [(this.resultado?.severidad ?? null) as Severidad | null],
    componenteId: [(this.resultado?.componente_id ?? null) as number | null],
    notas: [this.resultado?.notas ?? ''],
    guardarEnBiblioteca: [false],
    nuevoTitulo: [''],
    nuevoCriterioCodigo: [this.codigo, Validators.required],
  });

  private readonly estadoActual = toSignal(this.formulario.controls.estado.valueChanges, {
    initialValue: this.formulario.controls.estado.value,
  });
  protected readonly componenteIdActual = toSignal(
    this.formulario.controls.componenteId.valueChanges,
    { initialValue: this.formulario.controls.componenteId.value },
  );

  protected readonly muestraSeveridad = computed(() => this.estadoActual() === 'falla');

  // Sin componente seleccionado no hay nada que sugerir todavía: hace falta
  // saber a qué componente afecta el fallo para filtrar la biblioteca.
  protected readonly muestraSeccionHallazgos = computed(
    () => this.estadoActual() === 'falla' && this.componenteIdActual() !== null,
  );

  protected readonly hallazgosSugeridos = computed(() => {
    const componenteId = this.componenteIdActual();
    if (!this.muestraSeccionHallazgos() || componenteId === null) return [];
    return this.mockData.hallazgosSugeridosPara(this.codigo, componenteId);
  });

  // Con un hallazgo en juego (sugerido o nuevo), "Notas" pasa a ser la
  // descripción de ese hallazgo en lugar de un campo de notas genérico.
  protected readonly etiquetaNotas = computed(() =>
    this.muestraSeccionHallazgos() ? 'Descripción del hallazgo' : 'Notas',
  );

  protected readonly anadiendoNuevo = signal(false);

  protected usarHallazgo(hallazgoId: number): void {
    const hallazgo = this.mockData.hallazgoPlantilla(hallazgoId);
    if (!hallazgo) return;
    this.cancelarHallazgoNuevo();
    this.formulario.controls.notas.setValue(
      `${hallazgo.descripcion}\n\n${hallazgo.recomendacion_fix}`,
    );
    this.formulario.controls.severidad.setValue(hallazgo.severidad_tipica);
  }

  protected cancelarHallazgoNuevo(): void {
    this.anadiendoNuevo.set(false);
    this.formulario.patchValue({
      nuevoTitulo: '',
      nuevoCriterioCodigo: this.codigo,
      guardarEnBiblioteca: false,
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
  }
}
