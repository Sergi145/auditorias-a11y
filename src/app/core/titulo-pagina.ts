import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const NOMBRE_APP = 'Auditorías A11y';

// Título de la pestaña por pantalla (WCAG 2.4.2): el `title` de la ruta
// seguido del nombre de la app, para distinguir pestañas y que el lector de
// pantalla anuncie en qué pantalla se está — antes era siempre «Auditorías
// A11y», ver specs/22-informe-ux.md P5.
@Injectable({ providedIn: 'root' })
export class TituloPagina extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const titulo = this.buildTitle(snapshot);
    this.title.setTitle(titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP);
  }
}
