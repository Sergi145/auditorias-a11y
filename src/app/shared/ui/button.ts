import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:pointer-events-none disabled:opacity-50';

const VARIANTES: Record<ButtonVariant, string> = {
  primary: `${BASE} px-5 py-2.5 bg-violet-700 text-white hover:bg-violet-800`,
  secondary: `${BASE} px-5 py-2.5 border border-slate-400 text-slate-800 hover:bg-slate-100`,
  text: `${BASE} px-3 py-2 text-violet-700 hover:bg-violet-50`,
  icon: `${BASE} h-10 w-10 text-slate-700 hover:bg-slate-100`,
};

// Directiva de clases sobre <button>/<a> nativos — ver
// specs/04-rediseno-tailwind.md. No envuelve el elemento: mantiene su
// semántica (type, disabled, href) intacta.
@Directive({
  selector: '[appButton]',
  host: { '[class]': 'classes()' },
})
export class AppButton {
  readonly variant = input<ButtonVariant>('primary');

  protected readonly classes = computed(() => VARIANTES[this.variant()]);
}
