import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDialogoConfirmacion, type OpcionesConfirmacion } from './dialogo-confirmacion';

export type { OpcionesConfirmacion };

// Sustituye a window.confirm() en toda la app — ver
// specs/19-modal-confirmacion.md. Abre AppDialogoConfirmacion con
// @angular/cdk/dialog (ya incluido en @angular/cdk, sin dependencias
// nuevas), que da la trampa de foco, aria-modal y la devolución del foco
// al elemento que abrió el modal (restoreFocus).
//
// disableClose: true evita que un clic en el fondo cierre el modal sin
// decisión — a diferencia de AppDrawer (specs/10-cierre-menu-movil.md),
// donde cerrar es inocuo, aquí el modal espera una respuesta explícita.
// Como disableClose también desactiva el cierre con Esc que trae el CDK
// por defecto, Esc se gestiona a mano suscribiéndose a keydownEvents y
// cerrando con `false` (mismo resultado que Cancelar).
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private readonly dialog = inject(Dialog);

  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean, OpcionesConfirmacion>(AppDialogoConfirmacion, {
      data: opciones,
      role: 'alertdialog',
      ariaModal: true,
      ariaLabelledBy: 'dialogo-confirmacion-titulo',
      ariaDescribedBy: 'dialogo-confirmacion-mensaje',
      autoFocus: '#dialogo-confirmacion-cancelar',
      restoreFocus: true,
      disableClose: true,
      // Dejar 16 px de margen a cada lado en móvil, sin desbordar el
      // viewport aunque max-w-md (28rem) no quepa — ver criterios de
      // aceptación de la spec 19.
      maxWidth: 'calc(100vw - 2rem)',
      backdropClass: 'bg-black/40',
    });

    dialogRef.keydownEvents.subscribe((evento) => {
      if (evento.key === 'Escape') dialogRef.close(false);
    });

    return firstValueFrom(dialogRef.closed).then((resultado) => resultado ?? false);
  }
}
