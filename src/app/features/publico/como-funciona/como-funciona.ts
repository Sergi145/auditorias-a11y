import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppButton } from '../../../shared/ui/button';
import { PASOS } from '../contenido-publico';

// Vista pública «Cómo funciona» — specs/24-vistas-publicas.md. Los mismos
// pasos que resume la landing, con la pantalla que se usa en cada uno y lo
// que se obtiene. Un único CTA hacia la app, al final.
@Component({
  selector: 'app-como-funciona',
  imports: [RouterLink, AppButton],
  templateUrl: './como-funciona.html',
})
export class ComoFunciona {
  protected readonly pasos = PASOS;
}
