import { Component, inject } from '@angular/core';
import { MockDataService } from '../../../core/mock-data';
import type { Componente } from '../../../core/models';
import { AppChip } from '../../../shared/ui/chip';

// Pantalla 10 de specs/02-maqueta-m3.md: catálogo de componentes (Bootstrap
// + propios) usado para clasificar hallazgos — solo lectura por ahora.
@Component({
  selector: 'app-componentes-listado',
  imports: [AppChip],
  templateUrl: './componentes-listado.html',
})
export class ComponentesListado {
  private readonly mockData = inject(MockDataService);

  protected readonly bootstrap: Componente[] = this.mockData
    .componentes()
    .filter((componente) => componente.origen === 'bootstrap');

  protected readonly personalizados: Componente[] = this.mockData
    .componentes()
    .filter((componente) => componente.origen === 'personalizado');
}
