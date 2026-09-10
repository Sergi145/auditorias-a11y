import { Component, inject } from '@angular/core';
import { ToastService } from './toast';

@Component({
  selector: 'app-toast-host',
  template: `
    @if (toast.actual(); as t) {
      <div class="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div class="flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <span>{{ t.texto }}</span>
          <button
            type="button"
            class="rounded px-2 py-1 text-xs font-medium underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            (click)="toast.cerrar()"
          >
            Cerrar
          </button>
        </div>
      </div>
    }
  `,
})
export class AppToastHost {
  protected readonly toast = inject(ToastService);
}
