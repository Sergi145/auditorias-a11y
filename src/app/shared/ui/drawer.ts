import { A11yModule } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';

// Drawer de navegación modal para móvil — sustituye <mat-sidenav
// mode="over">. Usa cdkTrapFocus (Angular CDK a11y) para atrapar el foco
// mientras está abierto y se cierra con Escape o clic en el fondo; quien
// lo usa (Shell) es responsable de devolver el foco al botón que lo abrió
// al recibir (openedChange) con valor false. En escritorio se renderiza
// como barra lateral fija, sin overlay ni trampa de foco.
//
// Un solo <ng-content> en una única posición del DOM (con clases/atributos
// que cambian según isHandset()/opened()) a propósito: dos <ng-content>
// en ramas @if distintas hace que Angular no reproyecte el contenido al
// cambiar de rama (el contenido proyectado queda "huérfano"). Ver
// specs/04-rediseno-tailwind.md.
@Component({
  selector: 'app-drawer',
  imports: [A11yModule],
  host: { class: 'contents' },
  template: `
    @if (isHandset() && opened()) {
      <button
        type="button"
        class="foco fixed inset-0 z-40 cursor-default bg-black/40 focus-visible:outline-offset-[-4px]"
        [attr.aria-label]="'Cerrar ' + label()"
        (click)="close()"
      ></button>
    }
    <div
      [class]="
        isHandset()
          ? 'fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white p-4 shadow-lg'
          : 'w-72 shrink-0 border-r border-slate-200 p-4'
      "
      [hidden]="isHandset() && !opened()"
      [attr.role]="isHandset() ? 'dialog' : null"
      [attr.aria-modal]="isHandset() ? 'true' : null"
      [attr.aria-label]="isHandset() ? label() : null"
      [attr.tabindex]="isHandset() ? -1 : null"
      [cdkTrapFocus]="isHandset() && opened()"
      [cdkTrapFocusAutoCapture]="isHandset() && opened()"
      (keydown.escape)="onEscape()"
    >
      <ng-content />
    </div>
  `,
})
export class AppDrawer {
  readonly isHandset = input(false);
  readonly opened = input(false);
  readonly label = input('Navegación principal');
  readonly openedChange = output<boolean>();

  protected close(): void {
    this.openedChange.emit(false);
  }

  protected onEscape(): void {
    if (this.isHandset()) this.close();
  }
}
