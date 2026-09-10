import { Directive } from '@angular/core';

// Directiva de clases sobre un contenedor — sustituye <mat-card
// appearance="outlined">. Ver specs/04-rediseno-tailwind.md.
@Directive({
  selector: '[appCard]',
  host: { class: 'block rounded-xl border border-slate-200 p-4' },
})
export class AppCard {}
