import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { Auditoria, EstadoAuditoria } from './models';

// Persistencia real de Auditoria sobre Dexie — ver specs/05-auditorias-paginas.md.
// Lectura reactiva con liveQuery (se recalcula sola tras cualquier
// crear/actualizar/eliminar, en esta pestaña o en otra) envuelta en un
// Observable de rxjs para poder combinarla con otras fuentes reactivas
// (ej. el progreso por auditoría, que depende también de PaginasService).
@Injectable({ providedIn: 'root' })
export class AuditoriasService {
  private readonly database = inject(DatabaseService);

  todas$(): Observable<Auditoria[]> {
    return from(liveQuery(() => this.database.db.auditorias.toArray()));
  }

  porId$(id: number): Observable<Auditoria | undefined> {
    return from(liveQuery(() => this.database.db.auditorias.get(id)));
  }

  async crear(datos: Omit<Auditoria, 'id'>): Promise<number> {
    // `add()` de Dexie infiere el tipo de retorno como `number | undefined`
    // porque `Auditoria.id` es opcional en la interfaz (se asigna al leer,
    // no al crear) — el id devuelto tras un `add()` siempre existe.
    const id = await this.database.db.auditorias.add(datos);
    return id!;
  }

  async actualizar(id: number, cambios: Partial<Omit<Auditoria, 'id'>>): Promise<void> {
    await this.database.db.auditorias.update(id, cambios);
  }

  async cambiarEstado(id: number, estado: EstadoAuditoria): Promise<void> {
    await this.database.db.auditorias.update(id, { estado });
  }

  async eliminar(id: number): Promise<void> {
    const { db } = this.database;
    await db.transaction('rw', db.auditorias, db.paginas, async () => {
      await db.paginas.where('auditoria_id').equals(id).delete();
      await db.auditorias.delete(id);
    });
  }
}
