import { Component, input } from '@angular/core';
import { AppIcon } from './icon';

let siguienteId = 0;

// Contenedor label + control proyectado + hint/error — sustituye
// mat-form-field. Cablea for/id/aria-describedby explícitamente: el
// control proyectado debe enlazar [id]="campo.id" y
// [attr.aria-describedby]="campo.describedBy" usando una referencia de
// plantilla (#campo="appFormField"). El mensaje de error lleva además un
// icono (aria-hidden, el propio texto ya dice "error") para no depender
// solo del borde rojo del control — ver specs/04-rediseno-tailwind.md,
// nota de revisión 2026-09-27.
@Component({
  selector: 'app-form-field',
  exportAs: 'appFormField',
  imports: [AppIcon],
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <label [for]="id" class="text-sm font-medium text-slate-700">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p [id]="descId" class="flex items-center gap-1 text-xs text-red-700" role="alert">
        <app-icon name="alert-circle" />
        <span>{{ error() }}</span>
      </p>
    } @else if (hint()) {
      <p [id]="descId" class="text-xs text-slate-500">{{ hint() }}</p>
    }
  `,
})
export class AppFormField {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>(null);

  readonly id = `campo-${siguienteId++}`;
  readonly descId = `${this.id}-desc`;

  get describedBy(): string | null {
    return this.error() || this.hint() ? this.descId : null;
  }
}
