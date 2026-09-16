import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ComponentesService } from '../../../core/componentes';
import { MockDataService } from '../../../core/mock-data';
import type { Componente } from '../../../core/models';
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
  private readonly componentesService = inject(ComponentesService);

  protected readonly hallazgos = this.mockData.hallazgosPlantilla();

  private readonly componentes = toSignal(this.componentesService.todos$(), {
    initialValue: [] as Componente[],
  });

  protected componenteDe(id: number | undefined): Componente | undefined {
    return id === undefined ? undefined : this.componentes().find((componente) => componente.id === id);
  }
}
