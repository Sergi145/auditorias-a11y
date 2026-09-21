import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { ComponentesService } from '../../../core/componentes';
import { idiomaNombreComponente } from '../../../core/componentes-catalogo';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { EvidenciasService } from '../../../core/evidencias';
import { HallazgosService } from '../../../core/hallazgos';
import { HallazgosPlantillaService } from '../../../core/hallazgos-plantilla';
import type {
  Componente,
  EstadoResultado,
  Evidencia,
  Hallazgo,
  HallazgoPlantilla,
  Severidad,
} from '../../../core/models';
import { ResultadosService } from '../../../core/resultados';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { ConfirmacionService } from '../../../shared/ui/confirmacion';
import { AppInput, AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';
import { EvidenciasMiniaturas } from '../evidencias-miniaturas';
import type { ConSalidaProtegida } from './confirmar-salida';
import {
  crearControlEvidencia,
  EvidenciasEditor,
  type FormularioEvidencia,
} from './evidencias-editor';

const ESTADOS: EstadoResultado[] = ['pasa', 'falla', 'no_aplica', 'por_revisar'];
const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Mismas etiquetas que el checklist, el progreso y la exportación: los
// desplegables mostraban el valor interno (no_aplica, critica…) — ver
// specs/22-informe-ux.md P6.
const ETIQUETA_ESTADO: Record<EstadoResultado, string> = {
  pasa: 'Pasa',
  falla: 'Falla',
  no_aplica: 'No aplica',
  por_revisar: 'Por revisar',
};

const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

// Mensajes de error de los campos del hallazgo que se validan — ver
// specs/22-informe-ux.md P3.
const ERRORES_HALLAZGO = {
  severidad: 'Selecciona una severidad.',
  notas: 'Describe el hallazgo.',
  tituloPlantilla: 'Escribe un título para guardarlo en la biblioteca.',
} as const;
type CampoHallazgoValidado = keyof typeof ERRORES_HALLAZGO;

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
    EvidenciasEditor,
    EvidenciasMiniaturas,
  ],
  templateUrl: './criterio-revision.html',
  host: { '(window:beforeunload)': 'avisarAntesDeCerrar($event)' },
})
export class CriterioRevision implements ConSalidaProtegida {
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly hallazgosPlantillaService = inject(HallazgosPlantillaService);
  private readonly componentesService = inject(ComponentesService);
  private readonly evidenciasService = inject(EvidenciasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly estados = ESTADOS;
  protected readonly severidades = SEVERIDADES;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly etiquetaSeveridad = ETIQUETA_SEVERIDAD;

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
  // Vuelta desde /biblioteca en modo "elegir redacción" — ver
  // specs/21-elegir-desde-biblioteca.md: ?plantilla=ID rellena el formulario
  // de hallazgo (el de ?hallazgo=ID si se estaba editando uno, o uno nuevo
  // con ?componente=ID si no) igual que "Usar esta redacción".
  private readonly plantillaIdDesdeQuery = this.numeroDesdeQuery('plantilla');
  private readonly componenteIdDesdeQuery = this.numeroDesdeQuery('componente');
  // undefined = cargando; null = ya no existe en la biblioteca.
  private readonly plantillaDesdeQuery = signal<HallazgoPlantilla | null | undefined>(undefined);
  private plantillaDesdeQueryAplicada = false;

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

  // Todas las evidencias de todos los hallazgos de este resultado, para la
  // tarjeta de lectura de cada hallazgo y para precargar el editor al abrir
  // uno en modo edición — ver specs/16-evidencia-imagen-hallazgo.md. Mismo
  // patrón toObservable + switchMap + toSignal que `hallazgos` (arriba) y
  // `hallazgosSugeridos` (abajo), para datos derivados de otra señal.
  private readonly hallazgoIds = computed(() => this.hallazgos().map((hallazgo) => hallazgo.id!));

  private readonly evidenciasDelResultado = toSignal(
    toObservable(this.hallazgoIds).pipe(
      switchMap((ids) => (ids.length === 0 ? of([]) : this.evidenciasService.deHallazgos$(ids))),
    ),
    { initialValue: [] as Evidencia[] },
  );

  protected readonly formularioResultado = this.fb.nonNullable.group({
    estado: ['por_revisar' as EstadoResultado, Validators.required],
  });

  private readonly estadoFormularioActual = toSignal(
    this.formularioResultado.controls.estado.valueChanges,
    {
      initialValue: this.formularioResultado.controls.estado.value,
    },
  );

  // La sección de hallazgos se muestra en cuanto el select pasa a "Falla",
  // sin esperar a que el resultado esté guardado en Dexie: guardarHallazgo()
  // crea el resultado sobre la marcha si todavía no existe, así que ya no
  // hace falta pulsar "Guardar revisión" primero para poder añadir uno.
  protected readonly muestraSeveridad = computed(() => this.estadoFormularioActual() === 'falla');

  private resultadoFormularioInicializado = false;

  // Elegir "Falla" abre la sección de hallazgos debajo del select, pero el
  // foco se queda en él y un lector de pantalla no se entera de que ha
  // aparecido. Va en (change) y no en valueChanges para no anunciarlo cuando
  // el estado se rellena por código (al cargar o al volver de la biblioteca).
  protected anunciarSeccionHallazgos(): void {
    if (this.formularioResultado.controls.estado.value !== 'falla') return;
    void this.liveAnnouncer.announce(
      'Se ha abierto la sección Hallazgos, debajo del estado, para añadir hallazgos a este fallo.',
      'polite',
    );
  }

  protected readonly hallazgoEnEdicion = signal<number | 'nuevo' | null>(null);

  protected readonly formularioHallazgo = this.fb.nonNullable.group({
    severidad: [null as Severidad | null, Validators.required],
    componenteId: [null as number | null],
    notas: ['', Validators.required],
    solucion: [''],
    hallazgoPlantillaId: [null as number | null],
    guardarEnBiblioteca: [false],
    tituloPlantilla: [''],
    // Imágenes de evidencia pendientes de guardar junto con el hallazgo —
    // ver specs/16-evidencia-imagen-hallazgo.md. markAllAsTouched() en
    // guardarHallazgo() ya recorre este FormArray (Angular lo hace de forma
    // recursiva), así que una imagen sin descripción bloquea el guardado
    // igual que cualquier otro campo obligatorio.
    evidencias: this.fb.array<FormularioEvidencia>([]),
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
        componenteId === null
          ? of([])
          : this.hallazgosPlantillaService.sugeridos$(this.codigo, componenteId),
      ),
    ),
    { initialValue: [] as HallazgoPlantilla[] },
  );

