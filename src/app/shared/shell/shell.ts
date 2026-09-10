import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AppButton } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import { AppIcon } from '../ui/icon';
import { AppToastHost } from '../ui/toast-host';

// Shell de navegación — top bar + drawer lateral, ver
// specs/04-rediseno-tailwind.md. Sustituye el shell M3 de
// specs/02-maqueta-m3.md.
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AppButton, AppDrawer, AppIcon, AppToastHost],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly abierto = signal(false);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

  protected alternar(): void {
    this.abierto.set(!this.abierto());
  }

  protected onAbiertoChange(valor: boolean): void {
    this.abierto.set(valor);
    if (!valor) {
      this.botonMenu()?.nativeElement.focus();
    }
  }
}
