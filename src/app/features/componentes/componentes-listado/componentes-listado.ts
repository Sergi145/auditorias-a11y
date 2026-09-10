import { Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MockDataService } from '../../../core/mock-data';
import type { Componente } from '../../../core/models';

// Pantalla 10 de specs/02-maqueta-m3.md: catálogo de componentes (Bootstrap
// + propios) usado para clasificar hallazgos — solo lectura por ahora.
@Component({
  selector: 'app-componentes-listado',
  imports: [MatChipsModule],
  templateUrl: './componentes-listado.html',
  styleUrl: './componentes-listado.scss',
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
