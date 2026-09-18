import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { HallazgoPlantilla } from './models';

// Persistencia real de HallazgoPlantilla sobre Dexie — ver
// specs/08-biblioteca-hallazgos.md. Sin sembrado (a diferencia de
// CriteriosWcagService y ComponentesService): la biblioteca nace vacía y
// crece solo con los hallazgos que el propio usuario decide guardar como
// reutilizables desde criterio-revision.
@Injectable({ providedIn: 'root' })
export class HallazgosPlantillaService {
  private readonly database = inject(DatabaseService);

  todos$(): Observable<HallazgoPlantilla[]> {
    return from(liveQuery(() => this.database.db.hallazgosPlantilla.toArray()));
  }

  // Mismo comportamiento que el mock que sustituye
  // (`MockDataService.hallazgosSugeridosPara`): sin componenteId se sugieren
  // todas las plantillas del criterio; con componenteId solo las que tengan
  // asignado exactamente ese componente (las plantillas sin componente no
  // cuentan como comodín una vez hay un componente elegido).
  sugeridos$(criterioCodigo: string, componenteId?: number): Observable<HallazgoPlantilla[]> {
    return from(
      liveQuery(() =>
        this.database.db.hallazgosPlantilla
          .where('criterio_codigo')
          .equals(criterioCodigo)
          .filter((plantilla) => componenteId === undefined || plantilla.componente_id === componenteId)
          .toArray(),
      ),
    );
  }

  // Lectura puntual (no reactiva) de una plantilla: la usa criterio-revision
  // al volver de elegir una redacción en /biblioteca (?plantilla=ID) — ver
  // specs/21-elegir-desde-biblioteca.md.
  porId(id: number): Promise<HallazgoPlantilla | undefined> {
    return this.database.db.hallazgosPlantilla.get(id);
  }

  async crear(datos: Omit<HallazgoPlantilla, 'id' | 'veces_usado' | 'fecha_creacion'>): Promise<number> {
    const id = await this.database.db.hallazgosPlantilla.add({
      ...datos,
      veces_usado: 0,
      fecha_creacion: new Date().toISOString().slice(0, 10),
    });
    return id!;
  }

  async actualizar(
    id: number,
    cambios: Partial<Omit<HallazgoPlantilla, 'id' | 'veces_usado' | 'fecha_creacion'>>,
  ): Promise<void> {
    await this.database.db.hallazgosPlantilla.update(id, cambios);
  }

  async eliminar(id: number): Promise<void> {
    await this.database.db.hallazgosPlantilla.delete(id);
  }

  async incrementarUso(id: number): Promise<void> {
    const plantilla = await this.database.db.hallazgosPlantilla.get(id);
    if (!plantilla) return;
    await this.database.db.hallazgosPlantilla.update(id, { veces_usado: plantilla.veces_usado + 1 });
  }
}
