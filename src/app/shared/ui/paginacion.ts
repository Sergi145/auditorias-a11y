import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon } from './icon';

// 'salto' se pinta como "…" — ver specs/23-paginacion-auditorias.md.
export type HuecoPaginacion = number | 'salto';

// Máximo de huecos de la ventana, contando los "…". Con 5 caben "Anterior",
// los números y "Siguiente" en una línea a 320 px (WCAG 1.4.10).
const MAX_HUECOS = 5;

// Huecos numéricos de la paginación: hasta MAX_HUECOS páginas se muestran
// todas; con más, la primera, la actual y la última, con 'salto' donde se
// omitan páginas. Nunca hay un 'salto' que oculte una sola página (sería más
// largo que escribir su número). Función pura para poder probarla sin DOM.
export function calcularPaginasVisibles(actual: number, totalPaginas: number): HuecoPaginacion[] {
  if (totalPaginas < 1) {
    return [];
  }
  if (totalPaginas <= MAX_HUECOS) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  const pagina = Math.min(Math.max(actual, 1), totalPaginas);
  if (pagina <= 3) {
    return [1, 2, 3, 'salto', totalPaginas];
  }
  if (pagina >= totalPaginas - 2) {
    return [1, 'salto', totalPaginas - 2, totalPaginas - 1, totalPaginas];
  }
  return [1, 'salto', pagina, 'salto', totalPaginas];
}

// Objetivo táctil de 32×32 px en móvil y 40×40 px desde `sm` (WCAG 2.5.8
// pide 24×24). El anillo de foco es el de la clase `foco` (styles.css) y
// solo lo llevan los controles interactivos.
const CONTROL =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm sm:h-10 sm:min-w-10';
const CLASE_NUMERO = `${CONTROL} foco text-slate-700 hover:bg-slate-100`;
// La página actual se distingue por fondo y peso de fuente, no solo por
// color (WCAG 1.4.1).
const CLASE_ACTUAL = `${CONTROL} foco bg-violet-700 font-semibold text-white`;
const CLASE_EXTREMO = `${CONTROL} foco gap-1 text-slate-700 hover:bg-slate-100 sm:px-3`;
const CLASE_EXTREMO_INACTIVO = `${CONTROL} gap-1 text-slate-700 opacity-50 sm:px-3`;

// Paginación de listados — ver specs/23-paginacion-auditorias.md. Genérica:
// no sabe qué pagina. Cada control es un enlace que cambia `?pagina=N` de la
// URL (navegación, no acción), conservando el resto de query params. La
// página 1 se enlaza sin `pagina`. No se pinta si todo cabe en una página.
//
// Quien la usa (el listado) lee `?pagina`, recorta los datos, mueve el foco
// y anuncia el cambio: este componente solo pinta los enlaces.
@Component({
  selector: 'app-paginacion',
  imports: [RouterLink, AppIcon],
  host: { class: 'block' },
  template: `
    @if (totalPaginas() > 1) {
      <nav [attr.aria-label]="etiqueta()" class="mt-6">
        <ul class="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
          <li>
            @if (actual() > 1) {
              <a
                [routerLink]="[]"
                [queryParams]="parametros(actual() - 1)"
                queryParamsHandling="merge"
                [class]="claseExtremo"
              >
                <app-icon name="chevron-left" />
                <span class="sr-only sm:not-sr-only">Página anterior</span>
              </a>
            } @else {
              <span role="link" aria-disabled="true" [class]="claseExtremoInactivo">
                <app-icon name="chevron-left" />
                <span class="sr-only sm:not-sr-only">Página anterior</span>
              </span>
            }
          </li>

          @for (hueco of huecos(); track hueco === 'salto' ? 'salto' + $index : hueco) {
            @if (hueco === 'salto') {
              <li
                aria-hidden="true"
                class="inline-flex h-8 w-6 select-none items-center justify-center text-slate-600 sm:h-10"
              >
                …
              </li>
            } @else {
              <li>
                <a
                  [routerLink]="[]"
                  [queryParams]="parametros(hueco)"
                  queryParamsHandling="merge"
                  [attr.aria-current]="hueco === actual() ? 'page' : null"
                  [class]="hueco === actual() ? claseActual : claseNumero"
                >
                  <span class="sr-only">Página </span>{{ hueco }}
                </a>
              </li>
            }
          }

          <li>
            @if (actual() < totalPaginas()) {
              <a
                [routerLink]="[]"
                [queryParams]="parametros(actual() + 1)"
                queryParamsHandling="merge"
                [class]="claseExtremo"
              >
                <span class="sr-only sm:not-sr-only">Página siguiente</span>
                <app-icon name="chevron-right" />
              </a>
            } @else {
              <span role="link" aria-disabled="true" [class]="claseExtremoInactivo">
                <span class="sr-only sm:not-sr-only">Página siguiente</span>
                <app-icon name="chevron-right" />
              </span>
            }
          </li>
        </ul>
      </nav>
    }
  `,
})
export class AppPaginacion {
  readonly total = input.required<number>();
  readonly porPagina = input.required<number>();
  readonly paginaActual = input.required<number>();
  // Nombre accesible del <nav>: obligatorio para distinguir esta paginación
  // de otras posibles en la misma pantalla.
  readonly etiqueta = input.required<string>();

  protected readonly claseNumero = CLASE_NUMERO;
  protected readonly claseActual = CLASE_ACTUAL;
  protected readonly claseExtremo = CLASE_EXTREMO;
  protected readonly claseExtremoInactivo = CLASE_EXTREMO_INACTIVO;

  protected readonly totalPaginas = computed(() =>
    Math.ceil(this.total() / Math.max(1, this.porPagina())),
  );

  // La página actual se ajusta al rango real: quien la usa ya la normaliza
  // en la URL, pero así los enlaces "Anterior"/"Siguiente" nunca apuntan
  // fuera de rango aunque reciba un valor inválido.
  protected readonly actual = computed(() =>
    Math.min(Math.max(this.paginaActual(), 1), this.totalPaginas()),
  );

  protected readonly huecos = computed(() =>
    calcularPaginasVisibles(this.actual(), this.totalPaginas()),
  );

  protected parametros(pagina: number): { pagina: number | null } {
    return { pagina: pagina === 1 ? null : pagina };
  }
}
