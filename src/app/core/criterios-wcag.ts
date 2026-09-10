import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database';
import { CATALOGO_WCAG_2_2 } from './wcag-catalogo';
import type { CriterioWCAG } from './models';

// Catálogo real (no mock) de criterios WCAG 2.2 A/AA — ver
// specs/03-catalogo-wcag.md. Se consulta de forma síncrona desde el array
// en memoria (es un dataset estático que no cambia en tiempo de ejecución)
// y, en paralelo, se siembra en la tabla `criteriosWCAG` de Dexie para que
// quede realmente persistido y disponible para rebanadas futuras que sí
// necesiten consultarlo desde IndexedDB (ej. 10-escaneo-axe).
@Injectable({ providedIn: 'root' })
export class CriteriosWcagService {
  private readonly database = inject(DatabaseService);

  constructor() {
    void this.sembrarCatalogo();
  }

  private async sembrarCatalogo(): Promise<void> {
    const total = await this.database.db.criteriosWCAG.count();
    if (total === 0) {
      await this.database.db.criteriosWCAG.bulkPut(CATALOGO_WCAG_2_2);
    }
  }

  todos(): CriterioWCAG[] {
    return CATALOGO_WCAG_2_2;
  }

  porCodigo(codigo: string): CriterioWCAG | undefined {
    return CATALOGO_WCAG_2_2.find((criterio) => criterio.codigo === codigo);
  }
}
