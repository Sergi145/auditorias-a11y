import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, skip } from 'rxjs';
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
  private readonly router = inject(Router);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly abierto = signal(false);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  private readonly contenido = viewChild<ElementRef<HTMLElement>>('contenido');

  constructor() {
    // Al navegar entre secciones el enlace activado desaparece del DOM (lo
    // sustituye la nueva ruta), así que el navegador devuelve el foco a
    // <body>: sin esto, Tab vuelve a recorrer el nav lateral entero antes de
    // llegar al contenido nuevo. Se salta la primera navegación (carga
    // inicial) porque ahí el foco inicial del navegador ya es correcto.
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.contenido()?.nativeElement.focus());
  }

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
