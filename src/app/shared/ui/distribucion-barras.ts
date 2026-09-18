import { Component, computed, input } from '@angular/core';

export interface FilaDistribucion {
  etiqueta: string;
  cantidad: number;
  // Color de la barra, p. ej. 'var(--severidad-critica)'. Sin color, la
  // barra usa el violeta neutro por defecto — ver specs/14-panel-progreso.md.
  color?: string | null;
}

// Bloque de distribución compartido por el panel de progreso: estado de los
// criterios, fallos por principio WCAG y páginas con más incidencias — ver
// specs/14-panel-progreso.md. Cada barra es decorativa (aria-hidden): el
// dato real es la etiqueta y la cifra, siempre en texto, nunca solo el
// color o el ancho de la barra.
@Component({
  selector: 'app-distribucion-barras',
  host: { class: 'block' },
  template: `
    <ul class="m-0 flex max-w-[640px] list-none flex-col gap-2 p-0">
      @for (fila of filas(); track fila.etiqueta) {
        <li class="grid grid-cols-[160px_1fr_minmax(2.5rem,auto)] items-center gap-3">
          <span class="break-words">{{ fila.etiqueta }}</span>
          <div class="h-6 overflow-hidden rounded bg-slate-100" aria-hidden="true">
            <div
              class="h-full rounded"
              [class.bg-violet-700]="!fila.color"
              [style.background-color]="fila.color || null"
              [style.width.%]="(fila.cantidad / maximo()) * 100"
            ></div>
          </div>
          <span class="text-right tabular-nums"
            >{{ fila.cantidad }}<span class="sr-only"> {{ unidad() }}</span></span
          >
        </li>
      }
    </ul>
  `,
})
export class AppDistribucionBarras {
  readonly filas = input.required<FilaDistribucion[]>();
  // Texto que sigue a la cifra, solo para lector de pantalla, p. ej.
  // "hallazgos" o "criterios en falla".
  readonly unidad = input.required<string>();

  protected readonly maximo = computed(() => Math.max(1, ...this.filas().map((fila) => fila.cantidad)));
}
