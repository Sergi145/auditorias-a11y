import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppButton } from '../../shared/ui/button';
import { AppChip } from '../../shared/ui/chip';
import { AppIcon, type IconName } from '../../shared/ui/icon';
import { AppProgressBar } from '../../shared/ui/progress-bar';
import { COMPROMISOS, FUNCIONALIDADES, PASOS } from '../publico/contenido-publico';

interface FilaEjemplo {
  icono: IconName;
  etiqueta: string;
  color: 'critica' | 'media' | 'baja';
  criterio: string;
  severidad: 'alta' | 'media' | null;
}

// Landing pública — puerta de entrada de la app (raíz '/', ver
// app.routes.ts). Se pinta dentro de LayoutPublico, que pone la cabecera, el
// menú móvil y el pie (specs/24-vistas-publicas.md).
//
// El único control de toda la página que navega a la app de verdad es el
// CTA del hero (routerLink a "auditorias/nueva"). No se repite en la
// cabecera ni al final: varios botones que hacen exactamente lo mismo es
// el mismo problema de accesibilidad/usabilidad que varios botones
// "Enviar" en un formulario — compiten por la atención en vez de guiarla.
@Component({
  selector: 'app-landing',
  imports: [RouterLink, AppButton, AppChip, AppIcon, AppProgressBar],
  templateUrl: './landing.html',
})
export class Landing {
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

  protected readonly funcionalidades = FUNCIONALIDADES;
  protected readonly pasos = PASOS;
  protected readonly compromisos = COMPROMISOS;
}
