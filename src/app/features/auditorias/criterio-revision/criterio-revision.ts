import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CriteriosWcagService } from '../../../core/criterios-wcag';
import { MockDataService } from '../../../core/mock-data';
import type { EstadoResultado, Severidad } from '../../../core/models';

const ESTADOS: EstadoResultado[] = ['pasa', 'falla', 'no_aplica', 'por_revisar'];
const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja'];

// Pantalla 7 de specs/02-maqueta-m3.md: revisión manual de un criterio.
// Sin persistencia — "Guardar revisión" vuelve al checklist sin escribir
// nada. Elegir una redacción sugerida de la biblioteca solo rellena el
// formulario en memoria (interacción de UI, no lógica de negocio real).
@Component({
  selector: 'app-criterio-revision',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './criterio-revision.html',
  styleUrl: './criterio-revision.scss',
})
export class CriterioRevision {
  private readonly mockData = inject(MockDataService);
  private readonly criteriosWcag = inject(CriteriosWcagService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly estados = ESTADOS;
  protected readonly severidades = SEVERIDADES;
  protected readonly componentes = this.mockData.componentes();

  protected readonly auditoriaId = this.route.snapshot.paramMap.get('auditoriaId')!;
  protected readonly paginaId = this.route.snapshot.paramMap.get('paginaId')!;
  protected readonly codigo = this.route.snapshot.paramMap.get('codigo')!;

  protected readonly criterio = this.criteriosWcag.porCodigo(this.codigo);
  protected readonly resultado = this.mockData.resultado(Number(this.paginaId), this.codigo);
  protected readonly evidencias = this.resultado?.id
    ? this.mockData.evidenciasDeResultado(this.resultado.id)
    : [];

  protected readonly formulario = this.fb.nonNullable.group({
    estado: [(this.resultado?.estado ?? 'por_revisar') as EstadoResultado, Validators.required],
    severidad: [(this.resultado?.severidad ?? null) as Severidad | null],
    componenteId: [(this.resultado?.componente_id ?? null) as number | null],
    notas: [this.resultado?.notas ?? ''],
  });

  private readonly estadoActual = toSignal(this.formulario.controls.estado.valueChanges, {
    initialValue: this.formulario.controls.estado.value,
  });
  private readonly componenteIdActual = toSignal(
    this.formulario.controls.componenteId.valueChanges,
    { initialValue: this.formulario.controls.componenteId.value },
  );

  protected readonly muestraSeveridad = computed(() => this.estadoActual() === 'falla');

  protected readonly hallazgosSugeridos = computed(() =>
    this.estadoActual() === 'falla'
      ? this.mockData.hallazgosSugeridosPara(this.codigo, this.componenteIdActual() ?? undefined)
      : [],
  );

  protected usarHallazgo(hallazgoId: number): void {
    const hallazgo = this.mockData.hallazgoPlantilla(hallazgoId);
    if (!hallazgo) return;
    this.formulario.controls.notas.setValue(
      `${hallazgo.descripcion}\n\n${hallazgo.recomendacion_fix}`,
    );
    this.formulario.controls.severidad.setValue(hallazgo.severidad_tipica);
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/auditorias', this.auditoriaId, 'paginas', this.paginaId]);
  }
}
