import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject, signal } from '@angular/core';

interface EstadoToast {
  id: number;
  texto: string;
}

// Notificación temporal — sustituye MatSnackBar. El anuncio accesible lo
// hace LiveAnnouncer (Angular CDK a11y, ya previsto en
// specs/00-producto.md §7); el aviso visual lo pinta AppToastHost, montado
// una vez en el Shell. Ver specs/04-rediseno-tailwind.md.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private siguienteId = 0;
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly actual = signal<EstadoToast | null>(null);

  mostrar(texto: string): void {
    const id = this.siguienteId++;
    this.actual.set({ id, texto });
    void this.liveAnnouncer.announce(texto, 'polite');

    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      if (this.actual()?.id === id) this.actual.set(null);
    }, 4000);
  }

  cerrar(): void {
    clearTimeout(this.temporizador);
    this.actual.set(null);
  }
}
