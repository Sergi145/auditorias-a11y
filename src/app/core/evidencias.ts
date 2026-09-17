import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, type Observable } from 'rxjs';
import { DatabaseService } from './database';
import type { Evidencia } from './models';

// Formatos y tamaño máximo admitidos al adjuntar una imagen de evidencia a un
// hallazgo — ver specs/16-evidencia-imagen-hallazgo.md.
export const TIPOS_IMAGEN_EVIDENCIA = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const TAMANO_MAXIMO_EVIDENCIA = 5 * 1024 * 1024; // 5 MB

export type MotivoRechazoEvidencia = 'formato-no-admitido' | 'tamano-excedido';

// Función pura (sin Dexie ni Angular) para poder testearla de forma aislada
// y reutilizarla igual en el editor de evidencias.
export function validarImagenEvidencia(archivo: File): MotivoRechazoEvidencia | null {
  if (!TIPOS_IMAGEN_EVIDENCIA.includes(archivo.type as (typeof TIPOS_IMAGEN_EVIDENCIA)[number])) {
    return 'formato-no-admitido';
  }
  if (archivo.size > TAMANO_MAXIMO_EVIDENCIA) {
    return 'tamano-excedido';
  }
  return null;
}

// Cambios pendientes del editor de evidencias de un hallazgo, aplicados
// todos juntos al guardar — no se persisten tal cual, ver
// specs/16-evidencia-imagen-hallazgo.md.
export interface CambiosEvidencias {
  nuevas: { archivo: Blob; descripcion: string }[];
  actualizadas: { id: number; descripcion: string }[];
  eliminadas: number[];
}

// Persistencia real de Evidencia (imágenes de tipo 'captura') sobre Dexie —
// ver specs/16-evidencia-imagen-hallazgo.md. A diferencia de HallazgosService,
// no expone crear/actualizar/eliminar por separado: el editor de evidencias
// de criterio-revision acumula los cambios en memoria mientras se edita el
// hallazgo y los aplica de una sola vez con aplicarCambios(), a la vez que se
// guarda el propio hallazgo.
@Injectable({ providedIn: 'root' })
export class EvidenciasService {
  private readonly database = inject(DatabaseService);

  deHallazgos$(hallazgoIds: number[]): Observable<Evidencia[]> {
    return from(
      liveQuery(async () => {
        if (hallazgoIds.length === 0) return [];
        return this.database.db.evidencias.where('hallazgo_id').anyOf(hallazgoIds).toArray();
      }),
    );
  }

  async aplicarCambios(hallazgoId: number, cambios: CambiosEvidencias): Promise<void> {
    await this.database.db.transaction('rw', this.database.db.evidencias, async () => {
      for (const nueva of cambios.nuevas) {
        await this.database.db.evidencias.add({
          hallazgo_id: hallazgoId,
          tipo: 'captura',
          archivo: nueva.archivo,
          descripcion: nueva.descripcion,
        });
      }
      for (const actualizada of cambios.actualizadas) {
        await this.database.db.evidencias.update(actualizada.id, { descripcion: actualizada.descripcion });
      }
      if (cambios.eliminadas.length > 0) {
        await this.database.db.evidencias.bulkDelete(cambios.eliminadas);
      }
    });
  }
}
