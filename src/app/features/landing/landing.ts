import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AppButton } from '../../shared/ui/button';
import { AppChip } from '../../shared/ui/chip';
import { AppDrawer } from '../../shared/ui/drawer';
import { AppIcon, type IconName } from '../../shared/ui/icon';
import { AppProgressBar } from '../../shared/ui/progress-bar';
import { AppSkipLink } from '../../shared/ui/skip-link';

interface Funcionalidad {
  icono: IconName;
  titulo: string;
  descripcion: string;
}

interface Paso {
  titulo: string;
  descripcion: string;
}

interface FilaEjemplo {
  icono: IconName;
  etiqueta: string;
  color: 'critica' | 'media' | 'baja';
  criterio: string;
  severidad: 'alta' | 'media' | null;
}

// Landing pública — única puerta de entrada de la app (raíz '/', ver
// app.routes.ts). Vive fuera del shell interno a propósito: es una página
// de una sola pantalla larga para quien todavía no audita nada, no una
// vista de trabajo con navegación lateral persistente.
//
// El único control de toda la página que navega a la app de verdad es el
// CTA del hero (routerLink a "auditorias/nueva"). No se repite en la
// cabecera ni al final: varios botones que hacen exactamente lo mismo es
// el mismo problema de accesibilidad/usabilidad que varios botones
// "Enviar" en un formulario — compiten por la atención en vez de guiarla.
@Component({
  selector: 'app-landing',
  imports: [RouterLink, AppButton, AppChip, AppDrawer, AppIcon, AppProgressBar, AppSkipLink],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly menuAbierto = signal(false);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

  protected alternarMenu(): void {
    this.menuAbierto.set(!this.menuAbierto());
  }

  protected onMenuAbiertoChange(valor: boolean): void {
    this.menuAbierto.set(valor);
    if (!valor) {
      this.botonMenu()?.nativeElement.focus();
    }
  }

  protected readonly filasEjemplo: FilaEjemplo[] = [
    {
      icono: 'x-circle',
      etiqueta: 'Falla',
      color: 'critica',
      criterio: '1.4.3 Contraste (Mínimo)',
      severidad: 'alta',
    },
    { icono: 'check-circle', etiqueta: 'Pasa', color: 'baja', criterio: '2.4.7 Foco visible', severidad: null },
    {
      icono: 'help-circle',
      etiqueta: 'Por revisar',
      color: 'media',
      criterio: '4.1.2 Nombre, función, valor',
      severidad: null,
    },
    {
      icono: 'x-circle',
      etiqueta: 'Falla',
      color: 'critica',
      criterio: '1.1.1 Contenido no textual',
      severidad: 'media',
    },
  ];

  protected readonly funcionalidades: Funcionalidad[] = [
    {
      icono: 'search',
      titulo: 'Escaneo automático',
      descripcion:
        'Pega el HTML o una URL y axe-core pre-rellena el checklist marcando qué falla y qué toca revisar a mano.',
    },
    {
      icono: 'clipboard-check',
      titulo: 'Checklist WCAG 2.2 A/AA',
      descripcion:
        'Estado, severidad, notas y evidencia por criterio y por página, filtrable por nivel, categoría y severidad.',
    },
    {
      icono: 'book',
      titulo: 'Biblioteca de hallazgos',
      descripcion: 'Guarda la redacción de un hallazgo una vez y reutilízala cada vez que aparezca el mismo problema.',
    },
    {
      icono: 'grid',
      titulo: 'Catálogo de componentes',
      descripcion:
        'Clasifica cada hallazgo por el componente afectado: catálogo de Bootstrap incluido, ampliable con los tuyos.',
    },
    {
      icono: 'document',
      titulo: 'Evidencia vinculada',
      descripcion:
        'Adjunta capturas por hallazgo, no por criterio entero, para documentar exactamente lo que falla y dónde.',
    },
    {
      icono: 'download',
      titulo: 'Exportación a Excel y PDF',
      descripcion: 'Genera el informe final sin maquetar nada a mano, con la misma estructura que ya conoces.',
    },
  ];

  protected readonly pasos: Paso[] = [
    { titulo: 'Crea la auditoría', descripcion: 'Nombre, cliente y estándar objetivo — nivel A o AA.' },
    {
      titulo: 'Añade páginas o componentes',
      descripcion: 'Todo lo que entra en el alcance de esta auditoría, en una misma vista.',
    },
    {
      titulo: 'Lanza el escaneo automático',
      descripcion: 'HTML pegado o URL en vivo: axe-core pre-rellena el checklist con lo que ya puede detectar.',
    },
    {
      titulo: 'Revisa cada criterio a mano',
      descripcion:
        'Confirma o corrige el resultado automático, añade severidad, notas y capturas — reutilizando hallazgos guardados cuando aplique.',
    },
    {
      titulo: 'Consulta el panel de progreso',
      descripcion: '% completado y fallos por severidad y categoría, actualizados en tiempo real.',
    },
    {
      titulo: 'Exporta el informe',
      descripcion: 'Excel y PDF listos para entregar, con la misma estructura que ya conoce tu cliente.',
    },
  ];

  protected readonly compromisos: string[] = [
    'Contraste de color AA en toda la interfaz, sin excepciones.',
    'Foco visible en cada elemento interactivo — nunca indicado solo con color.',
    'Navegable al 100% por teclado, con el foco atrapado donde corresponde.',
    'Compatible con lectores de pantalla: roles y anuncios ARIA correctos.',
    'Auditada contra sí misma con axe antes de cada entrega.',
  ];
}
