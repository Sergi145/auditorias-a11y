import { Component, Injectable, inject, signal } from '@angular/core';

// Tiempo que el aviso sigue a la vista.
const DURACION_MS = 5000;
// Pausa entre vaciar la región y escribir el mensaje nuevo: si se repite el
// mismo texto («Revisión guardada.» dos veces seguidas), la región tiene que
// cambiar para que el lector de pantalla lo vuelva a anunciar.
const PAUSA_ANUNCIO_MS = 100;

// Notificación temporal — sustituye MatSnackBar. La spec 04 dejó el aviso
// solo para lectores de pantalla (LiveAnnouncer) y quien no usa uno no veía
// ninguna confirmación (specs/22-informe-ux.md P4). Ahora el aviso vuelve a
// ser visible y es él mismo la región `role="status"`: el texto existe una
// sola vez, se ve y se anuncia, sin leerse dos veces.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly texto = signal('');
  readonly mensaje = this.texto.asReadonly();

  private temporizadorMostrar?: ReturnType<typeof setTimeout>;
  private temporizadorOcultar?: ReturnType<typeof setTimeout>;

  mostrar(texto: string): void {
    clearTimeout(this.temporizadorMostrar);
    clearTimeout(this.temporizadorOcultar);
    this.texto.set('');
    this.temporizadorMostrar = setTimeout(() => {
      this.texto.set(texto);
      this.temporizadorOcultar = setTimeout(() => this.texto.set(''), DURACION_MS);
    }, PAUSA_ANUNCIO_MS);
  }
}

// Aviso visual de ToastService, fijo abajo y centrado. La región viva está
// siempre en el DOM (vacía cuando no hay aviso) para que los lectores de
// pantalla la registren antes de que cambie su contenido. No intercepta
// clics (pointer-events-none) ni tiene controles: desaparece solo.
@Component({
  selector: 'app-toast-host',
  host: {
    class: 'pointer-events-none fixed inset-x-0 bottom-16 z-50 flex justify-center px-4',
  },
  template: `
    <div role="status" aria-live="polite" aria-atomic="true">
      @if (toast.mensaje(); as texto) {
        <p class="m-0 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {{ texto }}
        </p>
      }
    </div>
  `,
})
export class AppToastHost {
  protected readonly toast = inject(ToastService);
}
