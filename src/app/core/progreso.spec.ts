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
    });
  });

  it('calcula % revisado y fallosPorSeveridad contando cada hallazgo por separado', async () => {
    const resultadoA = await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla', notas: '' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'Error 1' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'Error 2' });
    await resultados.guardar(PAGINA_A.id!, '2.1.1', { estado: 'pasa', notas: '' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A]));

    expect(progreso.totalCriterios).toBe(totalCriteriosWcag);
    expect(progreso.revisados).toBe(2);
    expect(progreso.fallosPorSeveridad.alta).toBe(2);
    expect(progreso.fallosPorSeveridad.critica).toBe(0);
  });

  it('agrega el progreso de varias páginas de la misma auditoría', async () => {
    await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'pasa', notas: '' });
    await resultados.guardar(PAGINA_B.id!, '1.1.1', { estado: 'pasa', notas: '' });

    const progreso = await firstValueFrom(service.deAuditoria$([PAGINA_A, PAGINA_B]));

    expect(progreso.totalCriterios).toBe(totalCriteriosWcag * 2);
    expect(progreso.revisados).toBe(2);
  });

  it('rankingPaginas$ ordena de más a menos criterios en Falla', async () => {
    await resultados.guardar(PAGINA_A.id!, '1.1.1', { estado: 'falla', notas: '' });
    await resultados.guardar(PAGINA_B.id!, '1.1.1', { estado: 'falla', notas: '' });
    await resultados.guardar(PAGINA_B.id!, '1.4.3', { estado: 'falla', notas: '' });

    const ranking = await firstValueFrom(service.rankingPaginas$([PAGINA_A, PAGINA_B]));

    expect(ranking).toEqual([
      { nombre: 'Contacto', cantidad: 2 },
      { nombre: 'Home', cantidad: 1 },
    ]);
  });
});
