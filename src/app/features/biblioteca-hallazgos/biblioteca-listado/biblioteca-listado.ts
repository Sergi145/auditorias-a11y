import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ComponentesService } from '../../../core/componentes';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { HallazgosPlantillaService } from '../../../core/hallazgos-plantilla';
import type { Componente, CriterioWCAG, HallazgoPlantilla } from '../../../core/models';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { ConfirmacionService } from '../../../shared/ui/confirmacion';
import { AppSelect } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

// Pantalla 8 de specs/02-maqueta-m3.md: listado de hallazgos reutilizables
// de la biblioteca. Datos y gestión reales desde
// specs/08-biblioteca-hallazgos.md: filtros por criterio/componente y
// eliminar (mismo patrón ConfirmacionService que auditorías/páginas/
// hallazgos/componentes — specs/19-modal-confirmacion.md).
@Component({
  selector: 'app-biblioteca-listado',
  imports: [RouterLink, AppButton, AppCard, AppChip, AppFormField, AppIcon, AppSelect],
  templateUrl: './biblioteca-listado.html',
})
export class BibliotecaListado {
  private readonly hallazgosPlantillaService = inject(HallazgosPlantillaService);
  private readonly componentesService = inject(ComponentesService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);

  protected readonly criterios: CriterioWCAG[] = this.criteriosWcag.todos();

  protected readonly componentes = toSignal(this.componentesService.todos$(), {
    initialValue: [] as Componente[],
  });

  protected readonly hallazgos = toSignal(this.hallazgosPlantillaService.todos$(), {
    initialValue: [] as HallazgoPlantilla[],
  });

  protected readonly filtroCriterio = signal<string | 'todos'>('todos');
  protected readonly filtroComponente = signal<number | 'todos'>('todos');

  protected readonly hallazgosFiltrados = computed(() =>
    this.hallazgos().filter((hallazgo) => {
      if (this.filtroCriterio() !== 'todos' && hallazgo.criterio_codigo !== this.filtroCriterio()) {
        return false;
      }
      if (this.filtroComponente() !== 'todos' && hallazgo.componente_id !== this.filtroComponente()) {
        return false;
      }
      return true;
    }),
  );

  protected componenteDe(id: number | undefined): Componente | undefined {
    return id === undefined ? undefined : this.componentes().find((componente) => componente.id === id);
  }

  protected onFiltroCriterio(evento: Event): void {
    this.filtroCriterio.set((evento.target as HTMLSelectElement).value);
  }

  protected onFiltroComponente(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.filtroComponente.set(valor === 'todos' ? 'todos' : Number(valor));
  }

  protected async eliminar(hallazgo: HallazgoPlantilla): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar de la biblioteca?',
      mensaje: `«${hallazgo.titulo}» se eliminará de la biblioteca. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar de la biblioteca',
    });
    if (!confirmado) return;

    await this.hallazgosPlantillaService.eliminar(hallazgo.id!);
    this.toast.mostrar('Hallazgo eliminado de la biblioteca.');
  }
}