  // En cuanto se pulsa "Usar esta redacción" (o el hallazgo ya parte de una
  // plantilla) las sugerencias se ocultan: su descripción ya está copiada en
  // "Descripción del hallazgo" y repetirla debajo solo duplica texto. Para
  // cambiar de redacción queda "Ver en la biblioteca".
  protected readonly sugerenciasVisibles = computed(() =>
    this.hallazgoPlantillaIdActual() === null ? this.hallazgosSugeridos() : [],
  );

  // Las sugerencias aparecen bajo "Componente afectado" con el foco aún en
  // el select, así que se anuncia cuántas hay. Se marca en (change) y se
  // anuncia cuando llega la consulta a Dexie (asíncrona) — ver el effect del
  // constructor; no se anuncia al rellenar el componente por código.
  private anunciarSugerenciasPendiente = false;

  protected marcarAnuncioSugerencias(): void {
    this.anunciarSugerenciasPendiente = true;
  }

  private anunciarSugerencias(total: number): void {
    const mensaje =
      total === 0
        ? 'No hay hallazgos sugeridos de la biblioteca para este componente.'
        : total === 1
          ? 'Se ha encontrado 1 hallazgo sugerido de la biblioteca, debajo del componente. Pulsa Tab para llegar a él.'
          : `Se han encontrado ${total} hallazgos sugeridos de la biblioteca, debajo del componente. Pulsa Tab para recorrerlos.`;
    void this.liveAnnouncer.announce(mensaje, 'polite');
  }

  // Mismo nombre accesible que en /biblioteca: título y descripción de la
  // sugerencia en el propio botón, para saber qué error es antes de usarla.
  protected nombreUsarRedaccion(plantilla: HallazgoPlantilla): string {
    return `Usar esta redacción: ${plantilla.titulo}. ${plantilla.descripcion}`;
  }

  private hallazgoDesdeQueryAbierto = false;

  // Estado del formulario de hallazgo al abrirlo, para saber si hay cambios
  // sin guardar — ver tieneCambiosSinGuardar().
  private instantaneaHallazgo = '';

