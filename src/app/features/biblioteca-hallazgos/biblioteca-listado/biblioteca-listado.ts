import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/mock-data';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';

// Pantalla 8 de specs/02-maqueta-m3.md: listado de hallazgos reutilizables
// de la biblioteca — solo lectura, sin sugerencias ni guardado reales.
@Component({
  selector: 'app-biblioteca-listado',
  imports: [RouterLink, AppCard, AppChip],
  templateUrl: './biblioteca-listado.html',
})
export class BibliotecaListado {
  private readonly mockData = inject(MockDataService);

  protected readonly hallazgos = this.mockData.hallazgosPlantilla();

  protected componenteDe(id: number | undefined) {
    return id === undefined ? undefined : this.mockData.componente(id);
  }
}
