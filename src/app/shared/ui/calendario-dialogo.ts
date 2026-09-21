import { DIALOG_DATA, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { AppButton } from './button';
import {
  diaDeSemana,
  esFechaIso,
  fechaDeHoy,
  fechaLarga,
  nombreMesAnio,
  semanasDelMes,
  sumarAnios,
  sumarDias,
  sumarMeses,
} from './fechas';
import { AppIcon } from './icon';

// Fijo (no hay más de un calendario abierto a la vez) porque las opciones de
// apertura lo referencian desde fuera, en aria-labelledby, antes de que el
// componente exista — mismo criterio que AppDialogoConfirmacion.
export const ID_TITULO_CALENDARIO = 'dialogo-calendario-titulo';

type ResultadoCalendario = string | undefined;

// Opciones de apertura del calendario con @angular/cdk/dialog: la fecha ISO
// seleccionada (o null) llega al componente por DIALOG_DATA. La posición
// (anclado al botón o centrado) la añade quien lo abre.
//
// El foco inicial en el día activo lo pone el propio componente, no el CDK
// con un autoFocus por selector: si el CDK no considera enfocable el elemento
// (sin layout, p. ej. en jsdom), le fuerza tabindex="-1" y se lo retira al
// perder el foco, y eso pisaría el tabindex itinerante del día activo. Con
// 'dialog' al CDK solo le queda dejar el foco dentro del diálogo.
export function opcionesCalendario(
  fechaIso: string | null,
): DialogConfig<string | null, DialogRef<ResultadoCalendario, AppCalendarioDialogo>> {
  return {
    data: fechaIso,
    role: 'dialog',
    ariaModal: true,
    ariaLabelledBy: ID_TITULO_CALENDARIO,
    autoFocus: 'dialog',
    restoreFocus: true,
  };
}

interface CeldaDia {
  iso: string;
  numero: number;
  // Fecha larga: es el nombre accesible del día (aria-label).
  nombre: string;
  activa: boolean;
  seleccionada: boolean;
  hoy: boolean;
  clases: string;
}

const DIAS_SEMANA = [
  { abreviatura: 'L', nombre: 'lunes' },
  { abreviatura: 'M', nombre: 'martes' },
  { abreviatura: 'X', nombre: 'miércoles' },
  { abreviatura: 'J', nombre: 'jueves' },
  { abreviatura: 'V', nombre: 'viernes' },
  { abreviatura: 'S', nombre: 'sábado' },
  { abreviatura: 'D', nombre: 'domingo' },
];

const TEXTO_AYUDA = 'Usa las flechas para moverte entre los días.';

// El día seleccionado va relleno y el de hoy lleva borde, para que no se
// distingan solo por el color (WCAG 1.4.1). Todas las celdas tienen borde
// (transparente si no es hoy) para que no cambie su tamaño.
const CLASES_CELDA =
  'h-9 cursor-pointer rounded-md border-2 text-center text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-violet-700';

function clasesCelda(seleccionada: boolean, hoy: boolean): string {
  const borde = hoy ? 'border-violet-700' : 'border-transparent';
  const relleno = seleccionada
    ? 'bg-violet-700 font-semibold text-white hover:bg-violet-800'
    : 'text-slate-900 hover:bg-slate-100';
  return `${CLASES_CELDA} ${borde} ${relleno}`;
}

// Contenido del calendario del selector de fecha — patrón «Date Picker
// Dialog» de la APG de WAI-ARIA; ver specs/25-selector-fecha.md. Se abre con
// @angular/cdk/dialog (trampa de foco, aria-modal, Esc, clic fuera y
// devolución del foco al botón que lo abrió los da el CDK) y se cierra con
// la fecha ISO elegida, o sin resultado (undefined) si se cancela.
//
// Un único estado, `activa`, manda: el mes que se ve es el de la fecha
// activa, así que moverla con el teclado o con los botones de mes y año
// cambia de mes sin más. Las celdas se identifican por posición (track
// $index) para que, al cambiar de mes, el td que tiene el foco no se destruya
// y se recree. El teclado y el clic van en cada td (como en la APG); el
// mensaje de ayuda sigue al foco con focusin/focusout en el <tbody>.
@Component({
  selector: 'app-calendario-dialogo',
  imports: [AppButton, AppIcon],
  host: {
    class: 'block w-[21rem] max-w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg',
  },
  template: `
    <div class="flex flex-wrap items-center justify-between gap-y-2">
      <div class="flex">
        <button type="button" appButton variant="icon" aria-label="Año anterior" (click)="moverAnio(-1)">
          <app-icon name="chevrons-left" />
        </button>
        <button type="button" appButton variant="icon" aria-label="Mes anterior" (click)="moverMes(-1)">
          <app-icon name="chevron-left" />
        </button>
      </div>
      <h2
        [id]="idTitulo"
        aria-live="polite"
        class="order-first w-full text-center text-sm font-semibold text-slate-900 min-[24rem]:order-none min-[24rem]:w-auto"
      >
        {{ titulo() }}
      </h2>
      <div class="flex">
        <button type="button" appButton variant="icon" aria-label="Mes siguiente" (click)="moverMes(1)">
          <app-icon name="chevron-right" />
        </button>
        <button type="button" appButton variant="icon" aria-label="Año siguiente" (click)="moverAnio(1)">
          <app-icon name="chevrons-right" />
        </button>
      </div>
    </div>

    <table
      role="grid"
      [attr.aria-labelledby]="idTitulo"
      class="mt-3 w-full table-fixed border-separate border-spacing-0"
    >
      <thead>
        <tr>
          @for (dia of diasSemana; track dia.nombre) {
            <th scope="col" class="h-9 text-center text-xs font-medium text-slate-600">
              <abbr [title]="dia.nombre" class="no-underline">{{ dia.abreviatura }}</abbr>
            </th>
          }
        </tr>
      </thead>
      <tbody (focusin)="enRejilla.set(true)" (focusout)="alSalirFoco($event)">
        @for (semana of semanas(); track $index) {
          <tr>
            @for (celda of semana; track $index) {
              <td
                [class]="celda ? celda.clases : 'h-9'"
                [attr.tabindex]="celda ? (celda.activa ? 0 : -1) : null"
                [attr.aria-label]="celda ? celda.nombre : null"
                [attr.aria-selected]="celda?.seleccionada ? 'true' : null"
                [attr.aria-current]="celda?.hoy ? 'date' : null"
                [attr.data-fecha]="celda ? celda.iso : null"
                (keydown)="alPulsarTecla($event)"
                (keyup)="alSoltarTecla($event)"
                (click)="alHacerClic(celda)"
              >{{ celda?.numero }}</td>
            }
          </tr>
        }
      </tbody>
    </table>

    <p aria-live="polite" class="mt-3 min-h-4 text-xs text-slate-600">{{ ayuda() }}</p>

    <div class="mt-4 flex justify-end gap-3">
      <button type="button" appButton variant="secondary" (click)="cancelar()">Cancelar</button>
      <button type="button" appButton (click)="aceptar()">Aceptar</button>
    </div>
  `,
})
export class AppCalendarioDialogo {
  private readonly dialogRef = inject<DialogRef<ResultadoCalendario, AppCalendarioDialogo>>(DialogRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly dato = inject<string | null | undefined>(DIALOG_DATA);
  private readonly hoy = fechaDeHoy();
  private readonly seleccionada = typeof this.dato === 'string' && esFechaIso(this.dato) ? this.dato : null;

  protected readonly idTitulo = ID_TITULO_CALENDARIO;
  protected readonly diasSemana = DIAS_SEMANA;

  // Fecha con el foco (tabindex="0"); su mes es el que se ve. Arranca en la
  // fecha seleccionada, o en hoy si no hay ninguna válida.
  protected readonly activa = signal(this.seleccionada ?? this.hoy);
  protected readonly enRejilla = signal(false);

  protected readonly titulo = computed(() =>
    nombreMesAnio(Number(this.activa().slice(0, 4)), Number(this.activa().slice(5, 7))),
  );
  protected readonly ayuda = computed(() => (this.enRejilla() ? TEXTO_AYUDA : ''));

  protected readonly semanas = computed<(CeldaDia | null)[][]>(() => {
    const activa = this.activa();
    const anio = Number(activa.slice(0, 4));
    const mes = Number(activa.slice(5, 7));

    return semanasDelMes(anio, mes).map((semana) =>
      semana.map((iso) => {
        if (iso === null) {
          return null;
        }
        const seleccionada = iso === this.seleccionada;
        const hoy = iso === this.hoy;
        return {
          iso,
          numero: Number(iso.slice(8)),
          nombre: fechaLarga(iso),
          activa: iso === activa,
          seleccionada,
          hoy,
          clases: clasesCelda(seleccionada, hoy),
        };
      }),
    );
  });

  constructor() {
    this.enfocarCeldaActiva();
  }

  protected moverMes(meses: number): void {
    this.activa.update((activa) => sumarMeses(activa, meses));
  }

  protected moverAnio(anios: number): void {
    this.activa.update((activa) => sumarAnios(activa, anios));
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected aceptar(): void {
    this.dialogRef.close(this.activa());
  }

  // Teclado de la rejilla, el de la APG. No toca las combinaciones con Alt,
  // Ctrl o Meta (Alt + ← es «atrás» en el navegador), ni Mayús salvo con
  // RePág/AvPág.
  protected alPulsarTecla(evento: KeyboardEvent): void {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) {
      return;
    }
    const cambiaAnio = evento.shiftKey;
    if (cambiaAnio && evento.key !== 'PageUp' && evento.key !== 'PageDown') {
      return;
    }

    const activa = this.activa();
    let destino: string;
    switch (evento.key) {
      case 'ArrowLeft':
        destino = sumarDias(activa, -1);
        break;
      case 'ArrowRight':
        destino = sumarDias(activa, 1);
        break;
      case 'ArrowUp':
        destino = sumarDias(activa, -7);
        break;
      case 'ArrowDown':
        destino = sumarDias(activa, 7);
        break;
      case 'Home':
        destino = sumarDias(activa, -diaDeSemana(activa));
        break;
      case 'End':
        destino = sumarDias(activa, 6 - diaDeSemana(activa));
        break;
      case 'PageUp':
        destino = cambiaAnio ? sumarAnios(activa, -1) : sumarMeses(activa, -1);
        break;
      case 'PageDown':
        destino = cambiaAnio ? sumarAnios(activa, 1) : sumarMeses(activa, 1);
        break;
      case 'Enter':
        evento.preventDefault();
        this.dialogRef.close(activa);
        return;
      case ' ':
        // Elige al soltar (alSoltarTecla), no al pulsar: si se cerrase ahora,
        // el foco volvería al botón del calendario antes de soltar Espacio, y
        // ese keyup podría volver a pulsarlo.
        evento.preventDefault();
        return;
      default:
        return;
    }

    evento.preventDefault();
    this.activa.set(destino);
    this.enfocarCeldaActiva();
  }

  protected alSoltarTecla(evento: KeyboardEvent): void {
    if (evento.key !== ' ' || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) {
      return;
    }
    evento.preventDefault();
    this.dialogRef.close(this.activa());
  }

  protected alHacerClic(celda: CeldaDia | null): void {
    if (celda) {
      this.dialogRef.close(celda.iso);
    }
  }

  protected alSalirFoco(evento: FocusEvent): void {
    const rejilla = evento.currentTarget as HTMLElement;
    if (!rejilla.contains(evento.relatedTarget as Node | null)) {
      this.enRejilla.set(false);
    }
  }

  // Foco inicial y, después, el td activo cambia de posición al mover la fecha
  // (y de mes): el foco lo sigue, pero solo cuando el cambio sale del teclado
  // de la rejilla — los botones de mes y año conservan el suyo.
  private enfocarCeldaActiva(): void {
    afterNextRender(
      () => {
        this.elemento.nativeElement.querySelector<HTMLElement>('td[tabindex="0"]')?.focus();
      },
      { injector: this.injector },
    );
  }
}