  // Id del hallazgo recién eliminado, a la espera de que desaparezca de
  // `hallazgos()` para recolocar el foco — ver eliminarHallazgo().
  private readonly hallazgoEliminado = signal<number | null>(null);

  constructor() {
    effect(() => {
      const sugerencias = this.sugerenciasVisibles();
      if (!this.anunciarSugerenciasPendiente) return;
      this.anunciarSugerenciasPendiente = false;
      if (untracked(this.componenteIdHallazgoActual) === null) return;
      this.anunciarSugerencias(sugerencias.length);
    });

    effect(() => {
      const id = this.hallazgoEliminado();
      if (id === null || this.hallazgos().some((hallazgo) => hallazgo.id === id)) return;
      this.hallazgoEliminado.set(null);
      this.enfocar('#anadir-hallazgo, [formcontrolname="severidad"]');
    });

    // Rellena el formulario superior en cuanto llega el primer valor real
    // del resultado (liveQuery es asíncrono): solo la primera vez, para no
    // pisar lo que el usuario esté escribiendo si el resultado se
    // actualiza después (ej. tras guardar).
    effect(() => {
      const resultado = this.resultado();
      if (resultado && !this.resultadoFormularioInicializado) {
        // Al volver de elegir una redacción en la biblioteca el hallazgo
        // solo tiene sentido con "Falla", aunque todavía no se hubiera
        // guardado ese estado antes de salir.
        this.formularioResultado.patchValue({
          estado: this.plantillaIdDesdeQuery === undefined ? resultado.estado : 'falla',
        });
        this.resultadoFormularioInicializado = true;
      }
    });

    // Si se llega desde el enlace "Editar" de un hallazgo concreto en
    // pagina-checklist (?hallazgo=ID), lo abre en modo edición en cuanto
    // aparece en la lista reactiva. Con ?plantilla=ID lo abre el effect de
    // abajo, que además tiene que aplicar la plantilla después de abrirlo.
    effect(() => {
      if (this.plantillaIdDesdeQuery !== undefined) return;
      if (this.hallazgoDesdeQueryAbierto || this.hallazgoIdDesdeQuery === undefined) return;
      const hallazgo = this.hallazgos().find((h) => h.id === this.hallazgoIdDesdeQuery);
      if (hallazgo) {
        this.empezarEditarHallazgo(hallazgo);
        this.hallazgoDesdeQueryAbierto = true;
      }
    });

    if (this.plantillaIdDesdeQuery !== undefined) {
      this.formularioResultado.patchValue({ estado: 'falla' });
      void this.hallazgosPlantillaService
        .porId(this.plantillaIdDesdeQuery)
        .then((plantilla) => this.plantillaDesdeQuery.set(plantilla ?? null));
    }

    // Aplica la redacción elegida en /biblioteca en cuanto está cargada (y,
    // si se volvía a un hallazgo existente, en cuanto aparece en la lista
    // reactiva). Si la plantilla se eliminó entretanto, abre el formulario
    // igualmente, sin rellenarlo.
    effect(() => {
      if (this.plantillaDesdeQueryAplicada || this.plantillaIdDesdeQuery === undefined) return;
      const plantilla = this.plantillaDesdeQuery();
      if (plantilla === undefined) return;

      if (this.hallazgoIdDesdeQuery !== undefined) {
        const hallazgo = this.hallazgos().find((h) => h.id === this.hallazgoIdDesdeQuery);
        if (!hallazgo) return;
        untracked(() => this.empezarEditarHallazgo(hallazgo));
      } else {
        untracked(() => this.empezarNuevoHallazgo());
        this.formularioHallazgo.patchValue({ componenteId: this.componenteIdDesdeQuery ?? null });
      }
      this.plantillaDesdeQueryAplicada = true;

      if (plantilla) {
        this.usarPlantilla(plantilla);
        this.toast.mostrar(`Redacción «${plantilla.titulo}» aplicada al hallazgo.`);
      } else {
        this.toast.mostrar('La redacción elegida ya no está en la biblioteca.');
      }
      // Se quita ?plantilla de la URL para que recargar no la vuelva a aplicar
      // encima de lo que se haya editado después.
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { plantilla: null, componente: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
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

  private numeroDesdeQuery(nombre: string): number | undefined {
    const valor = this.route.snapshot.queryParamMap.get(nombre);
    return valor ? Number(valor) : undefined;
  }

  // "Ver en la biblioteca" abre /biblioteca en modo "elegir redacción" con lo
  // necesario para volver aquí — ver specs/21-elegir-desde-biblioteca.md.
  protected queryBiblioteca(): Record<string, string | number> {
    const queryParams: Record<string, string | number> = {
      auditoria: this.auditoriaId,
      pagina: this.paginaId,
      criterio: this.codigo,
    };
    const enEdicion = this.hallazgoEnEdicion();
    if (typeof enEdicion === 'number') queryParams['hallazgo'] = enEdicion;
    const componenteId = this.componenteIdHallazgoActual();
    if (componenteId !== null) queryParams['componente'] = componenteId;
    return queryParams;
  }

  protected readonly idiomaNombre = idiomaNombreComponente;

  protected componenteDe(hallazgo: Hallazgo): Componente | undefined {
    return hallazgo.componente_id === undefined
      ? undefined
      : this.todosLosComponentes().find((componente) => componente.id === hallazgo.componente_id);
  }

  protected evidenciasDeHallazgo(hallazgoId: number): Evidencia[] {
    return this.evidenciasDelResultado().filter(
      (evidencia) => evidencia.hallazgo_id === hallazgoId,
    );
  }

  protected empezarNuevoHallazgo(): void {
    this.hallazgoEnEdicion.set('nuevo');
    // .clear() no lo hace reset(): un hallazgo nuevo siempre empieza sin
    // imágenes, aunque el formulario anterior tuviera alguna pendiente.
    this.formularioHallazgo.controls.evidencias.clear();
    this.formularioHallazgo.reset({
      severidad: null,
      componenteId: null,
      notas: '',
      solucion: '',
      hallazgoPlantillaId: null,
      guardarEnBiblioteca: false,
      tituloPlantilla: '',
    });
    this.instantaneaHallazgo = this.resumenHallazgo();
    // El botón "Añadir hallazgo" desaparece al abrir el formulario: el foco
    // pasa a su primer campo en vez de perderse en <body> — ver
    // specs/22-informe-ux.md P2.
    this.enfocar('[formcontrolname="severidad"]');
  }

  protected empezarEditarHallazgo(hallazgo: Hallazgo): void {
    this.hallazgoEnEdicion.set(hallazgo.id!);
    // patchValue() en vez de setValue(): con evidencias como FormArray no
    // tiene sentido "asignar" su valor con setValue() (longitud fija) —
    // se repuebla aparte con clear() + push() con los controles reales.
    this.formularioHallazgo.patchValue({
      severidad: hallazgo.severidad,
      componenteId: hallazgo.componente_id ?? null,
      notas: hallazgo.notas,
      solucion: hallazgo.solucion ?? '',
      hallazgoPlantillaId: hallazgo.hallazgo_plantilla_id ?? null,
      guardarEnBiblioteca: false,
      tituloPlantilla: '',
    });

    const evidenciasArray = this.formularioHallazgo.controls.evidencias;
    evidenciasArray.clear();
    for (const evidencia of this.evidenciasDeHallazgo(hallazgo.id!)) {
      evidenciasArray.push(
        crearControlEvidencia({
          id: evidencia.id!,
          archivo: evidencia.archivo ?? new Blob(),
          descripcion: evidencia.descripcion ?? '',
        }),
      );
    }
    this.instantaneaHallazgo = this.resumenHallazgo();
    // La tarjeta (con el botón "Editar" pulsado) se sustituye por el formulario.
    this.enfocar('[formcontrolname="severidad"]');
  }

  // Antes de salir de la pantalla con un hallazgo a medio redactar se
  // pregunta con el modal propio — ver confirmarSalidaSinGuardar y
  // specs/22-informe-ux.md P8. "Ver en la biblioteca" no pregunta porque ya
  // avisa por texto junto al enlace (specs/21-elegir-desde-biblioteca.md).
  puedeSalir(destino: string): boolean | Promise<boolean> {
    if (!this.tieneCambiosSinGuardar() || destino.startsWith('/biblioteca?')) return true;
    return this.confirmacion.confirmar({
      titulo: '¿Salir sin guardar el hallazgo?',
      mensaje: 'Los cambios del hallazgo que estás redactando se perderán.',
      textoConfirmar: 'Salir sin guardar',
    });
  }

  // Hay un hallazgo abierto que ha cambiado desde que se abrió. Se compara
  // con una instantánea y no con `dirty` porque añadir o quitar imágenes de
  // evidencia no marca el formulario como modificado.
  private tieneCambiosSinGuardar(): boolean {
    return this.hallazgoEnEdicion() !== null && this.resumenHallazgo() !== this.instantaneaHallazgo;
  }

  // Cerrar o recargar la pestaña con un hallazgo a medio redactar: el
  // navegador muestra su propio aviso (no se puede personalizar el texto).
  protected avisarAntesDeCerrar(evento: BeforeUnloadEvent): void {
    if (this.tieneCambiosSinGuardar()) evento.preventDefault();
  }

  private resumenHallazgo(): string {
    const { evidencias, ...campos } = this.formularioHallazgo.getRawValue();
    return JSON.stringify({
      ...campos,
      evidencias: evidencias.map(({ id, descripcion }) => ({ id, descripcion })),
    });
  }

  // Cierra el formulario abierto sin guardar y devuelve el foco a lo que lo
  // abrió: el "Editar" de esa tarjeta, o "Añadir hallazgo".
  protected cancelarHallazgo(): void {
    const enEdicion = this.hallazgoEnEdicion();
    this.hallazgoEnEdicion.set(null);
    this.enfocar(
      typeof enEdicion === 'number' ? `#editar-hallazgo-${enEdicion}` : '#anadir-hallazgo',
    );
  }

  protected campoInvalido(campo: CampoHallazgoValidado): boolean {
    const control = this.formularioHallazgo.controls[campo];
    return control.invalid && control.touched;
  }

  protected errorHallazgo(campo: CampoHallazgoValidado): string | null {
    return this.campoInvalido(campo) ? ERRORES_HALLAZGO[campo] : null;
  }

  // Marca los errores del hallazgo, lleva el foco al primer campo erróneo
  // (tras pintarse, que es cuando tiene aria-invalid) y avisa de que no se
  // ha guardado — ver specs/22-informe-ux.md P3.
  private mostrarErroresHallazgo(): void {
    this.formularioHallazgo.markAllAsTouched();
    this.toast.mostrar('El hallazgo no se ha guardado: revisa los campos marcados.');
    this.enfocar('[aria-invalid="true"]');
  }

  // Enfoca el primer elemento de esta pantalla que cumpla el selector, una
  // vez que Angular ha pintado el cambio que lo hace aparecer.
  private enfocar(selector: string): void {
    afterNextRender(
      () => this.elemento.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this.injector },
    );
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

  // "Usar esta redacción" sobre una sugerencia: al aplicarla, las sugerencias
  // desaparecen (ver `sugerenciasVisibles`) y con ellas el botón pulsado, así
  // que el foco se lleva a la descripción ya rellena en vez de perderse en
  // <body>, y se anuncia el cambio.
  protected usarSugerencia(plantilla: HallazgoPlantilla, campoNotas: HTMLTextAreaElement): void {
    this.usarPlantilla(plantilla);
    campoNotas.focus();
    this.toast.mostrar(`Redacción «${plantilla.titulo}» aplicada al hallazgo.`);
  }

  protected async guardarHallazgo(): Promise<void> {
    if (this.formularioHallazgo.invalid) {
      this.mostrarErroresHallazgo();
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

    let hallazgoId: number;
    // Ids de las evidencias ya guardadas de este hallazgo antes de este
    // guardado — un hallazgo nuevo nunca tiene ninguna.
    let idsGuardados: number[] = [];

    if (esNuevo) {
      hallazgoId = await this.hallazgosService.crear({ resultado_id: resultadoId, ...datos });
      this.toast.mostrar('Hallazgo añadido.');

      // Se cuenta como un uso solo cuando el hallazgo reutiliza una
      // plantilla ya existente (sugerencia usada), no cuando la plantilla
      // se acaba de crear a partir de este mismo hallazgo.
      if (!valores.guardarEnBiblioteca && hallazgoPlantillaId !== undefined) {
        await this.hallazgosPlantillaService.incrementarUso(hallazgoPlantillaId);
      }
    } else if (enEdicion !== null) {
      hallazgoId = enEdicion;
      idsGuardados = this.evidenciasDeHallazgo(hallazgoId).map((evidencia) => evidencia.id!);
      await this.hallazgosService.actualizar(hallazgoId, datos);
      this.toast.mostrar('Hallazgo actualizado.');
    } else {
      // No debería ocurrir: guardarHallazgo() siempre se llama con
      // hallazgoEnEdicion() en 'nuevo' o con el id de un hallazgo existente.
      this.hallazgoEnEdicion.set(null);
      return;
    }

    await this.guardarEvidencias(hallazgoId, idsGuardados);
    this.hallazgoEnEdicion.set(null);
    // El formulario se cierra con el foco dentro: pasa al "Editar" de la
    // tarjeta guardada (un hallazgo nuevo sale de la pantalla al guardar).
    if (!esNuevo) this.enfocar(`#editar-hallazgo-${hallazgoId}`);
  }

  // Compara las imágenes actuales del formulario (nuevas sin id, existentes
  // con su id) contra las que ya estaban guardadas antes de este guardado
  // para calcular qué añadir, describir de nuevo o quitar — ver
  // specs/16-evidencia-imagen-hallazgo.md.
  private async guardarEvidencias(hallazgoId: number, idsGuardados: number[]): Promise<void> {
    const controles = this.formularioHallazgo.controls.evidencias.controls;
    const nuevas = controles
      .filter((control) => control.controls.id.value === null)
      .map((control) => ({
        archivo: control.controls.archivo.value,
        descripcion: control.controls.descripcion.value,
      }));
    const actualizadas = controles
      .filter((control) => control.controls.id.value !== null)
      .map((control) => ({
        id: control.controls.id.value!,
        descripcion: control.controls.descripcion.value,
      }));
    const idsActuales = new Set(actualizadas.map((evidencia) => evidencia.id));
    const eliminadas = idsGuardados.filter((id) => !idsActuales.has(id));

    if (nuevas.length === 0 && actualizadas.length === 0 && eliminadas.length === 0) return;
    await this.evidenciasService.aplicarCambios(hallazgoId, { nuevas, actualizadas, eliminadas });
  }

  protected async eliminarHallazgo(hallazgo: Hallazgo): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar el hallazgo?',
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar hallazgo',
    });
    if (!confirmado) return;

    // Las URL de objeto de sus miniaturas las revoca el propio
    // EvidenciasMiniaturas al destruirse con la tarjeta del hallazgo —
    // ver specs/17-evidencias-en-checklist.md.
    await this.hallazgosService.eliminar(hallazgo.id!);
    this.toast.mostrar('Hallazgo eliminado.');
    if (this.hallazgoEnEdicion() === hallazgo.id) {
      this.hallazgoEnEdicion.set(null);
    }
    // El foco se recoloca cuando la tarjeta desaparece de verdad de la lista
    // reactiva (ver el effect del constructor): si se hiciera ya, el modal
    // lo devolvería al "Eliminar" de la tarjeta justo antes de borrarla.
    this.hallazgoEliminado.set(hallazgo.id!);
  }

  protected async guardarResultado(): Promise<void> {
    if (this.formularioResultado.invalid) {
      this.formularioResultado.markAllAsTouched();
      return;
    }

    // El hallazgo nuevo no tiene botón propio de guardado: "Guardar
    // revisión" es también el único disparador para persistirlo. Si está
    // incompleto no se guarda nada (ni la revisión): antes se guardaba
    // "Falla" con 0 hallazgos y se anunciaba "Revisión guardada." sin
    // ningún error — ver specs/22-informe-ux.md P3. Para no añadirlo, está
    // "Descartar hallazgo".
    if (this.hallazgoEnEdicion() === 'nuevo' && this.formularioHallazgo.invalid) {
      this.mostrarErroresHallazgo();
      return;
    }

    const valores = this.formularioResultado.getRawValue();
    await this.resultadosService.guardar(Number(this.paginaId), this.codigo, valores);
    this.toast.mostrar('Revisión guardada.');

    if (this.hallazgoEnEdicion() === 'nuevo') {
      await this.guardarHallazgo();
    }

    // Vuelve siempre al checklist, también en "Falla": los hallazgos ya se
    // pueden añadir antes de guardar la revisión. Solo se queda en la
    // pantalla si queda un hallazgo abierto sin guardar (el nuevo no pasó
    // la validación, o hay uno existente en edición), para no perderlo.
    if (this.hallazgoEnEdicion() === null) {
      void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
    }
  }
}
