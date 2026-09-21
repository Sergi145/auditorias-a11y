import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon } from '../../../shared/ui/icon';
import { FUNCIONALIDADES } from '../contenido-publico';

// Vista pública «Funcionalidades» — specs/24-vistas-publicas.md. Detalle de
// las mismas funcionalidades que resume la landing. Un único CTA hacia la
// app, al final (la regla de no repetir el CTA es por página).
@Component({
  selector: 'app-funcionalidades',
  imports: [RouterLink, AppButton, AppIcon],
  templateUrl: './funcionalidades.html',
})
export class Funcionalidades {
  protected readonly funcionalidades = FUNCIONALIDADES;
}
