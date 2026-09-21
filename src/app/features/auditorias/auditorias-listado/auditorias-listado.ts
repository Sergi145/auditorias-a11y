import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AuditoriasService } from '../../../core/auditorias';
import type { Auditoria, EstadoAuditoria, Severidad } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { ProgresoService } from '../../../core/progreso';
import { AppButton } from '../../../shared/ui/button';
import { AppCard } from '../../../shared/ui/card';
import { AppChip } from '../../../shared/ui/chip';
import { AppIcon } from '../../../shared/ui/icon';
import { AppPaginacion } from '../../../shared/ui/paginacion';
import { AppProgressBar } from '../../../shared/ui/progress-bar';

interface AuditoriaConProgreso {
  auditoria: Auditoria;
  porcentajeRevisado: number;
  fallosPorSeveridad: Record<Severidad, number>;
}

const AUDITORIAS_POR_PAGINA = 9;

const ETIQUETA_ESTADO: Record<EstadoAuditoria, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada',
  archivada: 'Archivada',
};

// Pantalla 1 de specs/02-maqueta-m3.md: listado de auditorías con estado
// global, % completado y fallos por severidad. Auditoria y Pagina son
// reales desde specs/05-auditorias-paginas.md; el progreso (Resultado +
// Hallazgo) es real desde specs/06-checklist-manual.md — lectura reactiva
// combinando AuditoriasService + PaginasService + ProgresoService.
//
// Paginado de 9 en 9 con AppPaginacion (specs/23-paginacion-auditorias.md):
// la página actual vive en el query param `?pagina=N` (ausente = 1). Al
// cambiar de página el foco va al <h1> y se anuncia por LiveAnnouncer; un
// `?pagina` inválido o fuera de rango se corrige en la URL sin anunciar nada.
@Component({
  selector: 'app-auditorias-listado',
  imports: [RouterLink, AppButton, AppCard, AppChip, AppIcon, AppPaginacion, AppProgressBar],
  templateUrl: './auditorias-listado.html',
})
export class AuditoriasListado {
  private readonly auditoriasService = inject(AuditoriasService);
  private readonly paginasService = inject(PaginasService);
  private readonly progresoService = inject(ProgresoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  // tabindex="-1" solo para poder enfocarlo por script al cambiar de página.
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');

  // `undefined` mientras Dexie no ha respondido: sin distinguirlo de "no hay
  // auditorías", `?pagina=2` se corregiría a la página 1 antes de que lleguen
  // los datos y recargar (F5) perdería la página.
  private readonly conProgreso = toSignal(
    this.auditoriasService.todas$().pipe(
      switchMap((auditorias) =>
        auditorias.length === 0
          ? of<AuditoriaConProgreso[]>([])
          : combineLatest(
              auditorias.map((auditoria) =>
                this.paginasService.deAuditoria$(auditoria.id!).pipe(
                  switchMap((paginas) =>
                    this.progresoService.deAuditoria$(paginas).pipe(
                      map(
                        (progreso): AuditoriaConProgreso => ({
                          auditoria,
                          porcentajeRevisado: progreso.porcentajeRevisado,
                          fallosPorSeveridad: progreso.fallosPorSeveridad,
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
      ),
    ),
  );

  private readonly cargado = computed(() => this.conProgreso() !== undefined);

  // Más recientes primero: con paginación, una auditoría recién creada
  // acabaría en la última página si se mantuviera el orden de creación.
  protected readonly auditorias = computed(() =>
    [...(this.conProgreso() ?? [])].sort((a, b) => (b.auditoria.id ?? 0) - (a.auditoria.id ?? 0)),
  );

  protected readonly porPagina = AUDITORIAS_POR_PAGINA;

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  private readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.auditorias().length / this.porPagina)),
  );

  // Un `?pagina` inválido o fuera de rango se muestra como la página válida
  // más cercana.
  protected readonly paginaActual = computed(() =>
    Math.min(numeroDePagina(this.query().get('pagina')), this.totalPaginas()),
  );

  protected readonly visibles = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.porPagina;
    return this.auditorias().slice(inicio, inicio + this.porPagina);
  });

  // Último `?pagina` y última página mostrada que ya se han tratado; `undefined`
  // = aún no se ha visto ninguno (carga inicial del listado).
  private paramVisto: string | null | undefined;
  private paginaVista = 1;

  constructor() {
    // Deja en la URL solo un `?pagina` válido: 'abc', '0' o '1' se quitan,
    // uno mayor que la última página pasa a ser el de la última (también
    // cuando se borra la única auditoría de la última página y se vuelve con
    // "Atrás"). `replaceUrl` para no dejar la URL inválida en el historial.
    effect(() => {
      if (!this.cargado()) return;
      const param = this.query().get('pagina');
      const pagina = this.paginaActual();
      const canonico = pagina === 1 ? null : String(pagina);
      if (param === canonico) return;

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { pagina: canonico },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    effect(() => {
      const param = this.query().get('pagina');
      const pagina = this.paginaActual();
      untracked(() => this.alCambiarPagina(param, pagina));
    });
  }

  // Foco al <h1> y anuncio solo cuando la URL cambia y con ella la página
  // mostrada (clic en la paginación, «Atrás»/«Adelante» con el listado ya
  // abierto). No cuenta: la carga inicial, los datos que llegan después
  // (cambia la página mostrada, pero no la URL) ni la corrección de la URL
  // (cambia la URL, pero no la página mostrada).
  private alCambiarPagina(param: string | null, pagina: number): void {
    const primeraVez = this.paramVisto === undefined;
    const cambiaLaUrl = param !== this.paramVisto;
    const paginaAnterior = this.paginaVista;
    this.paramVisto = param;
    this.paginaVista = pagina;
    if (primeraVez || !cambiaLaUrl || pagina === paginaAnterior || !this.cargado()) return;

    this.titulo()?.nativeElement.focus();
    const total = this.auditorias().length;
    const primera = (pagina - 1) * this.porPagina + 1;
    const ultima = Math.min(pagina * this.porPagina, total);
    void this.liveAnnouncer.announce(
      `Página ${pagina} de ${this.totalPaginas()}. Auditorías ${primera} a ${ultima} de ${total}.`,
      'polite',
    );
  }
}

// Valor de `?pagina` como número de página: solo enteros positivos; cualquier
// otra cosa (ausente, 'abc', '0', '-2', '2.5') es la página 1.
function numeroDePagina(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor)) return 1;
  return Math.max(1, Number(valor));
}
