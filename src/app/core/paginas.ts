import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { Pagina } from './models';

// Persistencia real de Pagina sobre Dexie — ver specs/05-auditorias-paginas.md.
// Mismo patrón que AuditoriasService: lectura reactiva con liveQuery
// envuelta en un Observable de rxjs.
@Injectable({ providedIn: 'root' })
export class PaginasService {
  private readonly database = inject(DatabaseService);

  deAuditoria$(auditoriaId: number): Observable<Pagina[]> {
    return from(
      liveQuery(() => this.database.db.paginas.where('auditoria_id').equals(auditoriaId).toArray()),
    );
  }

  porId$(id: number): Observable<Pagina | undefined> {
    return from(liveQuery(() => this.database.db.paginas.get(id)));
  }

  async crear(datos: Omit<Pagina, 'id'>): Promise<number> {
    // Ver el comentario equivalente en AuditoriasService.crear(): el id
    // devuelto tras un add() siempre existe, aunque `Pagina.id` sea opcional
    // en la interfaz.
    const id = await this.database.db.paginas.add(datos);
    return id!;
  }

  async actualizar(id: number, cambios: Partial<Omit<Pagina, 'id' | 'auditoria_id'>>): Promise<void> {
    await this.database.db.paginas.update(id, cambios);
  }

  async eliminar(id: number): Promise<void> {
    await this.database.db.paginas.delete(id);
  }
}
