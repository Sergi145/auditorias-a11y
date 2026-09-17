import { Component, DestroyRef, inject, input } from '@angular/core';
import type { Evidencia } from '../../core/models';
import { AppIcon } from '../../shared/ui/icon';

// Lista de miniaturas de las imágenes de evidencia de UN hallazgo, en solo
// lectura — ver specs/17-evidencias-en-checklist.md. La comparten la tarjeta
// de lectura de criterio-revision (specs/16-evidencia-imagen-hallazgo.md) y
// el collapse de hallazgos de pagina-checklist, para no mantener por
// duplicado el `alt`, el aviso de "pestaña nueva" y la revocación de las
// Blob URL. Editar o quitar evidencias sigue siendo cosa de
// EvidenciasEditor, en criterio-revision.
@Component({
  selector: 'app-evidencias-miniaturas',
  imports: [AppIcon],
  templateUrl: './evidencias-miniaturas.html',
})
export class EvidenciasMiniaturas {
  readonly evidencias = input.required<Evidencia[]>();

  // Una URL de objeto por Evidencia, cacheada para que cada repintado no
  // cree una nueva (y la deje sin revocar). Se revocan todas al destruir el
  // componente: mientras viva, sus <img> y <a> siguen necesitándolas.
  private readonly urlPorEvidencia = new Map<number, string>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.urlPorEvidencia.values()) URL.revokeObjectURL(url);
      this.urlPorEvidencia.clear();
    });
  }

  protected urlDeEvidencia(evidencia: Evidencia): string {
    let url = this.urlPorEvidencia.get(evidencia.id!);
    if (!url) {
      url = URL.createObjectURL(evidencia.archivo ?? new Blob());
      this.urlPorEvidencia.set(evidencia.id!, url);
    }
    return url;
  }
}
