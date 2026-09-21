import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon } from '../../../shared/ui/icon';
import { COMPROMISOS } from '../contenido-publico';

// Vista pública «Accesibilidad» — declaración de accesibilidad de la propia
// app (specs/24-vistas-publicas.md). La fecha es texto fijo: cualquier spec
// que resuelva una de las limitaciones conocidas actualiza esta declaración
// y su fecha en el mismo PR.
@Component({
  selector: 'app-accesibilidad',
  imports: [RouterLink, AppButton, AppIcon],
  templateUrl: './accesibilidad.html',
})
export class Accesibilidad {
  protected readonly compromisos = COMPROMISOS;
}
