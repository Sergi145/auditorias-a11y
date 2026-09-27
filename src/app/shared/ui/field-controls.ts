import { Directive } from '@angular/core';

// Directivas de clases sobre controles de formulario nativos — sustituyen
// matInput/mat-select. El foco usa el mismo anillo outline de alto
// contraste que appButton/.foco (en vez de un ring de baja opacidad) para
// que el indicador de foco sea consistente e igual de visible en todo
// controles interactivos de la app — también en un campo inválido: el foco
// se queda en violeta siempre, el rojo es solo el borde en reposo
// (`aria-[invalid=true]:border-red-600`; WCAG 1.4.1: el error no depende
// solo del color, el mensaje de AppFormField y su icono ya lo dicen por
// texto). `aria-[invalid=true]:focus-visible:border-violet-600` repite el
// mismo violeta con un selector compuesto (dos condiciones) a propósito:
// sin él, empata en especificidad con `aria-[invalid=true]:border-red-600`
// (los dos son un solo selector) y el rojo podía ganar el empate al
// enfocar un campo inválido — ver specs/04-rediseno-tailwind.md, nota de
// revisión 2026-09-27.
const CONTROL_CLASSES =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 aria-[invalid=true]:border-red-600 focus-visible:border-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 aria-[invalid=true]:focus-visible:border-violet-600 disabled:bg-slate-100';

@Directive({
  selector: 'input[appInput], textarea[appInput]',
  host: { class: CONTROL_CLASSES },
})
export class AppInput {}

@Directive({
  selector: 'select[appSelect]',
  host: { class: CONTROL_CLASSES },
})
export class AppSelect {}
