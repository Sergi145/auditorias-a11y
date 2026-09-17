import { Component } from '@angular/core';

// Pie de página fijo del shell interno (Auditorías/Biblioteca/Componentes)
// — ver specs/15-pie-de-pagina.md. Distinto del pie de la landing
// (specs/04-rediseno-tailwind.md), que no es fijo y sí lleva navegación:
// este es solo una franja de copyright siempre visible.
@Component({
  selector: 'app-footer',
  template: `
    <footer class="fixed inset-x-0 bottom-0 z-30 bg-violet-700 py-2.5 text-center">
      <p class="m-0 text-xs text-white">© {{ anio }} Auditorías A11y. Todos los derechos reservados.</p>
    </footer>
  `,
})
export class AppFooter {
  protected readonly anio = new Date().getFullYear();
}
