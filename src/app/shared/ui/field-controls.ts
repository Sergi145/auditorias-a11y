import { Directive } from '@angular/core';

// Directivas de clases sobre controles de formulario nativos — sustituyen
// matInput/mat-select. El foco usa el mismo anillo outline de alto
// contraste que appButton/.foco (en vez de un ring de baja opacidad) para
// que el indicador de foco sea consistente e igual de visible en todo
// controles interactivos de la app. Ver specs/04-rediseno-tailwind.md.
const CONTROL_CLASSES =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:bg-slate-100';

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
