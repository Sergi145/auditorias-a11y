import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';

// Notificación temporal — sustituye MatSnackBar. Solo anuncio accesible,
// vía LiveAnnouncer (Angular CDK a11y, ya previsto en specs/00-producto.md
// §7); no hay componente visual (se eliminó AppToastHost). Ver
// specs/04-rediseno-tailwind.md.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  mostrar(texto: string): void {
    void this.liveAnnouncer.announce(texto, 'polite');
  }
}
