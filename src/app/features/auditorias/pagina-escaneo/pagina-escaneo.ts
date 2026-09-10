import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

// Pantalla 6 de specs/02-maqueta-m3.md: escaneo automático (HTML pegado o
// URL en vivo). Solo el layout del flujo — no ejecuta axe-core de verdad
// (ver "Qué NO entra"). La página es real desde specs/05-auditorias-paginas.md.
@Component({
  selector: 'app-pagina-escaneo',
  imports: [ReactiveFormsModule, RouterLink, AppButton, AppFormField, AppIcon, AppInput, AppTabs],
  templateUrl: './pagina-escaneo.html',
})
export class PaginaEscaneo {
  private readonly paginasService = inject(PaginasService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly pagina = toSignal(this.paginasService.porId$(Number(this.paginaId)), {
    initialValue: undefined,
  });

  protected readonly tabs = TABS;
  protected readonly tabIndex = signal(0);

  protected readonly formularioHtml = this.fb.nonNullable.group({ html: [''] });
  protected readonly formularioUrl = this.fb.nonNullable.group({ url: [''] });

  constructor() {
    void this.cargarUrlInicial();
  }

  private async cargarUrlInicial(): Promise<void> {
    const pagina = await firstValueFrom(this.paginasService.porId$(Number(this.paginaId)));
    if (pagina) {
      this.formularioUrl.patchValue({ url: pagina.url });
    }
  }

  protected ejecutarEscaneo(): void {
    this.toast.mostrar('El escaneo automático con axe-core llega en la rebanada 10-escaneo-axe.');
  }
}
