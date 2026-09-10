import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { EstadoResultado, Resultado } from './models';

// Persistencia real de Resultado sobre Dexie — ver specs/06-checklist-manual.md.
// A diferencia de Auditoria/Pagina, un Resultado no se crea al mismo tiempo
// para los ~55 criterios de una página: solo existe una vez que el usuario
// guarda su primera revisión de ese criterio — por eso `guardar()` es un
// upsert (crea si no existe, actualiza si ya existe) en vez de un `crear()`
// separado.
@Injectable({ providedIn: 'root' })
export class ResultadosService {
  private readonly database = inject(DatabaseService);

  dePagina$(paginaId: number): Observable<Resultado[]> {
    return from(
      liveQuery(() => this.database.db.resultados.where('pagina_id').equals(paginaId).toArray()),
    );
  }

  porPaginaYCriterio$(paginaId: number, criterioCodigo: string): Observable<Resultado | undefined> {
    return from(
      liveQuery(() =>
        this.database.db.resultados
          .where({ pagina_id: paginaId, criterio_codigo: criterioCodigo })
          .first(),
      ),
    );
  }

  async guardar(
    paginaId: number,
    criterioCodigo: string,
    cambios: { estado: EstadoResultado; notas: string },
  ): Promise<number> {
    const existente = await this.database.db.resultados
      .where({ pagina_id: paginaId, criterio_codigo: criterioCodigo })
      .first();
    const fecha_revision = new Date().toISOString().slice(0, 10);

    if (existente) {
      await this.database.db.resultados.update(existente.id!, {
        estado: cambios.estado,
        notas: cambios.notas,
        origen: 'manual',
        fecha_revision,
      });
      return existente.id!;
    }

    const id = await this.database.db.resultados.add({
      pagina_id: paginaId,
      criterio_codigo: criterioCodigo,
      estado: cambios.estado,
      notas: cambios.notas,
      origen: 'manual',
      fecha_revision,
    });
    return id!;
  }
}
