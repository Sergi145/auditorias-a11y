import { Component, computed, input } from '@angular/core';

export type SkipLinkVariante = 'fijo' | 'flotante';

const BASE =
  'sr-only focus:not-sr-only focus:rounded focus:bg-violet-50 focus:px-4 focus:py-2 focus:text-slate-900 focus:outline focus:outline-2 focus:outline-violet-700';

// fijo: overlay fijo respecto al viewport (siempre arriba a la izquierda,
// sin importar el scroll) — para enlaces de página completa ("saltar al
// contenido principal") que deben verse por encima de todo, cabecera
// incluida. flotante: overlay posicionado sobre su sitio en el documento
// (el contenedor inmediato debe tener `position: relative`) — para
// enlaces que saltan un bloque puntual dentro de una pantalla: no
// desplazan el contenido de alrededor al aparecer, pero sí quedan junto a
// él en vez de saltar a la esquina del viewport.
const VARIANTES: Record<SkipLinkVariante, string> = {
  fijo: `${BASE} focus:fixed focus:top-2 focus:left-2 focus:z-[1000]`,
  // Centrado verticalmente y pegado al borde derecho de su contenedor
  // (`position: relative`, normalmente el mismo encabezado al que
  // acompaña): flota sobre el hueco en blanco a la derecha de un título
  // corto en vez de superponerse a texto, sin reservar hueco propio en el
  // flujo (el contenedor no crece por su culpa).
  flotante: `${BASE} focus:absolute focus:top-1/2 focus:right-0 focus:z-10 focus:-translate-y-1/2`,
};

// Enlace "saltar a…": oculto hasta recibir foco (visible solo al navegar
// por teclado), para saltar bloques de contenido repetitivo — ver
// specs/04-rediseno-tailwind.md (shell y landing, "saltar al contenido
// principal") y specs/07-catalogo-componentes.md (lista de componentes
// predefinidos/personalizados).
//
// El foco se mueve al destino explícitamente por código, con
// preventDefault() sobre la navegación nativa al fragmento: dejar que el
// navegador la gestione también compite con nuestro focus() y en algunos
// navegadores termina devolviendo el foco a <body>. Mismo patrón que el
// foco tras navegación en Shell (src/app/shared/shell/shell.ts): mover el
// foco por código en vez de confiar en el comportamiento por defecto del
// navegador.
@Component({
  selector: 'app-skip-link',
  template: `
    <a [href]="destino()" [class]="clases()" (click)="enfocarDestino($event)">
      <ng-content />
    </a>
  `,
})
export class AppSkipLink {
  readonly destino = input.required<string>();
  readonly variante = input<SkipLinkVariante>('fijo');

  protected readonly clases = computed(() => VARIANTES[this.variante()]);

  protected enfocarDestino(event: Event): void {
    const id = this.destino().replace(/^#/, '');
    const elemento = document.getElementById(id);
    if (!elemento) return;

    event.preventDefault();
    history.pushState(null, '', this.destino());
    elemento.focus();
    elemento.scrollIntoView();
  }
}
