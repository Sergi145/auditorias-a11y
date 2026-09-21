import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EscaneoAxeService } from '../../../core/escaneo-axe';
import {
  ErrorEscaneoUrl,
  EscaneoUrlService,
  mensajeErrorEscaneoUrl,
} from '../../../core/escaneo-url';
import { PaginasService } from '../../../core/paginas';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { AppTabs, type TabItem } from '../../../shared/ui/tabs';
import { ToastService } from '../../../shared/ui/toast';

const TABS: TabItem[] = [
  { id: 'html', label: 'Pegar HTML' },
  { id: 'url', label: 'URL en vivo' },
];

// Pantalla 6 de specs/02-maqueta-m3.md: escaneo automático. El modo "Pegar
// HTML" ejecuta axe-core de verdad desde specs/11-escaneo-axe.md; "URL en
// vivo" ejecuta axe-core sobre la URL real de la página vía la función
// serverless /api/escanear-url (Playwright, desplegada en Vercel) — ver
// specs/12-escaneo-url.md. La página es real desde specs/05-auditorias-paginas.md.
@Component({
  selector: 'app-pagina-escaneo',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppIcon, AppInput, AppTabs],
  templateUrl: './pagina-escaneo.html',
})
export class PaginaEscaneo {
  private readonly paginasService = inject(PaginasService);
  private readonly escaneoAxeService = inject(EscaneoAxeService);
  private readonly escaneoUrlService = inject(EscaneoUrlService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  private readonly paginaIdNum = Number(this.paginaId);
  protected readonly pagina = toSignal(this.paginasService.porId$(this.paginaIdNum), {
    initialValue: undefined,
  });

  protected readonly tabs = TABS;
  protected readonly tabIndex = signal(0);

  protected readonly formularioHtml = this.fb.nonNullable.group({
    html: ['', Validators.required],
  });

  // Compartido entre las dos pestañas: mientras corre un escaneo (de
  // cualquiera de los dos modos) no se puede lanzar otro desde ninguna —
  // ver specs/12-escaneo-url.md.
  protected readonly escaneando = signal(false);

  // Que el botón pase a «Escaneando…» no basta para un lector de pantalla: el
  // cambio de texto de un botón con el foco no se anuncia, y sin aviso quien lo
  // usa no sabe si la pulsación ha hecho algo. El final ya lo anuncia el toast.
  private anunciarInicio(mensaje: string): void {
    void this.liveAnnouncer.announce(mensaje, 'polite');
  }

  protected async ejecutarEscaneo(): Promise<void> {
    if (this.escaneando()) return;
    if (this.formularioHtml.invalid) {
      this.formularioHtml.markAllAsTouched();
      return;
    }

    this.escaneando.set(true);
    this.anunciarInicio('Escaneando el HTML. Puede tardar unos segundos.');
    try {
      const { criteriosMarcados } = await this.escaneoAxeService.ejecutarSobreHtml(
        this.paginaIdNum,
        this.formularioHtml.getRawValue().html,
      );
      this.mostrarResumenYVolver(criteriosMarcados);
    } catch {
      this.toast.mostrar('No se ha podido completar el escaneo. Inténtalo de nuevo.');
    } finally {
      this.escaneando.set(false);
    }
  }

  protected async ejecutarEscaneoUrl(): Promise<void> {
    if (this.escaneando()) return;
    const pagina = this.pagina();
    if (!pagina) return;

    this.escaneando.set(true);
    this.anunciarInicio('Escaneando la URL. Puede tardar hasta un minuto.');
    try {
      const { criteriosMarcados } = await this.escaneoUrlService.ejecutarSobreUrl(
        this.paginaIdNum,
        pagina.url,
      );
      this.mostrarResumenYVolver(criteriosMarcados);
    } catch (error) {
      this.toast.mostrar(
        error instanceof ErrorEscaneoUrl
          ? mensajeErrorEscaneoUrl(error.codigo)
          : 'No se ha podido completar el escaneo. Inténtalo de nuevo.',
      );
    } finally {
      this.escaneando.set(false);
    }
  }

  private mostrarResumenYVolver(criteriosMarcados: number): void {
    this.toast.mostrar(
      criteriosMarcados > 0
        ? `Escaneo completado: ${criteriosMarcados} criterio(s) marcado(s) como Falla automática.`
        : 'Escaneo completado: no se han encontrado fallos automáticos.',
    );
    void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
  }
}
