import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { Hallazgo } from './models';

// Persistencia real de Hallazgo sobre Dexie — ver specs/06-checklist-manual.md.
// Varios hallazgos pueden colgar del mismo Resultado (mismo criterio en la
// misma página); no confundir con HallazgoPlantilla (biblioteca reutilizable,
// sigue mock hasta 08-biblioteca-hallazgos).
@Injectable({ providedIn: 'root' })
export class HallazgosService {
  private readonly database = inject(DatabaseService);

  // Todos los hallazgos de todos los resultados de una página, para el
  // collapse por fila de pagina-checklist. liveQuery envuelve las dos
  // consultas dependientes (resultados de la página → hallazgos de esos
  // resultados) para que se recalcule ante un cambio en cualquiera de las
  // dos tablas — patrón recomendado por Dexie para lecturas reactivas
  // derivadas de más de una tabla.
  dePagina$(paginaId: number): Observable<Hallazgo[]> {
    return from(
      liveQuery(async () => {
        // `primaryKeys()` tipa la clave primaria como `number | undefined`
        // porque `Resultado.id` es opcional en la interfaz (se asigna al
        // guardar, no al crear) — un resultado ya persistido siempre tiene id.
        const resultadoIds = (await this.database.db.resultados
          .where('pagina_id')
          .equals(paginaId)
          .primaryKeys()) as number[];
        if (resultadoIds.length === 0) return [];
        return this.database.db.hallazgos.where('resultado_id').anyOf(resultadoIds).toArray();
      }),
    );
  }

  deResultado$(resultadoId: number): Observable<Hallazgo[]> {
    return from(
      liveQuery(() => this.database.db.hallazgos.where('resultado_id').equals(resultadoId).toArray()),
    );
  }

  async crear(datos: Omit<Hallazgo, 'id' | 'fecha_creacion'>): Promise<number> {
    const id = await this.database.db.hallazgos.add({
      ...datos,
      fecha_creacion: new Date().toISOString().slice(0, 10),
    });
    return id!;
  }

  async actualizar(
    id: number,
    cambios: Partial<Omit<Hallazgo, 'id' | 'resultado_id' | 'fecha_creacion'>>,
  ): Promise<void> {
    await this.database.db.hallazgos.update(id, cambios);
  }

  async eliminar(id: number): Promise<void> {
    await this.database.db.hallazgos.delete(id);
  }
}
