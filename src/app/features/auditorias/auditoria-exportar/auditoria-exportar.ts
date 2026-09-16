import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import { ExportacionExcelService } from '../../../core/exportacion-excel';
import { ExportacionPdfService } from '../../../core/exportacion-pdf';
import { PaginasService } from '../../../core/paginas';
import { ResultadosService } from '../../../core/resultados';
import { AppButton } from '../../../shared/ui/button';
import { AppIcon } from '../../../shared/ui/icon';
import { ToastService } from '../../../shared/ui/toast';

type FormatoExportacion = 'Excel' | 'PDF';

interface EstadoDatosExportables {
  tienePaginas: boolean;
  tieneResultados: boolean;
}

const SIN_DATOS_INICIAL: EstadoDatosExportables = { tienePaginas: false, tieneResultados: false };

// Pantalla 12 de specs/02-maqueta-m3.md: exportación. La auditoría es real
// desde specs/05-auditorias-paginas.md; la generación de Excel y PDF es
// real desde specs/09-exportacion.md.
@Component({
  selector: 'app-auditoria-exportar',
  imports: [RouterLink, AppButton, AppIcon],
  templateUrl: './auditoria-exportar.html',
})
export class AuditoriaExportar {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly exportacionExcelService = inject(ExportacionExcelService);
  private readonly exportacionPdfService = inject(ExportacionPdfService);
  private readonly paginasService = inject(PaginasService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly auditoriaId = Number(this.route.snapshot.paramMap.get('auditoriaId'));
  protected readonly auditoria = toSignal(this.auditoriasService.porId$(this.auditoriaId), {
    initialValue: undefined,
  });

  // Solo el botón pulsado pasa a "Generando…"; el otro formato sigue
  // disponible mientras tanto — ver specs/09-exportacion.md.
  protected readonly generando = signal<FormatoExportacion | null>(null);

  // "Al menos un Resultado guardado" cuenta cualquier estado (incluido un
  // 'por_revisar' guardado explícitamente), a diferencia de "revisados" de
  // ProgresoService — por eso se consulta aparte en vez de reutilizarlo.
  private readonly estadoDatos = toSignal(
    this.paginasService.deAuditoria$(this.auditoriaId).pipe(
      switchMap((paginas) =>
        paginas.length === 0
          ? of<EstadoDatosExportables>({ tienePaginas: false, tieneResultados: false })
          : combineLatest(paginas.map((pagina) => this.resultadosService.dePagina$(pagina.id!))).pipe(
              map(
                (porPagina): EstadoDatosExportables => ({
                  tienePaginas: true,
                  tieneResultados: porPagina.some((resultados) => resultados.length > 0),
                }),
              ),
            ),
      ),
    ),
    { initialValue: SIN_DATOS_INICIAL },
  );

  protected readonly sinDatosExportables = computed(
    () => !this.estadoDatos().tienePaginas || !this.estadoDatos().tieneResultados,
  );

  protected readonly mensajeSinDatos = computed(() => {
    const estado = this.estadoDatos();
    if (!estado.tienePaginas) {
      return 'Añade al menos una página a la auditoría para poder exportar el informe.';
    }
    if (!estado.tieneResultados) {
      return 'Guarda al menos una revisión en alguna página para poder exportar el informe.';
    }
    return null;
  });

  protected async exportar(formato: FormatoExportacion): Promise<void> {
    // aria-disabled (no disabled nativo, ver button.ts) no bloquea la
    // activación por teclado por sí solo — sin esta guarda, Enter/Espacio
    // sobre un botón "deshabilitado" seguiría disparando la exportación.
    if (this.generando() !== null || this.sinDatosExportables()) return;

    this.generando.set(formato);
    try {
      if (formato === 'Excel') {
        await this.exportacionExcelService.generar(this.auditoriaId);
        this.toast.mostrar('Excel descargado.');
      } else {
        await this.exportacionPdfService.generar(this.auditoriaId);
        this.toast.mostrar('PDF descargado.');
      }
    } catch {
      this.toast.mostrar(`No se ha podido generar el ${formato}. Inténtalo de nuevo.`);
    } finally {
      this.generando.set(null);
    }
  }
}
