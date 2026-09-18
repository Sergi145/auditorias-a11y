import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CriteriosWcagService } from './criterios-wcag';
import { DatabaseService } from './database';
import { HallazgosService } from './hallazgos';
import type { Pagina } from './models';
import { ProgresoService } from './progreso';
import { ResultadosService } from './resultados';

const PAGINA_A: Pagina = { id: 1, auditoria_id: 1, nombre: 'Home', url: '', notas_generales: '' };
const PAGINA_B: Pagina = { id: 2, auditoria_id: 1, nombre: 'Contacto', url: '', notas_generales: '' };

describe('ProgresoService', () => {
  let service: ProgresoService;
  let resultados: ResultadosService;
  let hallazgos: HallazgosService;
  let database: DatabaseService;
  let totalCriteriosWcag: number;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProgresoService);
    resultados = TestBed.inject(ResultadosService);
    hallazgos = TestBed.inject(HallazgosService);
    database = TestBed.inject(DatabaseService);
    totalCriteriosWcag = TestBed.inject(CriteriosWcagService).todos().length;
  });

  afterEach(async () => {
    await database.db.hallazgos.clear();
    await database.db.resultados.clear();
  });

  it('devuelve el progreso vacío cuando la auditoría no tiene páginas', async () => {
    const progreso = await firstValueFrom(service.deAuditoria$([]));
    expect(progreso).toEqual({
      totalCriterios: 0,
      revisados: 0,
      porcentajeRevisado: 0,
      fallosPorSeveridad: { critica: 0, alta: 0, media: 0, baja: 0 },
      criteriosPorEstado: { pasa: 0, falla: 0, no_aplica: 0, por_revisar: 0 },
      fallosPorCategoria: { perceptible: 0, operable: 0, comprensible: 0, robusto: 0 },
    });
  });

  it('calcula % revisado y fallosPorSeveridad contando cada hallazgo por separado', async () => {
    const resultadoA = await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'Error 1' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'Error 2' });
    await resultados.guardar(PAGINA_A.id!, '2.1.1', { estado: 'pasa' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A]));

    expect(progreso.totalCriterios).toBe(totalCriteriosWcag);
    expect(progreso.revisados).toBe(2);
    expect(progreso.fallosPorSeveridad.alta).toBe(2);
    expect(progreso.fallosPorSeveridad.critica).toBe(0);
  });

  it('agrega el progreso de varias páginas de la misma auditoría', async () => {
    await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'pasa' });
    await resultados.guardar(PAGINA_B.id!, '1.1.1', { estado: 'pasa' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A, PAGINA_B]));

    expect(progreso.totalCriterios).toBe(totalCriteriosWcag * 2);
    expect(progreso.revisados).toBe(2);
  });

  it('criteriosPorEstado suma totalCriterios y cuenta un criterio sin Resultado como por_revisar', async () => {
    await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla' });
    await resultados.guardar(PAGINA_A.id!, '2.1.1', { estado: 'pasa' });
    await resultados.guardar(PAGINA_A.id!, '1.4.3', { estado: 'no_aplica' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A]));
    const suma = Object.values(progreso.criteriosPorEstado).reduce((a, b) => a + b, 0);

    expect(suma).toBe(progreso.totalCriterios);
    expect(progreso.criteriosPorEstado.falla).toBe(1);
    expect(progreso.criteriosPorEstado.pasa).toBe(1);
    expect(progreso.criteriosPorEstado.no_aplica).toBe(1);
    expect(progreso.criteriosPorEstado.por_revisar).toBe(totalCriteriosWcag - 3);
  });

  it('fallosPorCategoria cuenta cada hallazgo según la categoría de su criterio', async () => {
    // 1.1.1 → perceptible, 2.1.1 → operable, 3.1.1 → comprensible.
    const resultadoPerceptible = await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoPerceptible, severidad: 'alta', notas: 'Error 1' });
    await hallazgos.crear({ resultado_id: resultadoPerceptible, severidad: 'media', notas: 'Error 2' });
    const resultadoOperable = await resultados.guardar(PAGINA_A.id!, '2.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoOperable, severidad: 'critica', notas: 'Error 3' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A]));
    const sumaCategoria = Object.values(progreso.fallosPorCategoria).reduce((a, b) => a + b, 0);
    const sumaSeveridad = Object.values(progreso.fallosPorSeveridad).reduce((a, b) => a + b, 0);

    expect(progreso.fallosPorCategoria.perceptible).toBe(2);
    expect(progreso.fallosPorCategoria.operable).toBe(1);
    expect(progreso.fallosPorCategoria.comprensible).toBe(0);
    expect(progreso.fallosPorCategoria.robusto).toBe(0);
    expect(sumaCategoria).toBe(sumaSeveridad);
  });

  it('rankingPaginas$ ordena de más a menos criterios en Falla', async () => {
    await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla' });
    await resultados.guardar(PAGINA_B.id!, '1.1.1', { estado: 'falla' });
    await resultados.guardar(PAGINA_B.id!, '1.4.3', { estado: 'falla' });

    const ranking = await firstValueFrom(service.rankingPaginas$([PAGINA_A, PAGINA_B]));

    expect(ranking).toEqual([
      { nombre: 'Contacto', cantidad: 2 },
      { nombre: 'Home', cantidad: 1 },
    ]);
  });
});
