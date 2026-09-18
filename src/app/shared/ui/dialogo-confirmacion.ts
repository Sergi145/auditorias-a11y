import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { AppButton } from './button';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
}

// Contenido del modal de confirmación de acciones destructivas —
// sustituye a window.confirm(). Ver specs/19-modal-confirmacion.md. Lo
// abre ConfirmacionService con @angular/cdk/dialog, que ya resuelve la
// trampa de foco, aria-modal y la devolución del foco; este componente
// solo pinta el título, el mensaje y los dos botones, y resuelve el
// DialogRef con el resultado (true = confirmar, false = cancelar).
//
// Los ids de <h2> y <p> son fijos (no hay más de un diálogo de
// confirmación abierto a la vez) porque ConfirmacionService los referencia
// desde fuera, en la configuración de apertura (ariaLabelledBy,
// ariaDescribedBy, autoFocus), antes de que este componente exista.
@Component({
  selector: 'app-dialogo-confirmacion',
  imports: [AppButton],
  host: {
    class: 'block w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg',
  },
  template: `
    <h2 id="dialogo-confirmacion-titulo" class="text-lg font-semibold text-slate-900">
      {{ data.titulo }}
    </h2>
    <p id="dialogo-confirmacion-mensaje" class="mt-2 text-sm text-slate-600">
      {{ data.mensaje }}
    </p>
    <div class="mt-6 flex justify-end gap-3">
      <button
        type="button"
        id="dialogo-confirmacion-cancelar"
        appButton
        variant="secondary"
        (click)="cancelar()"
      >
        Cancelar
      </button>
      <button type="button" appButton variant="danger" (click)="confirmar()">
        {{ data.textoConfirmar }}
      </button>
    </div>
  `,
})
export class AppDialogoConfirmacion {
  protected readonly data = inject<OpcionesConfirmacion>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<boolean, AppDialogoConfirmacion>>(DialogRef);

  protected cancelar(): void {
    this.dialogRef.close(false);
  }

  protected confirmar(): void {
    this.dialogRef.close(true);
  }
}
