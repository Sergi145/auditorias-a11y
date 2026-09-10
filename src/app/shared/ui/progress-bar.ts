import { Component, input } from '@angular/core';

// Barra de progreso determinada — sustituye <mat-progress-bar
// mode="determinate">. Ver specs/04-rediseno-tailwind.md.
@Component({
  selector: 'app-progress-bar',
  host: { class: 'block' },
  template: `
    <div
      role="progressbar"
      [attr.aria-valuenow]="value()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="label()"
      class="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div class="h-full rounded-full bg-violet-700 transition-[width]" [style.width.%]="value()"></div>
    </div>
  `,
})
export class AppProgressBar {
  readonly value = input.required<number>();
  readonly label = input<string>('');
}
