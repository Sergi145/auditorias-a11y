import type { CanDeactivateFn } from '@angular/router';

export interface ConSalidaProtegida {
  // true si se puede salir ya; si no, la promesa de la respuesta del usuario.
  puedeSalir(destino: string): boolean | Promise<boolean>;
}

// Pregunta antes de salir de la revisión de un criterio con un hallazgo a
// medio redactar — ver specs/22-informe-ux.md P8. La decisión (y el modal)
// la toma el propio componente: este guard se carga con las rutas y así no
// arrastra el modal de confirmación al bundle inicial.
export const confirmarSalidaSinGuardar: CanDeactivateFn<ConSalidaProtegida> = (
  componente,
  _ruta,
  _estadoActual,
  siguiente,
) => componente.puedeSalir(siguiente.url);
