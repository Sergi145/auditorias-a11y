import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppButton } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import { AppFooter } from '../ui/footer';
import { AppIcon } from '../ui/icon';
import { AppSkipLink } from '../ui/skip-link';
import { AppToastHost } from '../ui/toast';

// Shell de navegación — top bar + drawer lateral, ver
// specs/04-rediseno-tailwind.md. Sustituye el shell M3 de
// specs/02-maqueta-m3.md.
@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AppButton,
    AppDrawer,
    AppFooter,
    AppIcon,
    AppSkipLink,
    AppToastHost,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

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
    // llegar al contenido nuevo. Se salta la carga inicial de la app (id 1)
    // porque ahí el foco inicial del navegador ya es correcto — pero no la
    // navegación que crea el shell al venir de la bienvenida, que vive fuera
    // de él: antes `skip(1)` se saltaba justo esa y el foco se quedaba en
    // <body> (specs/22-informe-ux.md P2). Se enfoca tras pintar, porque en
    // esa primera navegación #contenido aún no existe.
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        filter((evento) => evento.id > 1),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        afterNextRender(() => this.contenido()?.nativeElement.focus(), {
          injector: this.injector,
        }),
      );
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
