import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ComponentesService } from '../../../core/componentes';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { idiomaNombreComponente } from '../../../core/componentes-catalogo';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly criterios: CriterioWCAG[] = this.criteriosWcag.todos();

  protected readonly componentes = toSignal(this.componentesService.todos$(), {
    initialValue: [] as Componente[],
  });

  protected readonly hallazgos = toSignal(this.hallazgosPlantillaService.todos$(), {
  protected readonly idiomaNombre = idiomaNombreComponente;
    initialValue: [] as HallazgoPlantilla[],
  });

  // Modo "elegir redacción" — ver specs/21-elegir-desde-biblioteca.md: se
  // llega desde "Ver en la biblioteca" de criterio-revision con
  // ?auditoria=&pagina=&criterio= (y ?hallazgo= si se estaba editando uno
  // existente, ?componente= si ya había uno elegido). Cada tarjeta ofrece
  // entonces "Usar esta redacción", que vuelve a ese criterio con
  // ?plantilla=ID para rellenar el formulario de hallazgo.
  private readonly query = this.route.snapshot.queryParamMap;
  protected readonly seleccion = this.leerSeleccion();

  protected readonly etiquetaCriterio = this.seleccion ? this.describirCriterio(this.seleccion.criterio) : '';

  // En modo selección se parte filtrado por el criterio que se está
  // revisando (no por componente, para ver también las redacciones que
  // las sugerencias automáticas no ofrecen); el filtro se puede cambiar a
  // "Todos" para elegir cualquier entrada de la biblioteca.
  protected readonly filtroCriterio = signal<string | 'todos'>(this.seleccion?.criterio ?? 'todos');
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

  private leerSeleccion():
    | { auditoria: string; pagina: string; criterio: string; hallazgo?: string; componente?: string }
    | undefined {
    const auditoria = this.query.get('auditoria');
    const pagina = this.query.get('pagina');
    const criterio = this.query.get('criterio');
    if (!auditoria || !pagina || !criterio) return undefined;
    return {
      auditoria,
      pagina,
      criterio,
      hallazgo: this.query.get('hallazgo') ?? undefined,
      componente: this.query.get('componente') ?? undefined,
    };
  }

  private describirCriterio(codigo: string): string {
    const criterio = this.criteriosWcag.porCodigo(codigo);
    return criterio ? `${codigo} · ${criterio.nombre}` : codigo;
  }

  protected rutaCriterio(): string[] {
    const seleccion = this.seleccion!;
    return ['/auditorias', seleccion.auditoria, 'paginas', seleccion.pagina, 'criterios', seleccion.criterio];
  }

  // Parámetros de vuelta sin elegir nada: se conserva ?hallazgo= para
  // reabrir en edición el hallazgo del que se partió.
  protected queryVolver(): Record<string, string> {
    return this.seleccion?.hallazgo ? { hallazgo: this.seleccion.hallazgo } : {};
  }

  protected usar(hallazgo: HallazgoPlantilla): void {
    const seleccion = this.seleccion!;
    const queryParams: Record<string, string | number> = { ...this.queryVolver(), plantilla: hallazgo.id! };
    if (seleccion.componente) queryParams['componente'] = seleccion.componente;
    void this.router.navigate(this.rutaCriterio(), { queryParams });
  }

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
