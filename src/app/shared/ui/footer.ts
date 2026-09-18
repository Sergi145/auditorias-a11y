import { Component } from '@angular/core';

// Pie de página del shell interno (Auditorías/Biblioteca/Componentes)
// — ver specs/15-pie-de-pagina.md. Va al final del flujo del contenido:
// el contenido lo empuja hacia abajo y, cuando no llega a llenar el
// viewport, el layout flex del shell lo mantiene pegado al borde inferior
// (patrón "sticky footer"). Distinto del pie de la landing
// (specs/04-rediseno-tailwind.md), que sí lleva navegación: este es solo
// una franja de copyright.
@Component({
  selector: 'app-footer',
  template: `
    <footer class="bg-violet-700 py-2.5 text-center">
      <p class="m-0 text-xs text-white">© {{ anio }} Auditorías A11y. Todos los derechos reservados.</p>
    </footer>
  `,
})
export class AppFooter {
  protected readonly anio = new Date().getFullYear();
}
