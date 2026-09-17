import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EscaneoAxeService } from '../../../core/escaneo-axe';
import { PaginasService } from '../../../core/paginas';
import { AppButton } from '../../../shared/ui/button';
import { AppInput } from '../../../shared/ui/field-controls';
import { AppFormField } from '../../../shared/ui/form-field';
import { AppIcon } from '../../../shared/ui/icon';
import { AppTabs, type TabItem } from '../../../shared/ui/tabs';
import { ToastService } from '../../../shared/ui/toast';

// "URL en vivo" sigue seleccionable (para poder explicar por qué no está
// disponible), pero deshabilitada: el modo serverless con Playwright queda
// fuera de esta rebanada — ver specs/11-escaneo-axe.md "Qué NO entra".
const TABS: TabItem[] = [
  { id: 'html', label: 'Pegar HTML' },
  { id: 'url', label: 'URL en vivo', disabled: true },
];

// Pantalla 6 de specs/02-maqueta-m3.md: escaneo automático. El modo "Pegar
// HTML" ejecuta axe-core de verdad desde specs/11-escaneo-axe.md; "URL en
// vivo" (función serverless con Playwright) sigue siendo solo maqueta. La
// página es real desde specs/05-auditorias-paginas.md.
@Component({
  selector: 'app-pagina-escaneo',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppIcon, AppInput, AppTabs],
  templateUrl: './pagina-escaneo.html',
})
export class PaginaEscaneo {
  private readonly paginasService = inject(PaginasService);
  private readonly escaneoAxeService = inject(EscaneoAxeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

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
  // Puramente informativo mientras "URL en vivo" está deshabilitada — sin
  // ejecutar() propio, ver plantilla.
  protected readonly formularioUrl = this.fb.nonNullable.group({ url: [''] });

  protected readonly escaneando = signal(false);

  constructor() {
    this.formularioUrl.disable();
    void this.cargarUrlInicial();
  }

  private async cargarUrlInicial(): Promise<void> {
    const pagina = await firstValueFrom(this.paginasService.porId$(this.paginaIdNum));
    if (pagina) {
      this.formularioUrl.patchValue({ url: pagina.url });
    }
  }

  protected async ejecutarEscaneo(): Promise<void> {
    if (this.escaneando()) return;
    if (this.formularioHtml.invalid) {
      this.formularioHtml.markAllAsTouched();
      return;
    }

    this.escaneando.set(true);
    try {
      const { criteriosMarcados } = await this.escaneoAxeService.ejecutarSobreHtml(
        this.paginaIdNum,
        this.formularioHtml.getRawValue().html,
      );
      this.toast.mostrar(
        criteriosMarcados > 0
          ? `Escaneo completado: ${criteriosMarcados} criterio(s) marcado(s) como Falla automática.`
          : 'Escaneo completado: no se han encontrado fallos automáticos.',
      );
      void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
    } catch {
      this.toast.mostrar('No se ha podido completar el escaneo. Inténtalo de nuevo.');
    } finally {
      this.escaneando.set(false);
    }
  }
}
