import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, type FormArray } from '@angular/forms';
import { validarImagenEvidencia, type MotivoRechazoEvidencia } from '../../../core/evidencias';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';

let siguienteId = 0;

export type FormularioEvidencia = FormGroup<{
  id: FormControl<number | null>;
  archivo: FormControl<Blob>;
  descripcion: FormControl<string>;
}>;

// `id: null` para una imagen recién elegida, todavía sin persistir — ver
// specs/16-evidencia-imagen-hallazgo.md.
export function crearControlEvidencia(valores: {
  id: number | null;
  archivo: Blob;
  descripcion: string;
}): FormularioEvidencia {
  return new FormGroup({
    id: new FormControl<number | null>(valores.id),
    archivo: new FormControl<Blob>(valores.archivo, { nonNullable: true }),
    descripcion: new FormControl<string>(valores.descripcion, {
      nonNullable: true,
      validators: Validators.required,
    }),
  });
}

interface ArchivoRechazado {
  nombre: string;
  motivo: MotivoRechazoEvidencia;
}

const MENSAJE_MOTIVO: Record<MotivoRechazoEvidencia, string> = {
  'formato-no-admitido': 'formato no admitido',
  'tamano-excedido': 'supera los 5 MB',
};

// Adjuntar, describir y quitar imágenes de evidencia de un hallazgo — ver
// specs/16-evidencia-imagen-hallazgo.md. "Adjuntar imagen" es el único
// punto de interacción, tanto para teclado como para lector de pantalla:
// abre un <input type="file"> oculto y fuera del orden de tabulación, en
// vez de depender de un <label> con aspecto de botón (el foco y lo que
// anuncia el lector de pantalla varían entre navegadores en ese patrón).
@Component({
  selector: 'app-evidencias-editor',
  imports: [ReactiveFormsModule, AppButton, AppCard, AppFormField, AppIcon, AppInput],
  templateUrl: './evidencias-editor.html',
})
export class EvidenciasEditor {
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly evidencias = input.required<FormArray<FormularioEvidencia>>();

  protected readonly errores = signal<ArchivoRechazado[]>([]);

  protected readonly ayudaId = `evidencias-ayuda-${siguienteId++}`;
  protected readonly erroresId = `evidencias-errores-${siguienteId++}`;

  // Enlaza el botón "Adjuntar imagen" con el texto de ayuda y, si los hay,
  // con la lista de archivos rechazados — ambos con aria-describedby.
  protected readonly describedBy = computed(() =>
    this.errores().length > 0 ? `${this.ayudaId} ${this.erroresId}` : this.ayudaId,
  );

  private readonly inputArchivo = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');
  private readonly botonAdjuntar = viewChild<ElementRef<HTMLButtonElement>>('botonAdjuntar');
  private readonly botonesQuitar = viewChildren<ElementRef<HTMLButtonElement>>('botonQuitar');
  private readonly camposDescripcion = viewChildren<ElementRef<HTMLInputElement>>('descripcionInput');

  // Una URL de objeto por Blob, para no recrearla en cada ciclo de
  // detección de cambios; se revoca al quitar esa imagen o al destruir el
  // componente.
  private readonly urlPorArchivo = new Map<Blob, string>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.urlPorArchivo.values()) URL.revokeObjectURL(url);
      this.urlPorArchivo.clear();
    });
  }

  protected urlDe(archivo: Blob): string {
    let url = this.urlPorArchivo.get(archivo);
    if (!url) {
      url = URL.createObjectURL(archivo);
      this.urlPorArchivo.set(archivo, url);
    }
    return url;
  }

  protected nombreArchivo(control: FormularioEvidencia): string {
    const archivo = control.controls.archivo.value;
    return archivo instanceof File ? archivo.name : 'Imagen guardada';
  }

  protected mensajeMotivo(motivo: MotivoRechazoEvidencia): string {
    return MENSAJE_MOTIVO[motivo];
  }

  protected abrirSelector(): void {
    this.inputArchivo()?.nativeElement.click();
  }

  protected onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    // Permite volver a elegir el mismo archivo en la siguiente selección.
    input.value = '';

    const indiceInicial = this.evidencias().length;
    const rechazados: ArchivoRechazado[] = [];
    let aceptados = 0;

    for (const archivo of archivos) {
      const motivo = validarImagenEvidencia(archivo);
      if (motivo) {
        rechazados.push({ nombre: archivo.name, motivo });
        continue;
      }
      this.evidencias().push(crearControlEvidencia({ id: null, archivo, descripcion: '' }));
      aceptados++;
    }

    this.errores.set(rechazados);
    this.anunciarResultado(aceptados, rechazados);

    if (aceptados > 0) {
      // El foco pasa a la descripción de la primera imagen añadida en esta
      // selección — hay que forzar la detección de cambios para que el
      // <input> de esa fila ya exista en el DOM antes de enfocarlo.
      this.cdr.detectChanges();
      this.camposDescripcion()[indiceInicial]?.nativeElement.focus();
    }
  }

  private anunciarResultado(aceptados: number, rechazados: ArchivoRechazado[]): void {
    const partes: string[] = [];
    if (aceptados > 0) {
      partes.push(aceptados === 1 ? '1 imagen añadida.' : `${aceptados} imágenes añadidas.`);
    }
    if (rechazados.length > 0) {
      const detalle = rechazados.map((r) => `${r.nombre}, ${MENSAJE_MOTIVO[r.motivo]}`).join('; ');
      partes.push(
        rechazados.length === 1
          ? `1 archivo rechazado: ${detalle}.`
          : `${rechazados.length} archivos rechazados: ${detalle}.`,
      );
    }
    if (partes.length > 0) void this.liveAnnouncer.announce(partes.join(' '), 'polite');
  }

  protected quitar(index: number): void {
    const archivo = this.evidencias().at(index).controls.archivo.value;
    const url = this.urlPorArchivo.get(archivo);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlPorArchivo.delete(archivo);
    }

    this.evidencias().removeAt(index);
    void this.liveAnnouncer.announce('Imagen quitada.', 'polite');

    // El foco pasa a "Quitar" del siguiente elemento, al del anterior si
    // era el último, o a "Adjuntar imagen" si la lista queda vacía.
    this.cdr.detectChanges();
    const botones = this.botonesQuitar();
    if (botones.length === 0) {
      this.botonAdjuntar()?.nativeElement.focus();
    } else {
      botones[Math.min(index, botones.length - 1)].nativeElement.focus();
    }
  }
}
