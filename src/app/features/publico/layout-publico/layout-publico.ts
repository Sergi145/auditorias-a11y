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
import { AppButton } from '../../../shared/ui/button';
import { AppDrawer } from '../../../shared/ui/drawer';
import { AppIcon } from '../../../shared/ui/icon';
import { AppSkipLink } from '../../../shared/ui/skip-link';

// Rutas que pinta este layout (ver app.routes.ts).
const RUTAS_PUBLICAS = ['/bienvenida', '/funcionalidades', '/como-funciona', '/accesibilidad'];

// Layout de la zona pública (bienvenida, funcionalidades, cómo funciona y
// accesibilidad) — specs/24-vistas-publicas.md. Vive fuera del shell interno
// a propósito: son páginas para quien todavía no audita nada, no vistas de
// trabajo con navegación lateral persistente. Cabecera, menú móvil (spec 10)
// y pie están aquí una sola vez para las cuatro páginas.
@Component({
  selector: 'app-layout-publico',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AppButton, AppDrawer, AppIcon, AppSkipLink],
  templateUrl: './layout-publico.html',
})
export class LayoutPublico {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  // Las tres vistas públicas, en el mismo orden en cabecera, menú móvil y pie.
  // El enlace de la vista actual lleva aria-current="page" y se distingue con
  // subrayado y peso, no solo con color (WCAG 1.4.1).
  protected readonly enlaces = [
    { ruta: '/funcionalidades', texto: 'Funcionalidades' },
    { ruta: '/como-funciona', texto: 'Cómo funciona' },
    { ruta: '/accesibilidad', texto: 'Accesibilidad' },
  ];

  protected readonly menuAbierto = signal(false);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  private readonly contenido = viewChild<ElementRef<HTMLElement>>('contenido');

  private rutaAnterior: string | null = null;

  constructor() {
    // Mismo patrón que el Shell (specs/22-informe-ux.md P2): al cambiar de
    // vista pública el enlace pulsado puede desaparecer (menú móvil) y el
    // foco caería en <body>, así que se lleva a #contenido tras pintar. Se
    // salta la carga inicial (id 1), las navegaciones que solo cambian query
    // params o fragmento, y las que salen hacia el Shell, que ya enfoca su
    // propio #contenido.
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((evento) => {
        const ruta = evento.urlAfterRedirects.split(/[?#]/)[0];
        const cambiaDeRuta = ruta !== this.rutaAnterior;
        this.rutaAnterior = ruta;
        if (evento.id === 1 || !cambiaDeRuta || !RUTAS_PUBLICAS.includes(ruta)) return;

        afterNextRender(() => this.contenido()?.nativeElement.focus(), {
          injector: this.injector,
        });
      });
  }

  protected alternarMenu(): void {
    this.menuAbierto.set(!this.menuAbierto());
  }

  protected onMenuAbiertoChange(valor: boolean): void {
    this.menuAbierto.set(valor);
    if (!valor) {
      this.botonMenu()?.nativeElement.focus();
    }
  }
}
