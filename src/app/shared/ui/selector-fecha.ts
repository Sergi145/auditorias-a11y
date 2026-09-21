import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { type ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { map } from 'rxjs';
import { AppButton } from './button';
import { AppCalendarioDialogo, opcionesCalendario } from './calendario-dialogo';
import { fechaLarga, formatearFechaEs, parsearFechaEs } from './fechas';
import { AppInput } from './field-controls';
import { AppIcon } from './icon';

// Debajo del botón, alineado a su inicio; si no cabe, alineado a su final o
// encima (el CDK elige la primera que cabe entera).
const POSICIONES_ANCLADO: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];

// Selector de fecha: campo de texto `dd/mm/aaaa` más un botón que abre el
// calendario — patrón «Date Picker Dialog» de la APG de WAI-ARIA; ver
// specs/25-selector-fecha.md. Sirve para formularios reactivos
// (formControlName / formControl).
//
// El valor del control es siempre la fecha ISO `aaaa-mm-dd` o '' (vacío, o
// texto que no es una fecha). El texto que ve el usuario está en `texto`, y
// el validador devuelve { fechaInvalida: true } si hay texto que no se puede
// leer como fecha. Un valor de fuera que no es una fecha ISO (datos antiguos)
// se muestra tal cual, y por lo mismo sale como fecha no válida.
//
// Se coloca dentro de AppFormField como el resto de controles: recibe el id,
// el aria-describedby y el estado inválido de su `#campo`, y el <label> del
// campo apunta al input de texto.
@Component({
  selector: 'app-selector-fecha',
  imports: [AppButton, AppIcon, AppInput],
  host: { class: 'flex items-center gap-2' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectorFecha), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppSelectorFecha), multi: true },
  ],
  template: `
    <input
      #entrada
      appInput
      type="text"
      inputmode="numeric"
      autocomplete="off"
      class="min-w-0 flex-1"
      [attr.id]="inputId()"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-invalid]="invalido()"
      [attr.aria-required]="required() ? 'true' : null"
      [value]="texto()"
      [disabled]="deshabilitado()"
      (input)="alEscribir($event)"
      (blur)="alSalir()"
    />
    <button
      #botonCalendario
      type="button"
      appButton
      variant="icon"
      aria-haspopup="dialog"
      [attr.aria-label]="nombreBoton()"
      [disabled]="deshabilitado()"
      (click)="abrirCalendario()"
    >
      <app-icon name="calendar" />
    </button>
  `,
})
export class AppSelectorFecha implements ControlValueAccessor, Validator {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Enlazan el input de texto con el <label>, el hint o error y el estado
  // inválido del AppFormField que lo envuelve.
  readonly inputId = input<string | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly invalido = input(false);
  // Con el mismo nombre que el atributo nativo: <app-selector-fecha required>
  // añade además el validador required de Angular; aquí solo se anuncia el
  // campo como obligatorio (aria-required).
  readonly required = input(false, { transform: booleanAttribute });

  private readonly entrada = viewChild.required<ElementRef<HTMLInputElement>>('entrada');
  private readonly botonCalendario = viewChild.required<ElementRef<HTMLButtonElement>>('botonCalendario');

  protected readonly texto = signal('');
  protected readonly deshabilitado = signal(false);

  // ISO de lo que hay escrito, o '' si está vacío o no es una fecha real.
  private readonly valor = computed(() => parsearFechaEs(this.texto()) ?? '');

  protected readonly nombreBoton = computed(() =>
    this.valor() ? `Cambiar fecha, ${fechaLarga(this.valor())}` : 'Elegir fecha',
  );

  private readonly esMovil = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((resultado) => resultado.matches)),
    { initialValue: false },
  );

  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  enfocar(): void {
    this.entrada().nativeElement.focus();
  }

  writeValue(valor: string | null | undefined): void {
    const iso = valor ?? '';
    this.texto.set(formatearFechaEs(iso) || iso);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  validate(): ValidationErrors | null {
    const hayTexto = this.texto().trim() !== '';
    return hayTexto && this.valor() === '' ? { fechaInvalida: true } : null;
  }

  protected alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
    this.onChange(this.valor());
  }

  // Al salir del campo, una fecha válida se reescribe completa (1/9/2026 →
  // 01/09/2026). Un texto que no es una fecha se deja como está para que el
  // usuario lo corrija.
  protected alSalir(): void {
    if (this.valor()) {
      this.texto.set(formatearFechaEs(this.valor()));
    }
    this.onTouched();
  }

  // En pantallas de móvil el calendario va centrado con fondo oscuro, como el
  // modal de confirmación (specs/19-modal-confirmacion.md); en escritorio va
  // anclado al botón, con un fondo transparente que recoge el clic fuera.
  protected abrirCalendario(): void {
    const boton = this.botonCalendario().nativeElement;
    const dialogRef = this.dialog.open<string | undefined, string | null, AppCalendarioDialogo>(
      AppCalendarioDialogo,
      {
        ...opcionesCalendario(this.valor() || null),
        maxWidth: 'calc(100vw - 2rem)',
        ...(this.esMovil()
          ? { backdropClass: 'bg-black/40' }
          : {
              backdropClass: 'cdk-overlay-transparent-backdrop',
              positionStrategy: this.overlay
                .position()
                .flexibleConnectedTo(boton)
                .withPositions(POSICIONES_ANCLADO)
                .withViewportMargin(16),
            }),
      },
    );

    dialogRef.closed.subscribe((iso) => {
      if (iso) {
        this.texto.set(formatearFechaEs(iso));
        this.onChange(iso);
        this.onTouched();
      }
      // restoreFocus del CDK ya devuelve el foco, pero en Safari un clic no
      // enfoca el botón y lo devolvería al <body>. Este subscribe se ejecuta
      // después de que el CDK restaure el foco, así que este foco es el que
      // queda.
      boton.focus();
    });
  }
}
