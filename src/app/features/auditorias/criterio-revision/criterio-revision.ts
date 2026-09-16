import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { ComponentesService } from '../../../core/componentes';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { HallazgosService } from '../../../core/hallazgos';
import { HallazgosPlantillaService } from '../../../core/hallazgos-plantilla';
import type { Componente, EstadoResultado, Hallazgo, HallazgoPlantilla, Severidad } from '../../../core/models';
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
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly hallazgosPlantillaService = inject(HallazgosPlantillaService);
  private readonly componentesService = inject(ComponentesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly estados = ESTADOS;
  protected readonly severidades = SEVERIDADES;

  // El desplegable solo ofrece componentes visibles; el nombre ya asignado
  // a un hallazgo existente se resuelve contra todos() para seguir
  // mostrándolo aunque el componente se haya ocultado después — ver
  // specs/07-catalogo-componentes.md.
  protected readonly componentesVisibles = toSignal(this.componentesService.visibles$(), {
    initialValue: [] as Componente[],
  });
  private readonly todosLosComponentes = toSignal(this.componentesService.todos$(), {
    initialValue: [] as Componente[],
  });

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

  // La sección de hallazgos se muestra en cuanto el select pasa a "Falla",
  // sin esperar a que el resultado esté guardado en Dexie: guardarHallazgo()
  // crea el resultado sobre la marcha si todavía no existe, así que ya no
  // hace falta pulsar "Guardar revisión" primero para poder añadir uno.
  protected readonly muestraSeveridad = computed(() => this.estadoFormularioActual() === 'falla');

  private resultadoFormularioInicializado = false;

  protected readonly hallazgoEnEdicion = signal<number | 'nuevo' | null>(null);

  protected readonly formularioHallazgo = this.fb.nonNullable.group({
    severidad: [null as Severidad | null, Validators.required],
    componenteId: [null as number | null],
    notas: ['', Validators.required],
    solucion: [''],
    hallazgoPlantillaId: [null as number | null],
    guardarEnBiblioteca: [false],
    tituloPlantilla: [''],
  });

  private readonly componenteIdHallazgoActual = toSignal(
    this.formularioHallazgo.controls.componenteId.valueChanges,
    { initialValue: this.formularioHallazgo.controls.componenteId.value },
  );

  private readonly hallazgoPlantillaIdActual = toSignal(
    this.formularioHallazgo.controls.hallazgoPlantillaId.valueChanges,
    { initialValue: this.formularioHallazgo.controls.hallazgoPlantillaId.value },
  );

  private readonly guardarEnBibliotecaActual = toSignal(
    this.formularioHallazgo.controls.guardarEnBiblioteca.valueChanges,
    { initialValue: this.formularioHallazgo.controls.guardarEnBiblioteca.value },
  );

  // El checkbox "guardar en biblioteca" solo tiene sentido al redactar un
  // hallazgo nuevo desde cero: ni al editar uno existente ni cuando ya se
  // partió de una plantilla sugerida (hallazgoPlantillaId ya presente) —
  // decisión explícita de specs/08-biblioteca-hallazgos.md para evitar
  // plantillas duplicadas sin querer.
  protected readonly muestraGuardarEnBiblioteca = computed(
    () => this.hallazgoEnEdicion() === 'nuevo' && this.hallazgoPlantillaIdActual() === null,
  );

  // El campo Título siempre está visible junto con el checkbox (ambos
  // gobernados por muestraGuardarEnBiblioteca en la plantilla, aunque el
  // checkbox se muestra en otra posición) — esta señal ya no controla
  // su visibilidad, solo si es obligatorio: únicamente cuando el checkbox
  // está marcado tiene sentido exigirlo, porque solo entonces se usa para
  // crear la plantilla.
  protected readonly muestraTituloPlantilla = computed(
    () => this.muestraGuardarEnBiblioteca() && this.guardarEnBibliotecaActual(),
  );

  // Fuente real desde specs/08-biblioteca-hallazgos.md: mismo comportamiento
  // que antes (sin componente elegido no hay sugerencias), pero la consulta
  // a Dexie es asíncrona, así que se deriva con el mismo patrón
  // toObservable + switchMap + toSignal que ya usa la señal `hallazgos` de
  // este componente para datos dependientes de otra señal.
  protected readonly hallazgosSugeridos = toSignal(
    toObservable(this.componenteIdHallazgoActual).pipe(
      switchMap((componenteId) =>
        componenteId === null ? of([]) : this.hallazgosPlantillaService.sugeridos$(this.codigo, componenteId),
      ),
    ),
    { initialValue: [] as HallazgoPlantilla[] },
  );

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

    // "Título" solo es obligatorio mientras el checkbox "guardar en
    // biblioteca" esté marcado y visible; se limpia la validación en cuanto
    // deja de aplicar (se desmarca, se cancela el hallazgo nuevo o se pasa
    // a usar una plantilla sugerida).
    effect(() => {
      const control = this.formularioHallazgo.controls.tituloPlantilla;
      control.setValidators(this.muestraTituloPlantilla() ? Validators.required : null);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected componenteNombre(hallazgo: Hallazgo): string | undefined {
    return hallazgo.componente_id === undefined
      ? undefined
      : this.todosLosComponentes().find((componente) => componente.id === hallazgo.componente_id)?.nombre;
  }

  protected empezarNuevoHallazgo(): void {
    this.hallazgoEnEdicion.set('nuevo');
    this.formularioHallazgo.reset({
      severidad: null,
      componenteId: null,
      notas: '',
      solucion: '',
      hallazgoPlantillaId: null,
      guardarEnBiblioteca: false,
      tituloPlantilla: '',
    });
  }

  protected empezarEditarHallazgo(hallazgo: Hallazgo): void {
    this.hallazgoEnEdicion.set(hallazgo.id!);
    this.formularioHallazgo.setValue({
      severidad: hallazgo.severidad,
      componenteId: hallazgo.componente_id ?? null,
      notas: hallazgo.notas,
      solucion: hallazgo.solucion ?? '',
      hallazgoPlantillaId: hallazgo.hallazgo_plantilla_id ?? null,
      guardarEnBiblioteca: false,
      tituloPlantilla: '',
    });
  }

  protected cancelarHallazgo(): void {
    this.hallazgoEnEdicion.set(null);
  }

  protected usarPlantilla(plantilla: HallazgoPlantilla): void {
    this.formularioHallazgo.patchValue({
      severidad: plantilla.severidad_tipica,
      notas: plantilla.descripcion,
      solucion: plantilla.recomendacion_fix,
      hallazgoPlantillaId: plantilla.id ?? null,
      guardarEnBiblioteca: false,
      tituloPlantilla: '',
    });
  }

  protected async guardarHallazgo(): Promise<void> {
    if (this.formularioHallazgo.invalid) {
      this.formularioHallazgo.markAllAsTouched();
      return;
    }
    // El resultado puede no existir todavía en Dexie (p. ej. se acaba de
    // seleccionar "Falla" sin pulsar "Guardar revisión"): se crea aquí sobre
    // la marcha en vez de bloquear el guardado del hallazgo. `guardar()` es
    // un upsert por pagina/criterio, así que es seguro llamarlo aunque
    // guardarResultado() ya lo haya hecho justo antes.
    const resultadoId =
      this.resultadoId() ??
      (await this.resultadosService.guardar(
        Number(this.paginaId),
        this.codigo,
        this.formularioResultado.getRawValue(),
      ));

    const valores = this.formularioHallazgo.getRawValue();
    const enEdicion = this.hallazgoEnEdicion();
    const esNuevo = enEdicion === 'nuevo';

    // Al crear un hallazgo nuevo con el checkbox marcado, la plantilla se
    // guarda primero para poder enlazar su id como hallazgo_plantilla_id del
    // hallazgo recién creado — ver specs/08-biblioteca-hallazgos.md.
    let hallazgoPlantillaId = valores.hallazgoPlantillaId ?? undefined;
    if (esNuevo && valores.guardarEnBiblioteca) {
      hallazgoPlantillaId = await this.hallazgosPlantillaService.crear({
        criterio_codigo: this.codigo,
        componente_id: valores.componenteId ?? undefined,
        titulo: valores.tituloPlantilla,
        descripcion: valores.notas,
        recomendacion_fix: valores.solucion,
        severidad_tipica: valores.severidad!,
        etiquetas: [],
      });
    }

    const datos = {
      severidad: valores.severidad!,
      componente_id: valores.componenteId ?? undefined,
      notas: valores.notas,
      solucion: valores.solucion || undefined,
      hallazgo_plantilla_id: hallazgoPlantillaId,
    };

    if (esNuevo) {
      await this.hallazgosService.crear({ resultado_id: resultadoId, ...datos });
      this.toast.mostrar('Hallazgo añadido.');

      // Se cuenta como un uso solo cuando el hallazgo reutiliza una
      // plantilla ya existente (sugerencia usada), no cuando la plantilla
      // se acaba de crear a partir de este mismo hallazgo.
      if (!valores.guardarEnBiblioteca && hallazgoPlantillaId !== undefined) {
        await this.hallazgosPlantillaService.incrementarUso(hallazgoPlantillaId);
      }
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

    // El hallazgo nuevo no tiene botón propio de guardado: "Guardar
    // revisión" es también el único disparador para persistirlo. Si está
    // incompleto, guardarHallazgo() marca los campos como touched y no
    // guarda nada, pero tampoco bloquea el guardado de la revisión.
    if (this.hallazgoEnEdicion() === 'nuevo') {
      await this.guardarHallazgo();
    }

    // "Falla" se queda en la pantalla para poder añadir hallazgos justo
    // después de guardar; el resto de estados vuelve al checklist, igual
    // que antes de esta rebanada.
    if (valores.estado !== 'falla') {
      void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
    }
  }
}
