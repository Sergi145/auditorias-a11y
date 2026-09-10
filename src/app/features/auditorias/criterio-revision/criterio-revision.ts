import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { HallazgosService } from '../../../core/hallazgos';
import { MockDataService } from '../../../core/mock-data';
import type { EstadoResultado, Hallazgo, HallazgoPlantilla, Severidad } from '../../../core/models';
import { ResultadosService } from '../../../core/resultados';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { AppInput, AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

const ESTADOS: EstadoResultado[] = ['pasa', 'falla', 'no_aplica', 'por_revisar'];
const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Pantalla 7 de specs/02-maqueta-m3.md: revisión manual de un criterio.
// Persistencia real desde specs/06-checklist-manual.md: el formulario
// superior (estado + nota general) persiste con ResultadosService al
// enviarlo; la sección de hallazgos (solo si el resultado ya existe con
// estado "Falla") gestiona Hallazgo reales con HallazgosService, con
// crear/editar/eliminar persistiendo de inmediato, sin esperar al envío
// del formulario superior. `?hallazgo=ID` en la URL abre ese hallazgo ya
// en modo edición al cargar (enlace "Editar" desde pagina-checklist).
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
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly estados = ESTADOS;
  protected readonly severidades = SEVERIDADES;
  protected readonly componentes = this.mockData.componentes();

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly codigo = this.route.snapshot.paramMap.get('codigo')!;
  private readonly hallazgoIdDesdeQuery = this.route.snapshot.queryParamMap.get('hallazgo')
    ? Number(this.route.snapshot.queryParamMap.get('hallazgo'))
    : undefined;

  protected readonly criterio = this.criteriosWcag.porCodigo(this.codigo);

  protected readonly resultado = toSignal(
    this.resultadosService.porPaginaYCriterio$(Number(this.paginaId), this.codigo),
    { initialValue: undefined },
  );
  protected readonly resultadoId = computed(() => this.resultado()?.id);

  protected readonly hallazgos = toSignal(
    toObservable(this.resultadoId).pipe(
      switchMap((id) => (id === undefined ? of([]) : this.hallazgosService.deResultado$(id))),
    ),
    { initialValue: [] as Hallazgo[] },
  );

  protected readonly formularioResultado = this.fb.nonNullable.group({
    estado: ['por_revisar' as EstadoResultado, Validators.required],
    notas: [''],
  });

  private readonly estadoFormularioActual = toSignal(this.formularioResultado.controls.estado.valueChanges, {
    initialValue: this.formularioResultado.controls.estado.value,
  });

  protected readonly muestraSeveridad = computed(() => this.estadoFormularioActual() === 'falla');

  // La sección de hallazgos solo se habilita cuando el resultado ya está
  // guardado en Dexie con estado "Falla" — evita gestionar hallazgos
  // huérfanos de un resultado que todavía no existe. Ver "Decisiones
  // tomadas y descartadas" de specs/06-checklist-manual.md.
  protected readonly muestraSeccionHallazgos = computed(() => this.resultado()?.estado === 'falla');

  protected readonly avisoGuardarParaHallazgos = computed(
    () => this.muestraSeveridad() && !this.muestraSeccionHallazgos(),
  );

  private resultadoFormularioInicializado = false;

  protected readonly hallazgoEnEdicion = signal<number | 'nuevo' | null>(null);

  protected readonly formularioHallazgo = this.fb.nonNullable.group({
    severidad: [null as Severidad | null, Validators.required],
    componenteId: [null as number | null],
    notas: ['', Validators.required],
    hallazgoPlantillaId: [null as number | null],
  });

  private readonly componenteIdHallazgoActual = toSignal(
    this.formularioHallazgo.controls.componenteId.valueChanges,
    { initialValue: this.formularioHallazgo.controls.componenteId.value },
  );

  protected readonly hallazgosSugeridos = computed(() => {
    const componenteId = this.componenteIdHallazgoActual();
    if (componenteId === null) return [];
    return this.mockData.hallazgosSugeridosPara(this.codigo, componenteId);
  });

  private hallazgoDesdeQueryAbierto = false;

  constructor() {
    // Rellena el formulario superior en cuanto llega el primer valor real
    // del resultado (liveQuery es asíncrono): solo la primera vez, para no
    // pisar lo que el usuario esté escribiendo si el resultado se
    // actualiza después (ej. tras guardar).
    effect(() => {
      const resultado = this.resultado();
      if (resultado && !this.resultadoFormularioInicializado) {
        this.formularioResultado.patchValue({ estado: resultado.estado, notas: resultado.notas });
        this.resultadoFormularioInicializado = true;
      }
    });

    // Si se llega desde el enlace "Editar" de un hallazgo concreto en
    // pagina-checklist (?hallazgo=ID), lo abre en modo edición en cuanto
    // aparece en la lista reactiva.
    effect(() => {
      if (this.hallazgoDesdeQueryAbierto || this.hallazgoIdDesdeQuery === undefined) return;
      const hallazgo = this.hallazgos().find((h) => h.id === this.hallazgoIdDesdeQuery);
      if (hallazgo) {
        this.empezarEditarHallazgo(hallazgo);
        this.hallazgoDesdeQueryAbierto = true;
      }
    });
  }

  protected componenteNombre(hallazgo: Hallazgo): string | undefined {
    return hallazgo.componente_id === undefined
      ? undefined
      : this.mockData.componente(hallazgo.componente_id)?.nombre;
  }

  protected empezarNuevoHallazgo(): void {
    this.hallazgoEnEdicion.set('nuevo');
    this.formularioHallazgo.reset({
      severidad: null,
      componenteId: null,
      notas: '',
      hallazgoPlantillaId: null,
    });
  }

  protected empezarEditarHallazgo(hallazgo: Hallazgo): void {
    this.hallazgoEnEdicion.set(hallazgo.id!);
    this.formularioHallazgo.setValue({
      severidad: hallazgo.severidad,
      componenteId: hallazgo.componente_id ?? null,
      notas: hallazgo.notas,
      hallazgoPlantillaId: hallazgo.hallazgo_plantilla_id ?? null,
    });
  }

  protected cancelarHallazgo(): void {
    this.hallazgoEnEdicion.set(null);
  }

  protected usarPlantilla(plantilla: HallazgoPlantilla): void {
    this.formularioHallazgo.patchValue({
      severidad: plantilla.severidad_tipica,
      notas: `${plantilla.descripcion}\n\n${plantilla.recomendacion_fix}`,
      hallazgoPlantillaId: plantilla.id ?? null,
    });
  }

  protected async guardarHallazgo(): Promise<void> {
    if (this.formularioHallazgo.invalid) {
      this.formularioHallazgo.markAllAsTouched();
      return;
    }
    const resultadoId = this.resultadoId();
    if (resultadoId === undefined) return;

    const valores = this.formularioHallazgo.getRawValue();
    const datos = {
      severidad: valores.severidad!,
      componente_id: valores.componenteId ?? undefined,
      notas: valores.notas,
      hallazgo_plantilla_id: valores.hallazgoPlantillaId ?? undefined,
    };

    const enEdicion = this.hallazgoEnEdicion();
    if (enEdicion === 'nuevo') {
      await this.hallazgosService.crear({ resultado_id: resultadoId, ...datos });
      this.toast.mostrar('Hallazgo añadido.');
    } else if (enEdicion !== null) {
      await this.hallazgosService.actualizar(enEdicion, datos);
      this.toast.mostrar('Hallazgo actualizado.');
    }
    this.hallazgoEnEdicion.set(null);
  }

  protected async eliminarHallazgo(hallazgo: Hallazgo): Promise<void> {
    const confirmado = window.confirm('¿Eliminar este hallazgo? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    await this.hallazgosService.eliminar(hallazgo.id!);
    this.toast.mostrar('Hallazgo eliminado.');
    if (this.hallazgoEnEdicion() === hallazgo.id) {
      this.hallazgoEnEdicion.set(null);
    }
  }

  protected async guardarResultado(): Promise<void> {
    if (this.formularioResultado.invalid) {
      this.formularioResultado.markAllAsTouched();
      return;
    }

    const valores = this.formularioResultado.getRawValue();
    await this.resultadosService.guardar(Number(this.paginaId), this.codigo, valores);
    this.toast.mostrar('Revisión guardada.');

    // "Falla" se queda en la pantalla para poder añadir hallazgos justo
    // después de guardar; el resto de estados vuelve al checklist, igual
    // que antes de esta rebanada.
    if (valores.estado !== 'falla') {
      void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
    }
  }
}
