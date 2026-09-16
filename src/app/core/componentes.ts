import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { CATALOGO_COMPONENTES_BOOTSTRAP } from './componentes-catalogo';
import { DatabaseService } from './database';
import type { Componente } from './models';

// Persistencia real de Componente sobre Dexie — ver
// specs/07-catalogo-componentes.md. A diferencia de CriteriosWcagService
// (catálogo WCAG estático que se sirve desde un array en memoria), este
// catálogo es mutable desde la propia app (añadir, renombrar, ocultar,
// borrar), así que se sirve siempre desde la tabla `componentes` de Dexie,
// sembrada una única vez con el catálogo por defecto de Bootstrap.
@Injectable({ providedIn: 'root' })
export class ComponentesService {
  private readonly database = inject(DatabaseService);

  // Expuesto (en vez de disparado con `void` y olvidado) para que los tests
  // puedan esperar a que el sembrado inicial termine antes de comprobar el
  // contenido de la tabla — el resto de la app no necesita esperarlo porque
  // las lecturas son reactivas (liveQuery ya recalcula cuando el sembrado
  // añade filas).
  readonly catalogoListo: Promise<void> = this.sembrarCatalogo();

  private async sembrarCatalogo(): Promise<void> {
    const total = await this.database.db.componentes.count();
    if (total === 0) {
      await this.database.db.componentes.bulkPut(CATALOGO_COMPONENTES_BOOTSTRAP);
    }
  }

  todos$(): Observable<Componente[]> {
    return from(liveQuery(() => this.database.db.componentes.orderBy('nombre').toArray()));
  }

  visibles$(): Observable<Componente[]> {
    return from(
      liveQuery(() =>
        this.database.db.componentes.orderBy('nombre').filter((componente) => componente.visible).toArray(),
      ),
    );
  }

  async crear(nombre: string): Promise<number> {
    const id = await this.database.db.componentes.add({
      nombre,
      origen: 'personalizado',
      visible: true,
    });
    return id!;
  }

  async renombrar(id: number, nombre: string): Promise<void> {
    await this.database.db.componentes.update(id, { nombre });
  }

  async alternarVisible(id: number, visible: boolean): Promise<void> {
    await this.database.db.componentes.update(id, { visible });
  }

  async eliminar(id: number): Promise<void> {
    await this.database.db.componentes.delete(id);
  }
}
