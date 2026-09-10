import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from './database';
import { HallazgosService } from './hallazgos';
import { ResultadosService } from './resultados';

describe('HallazgosService', () => {
  let service: HallazgosService;
  let resultados: ResultadosService;
  let database: DatabaseService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HallazgosService);
    resultados = TestBed.inject(ResultadosService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.hallazgos.clear();
    await database.db.resultados.clear();
  });

  it('crea un hallazgo y aparece en deResultado$()', async () => {
    const resultadoId = await resultados.guardar(1, '1.1.1', { estado: 'falla', notas: '' });
    const id = await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Sin alt' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));

    expect(hallazgos).toEqual([
      {
        id,
        resultado_id: resultadoId,
        severidad: 'alta',
        notas: 'Sin alt',
        fecha_creacion: hallazgos[0].fecha_creacion,
      },
    ]);
    expect(hallazgos[0].fecha_creacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('permite varios hallazgos para el mismo resultado', async () => {
    const resultadoId = await resultados.guardar(1, '1.4.3', { estado: 'falla', notas: '' });
    await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Primer error' });
    await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'Segundo error' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));

    expect(hallazgos).toHaveLength(2);
    expect(hallazgos.map((h) => h.severidad).sort()).toEqual(['alta', 'baja']);
  });

  it('actualiza un hallazgo existente sin duplicarlo', async () => {
    const resultadoId = await resultados.guardar(1, '2.4.7', { estado: 'falla', notas: '' });
    const id = await service.crear({ resultado_id: resultadoId, severidad: 'media', notas: 'Borrador' });

    await service.actualizar(id, { severidad: 'critica', notas: 'Definitivo' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].severidad).toBe('critica');
    expect(hallazgos[0].notas).toBe('Definitivo');
  });

  it('elimina un hallazgo sin afectar a los demás del mismo resultado', async () => {
    const resultadoId = await resultados.guardar(1, '3.3.2', { estado: 'falla', notas: '' });
    const idBorrar = await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'A' });
    const idQueda = await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'B' });

    await service.eliminar(idBorrar);

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
    expect(hallazgos).toEqual([expect.objectContaining({ id: idQueda, notas: 'B' })]);
  });

  it('dePagina$() agrupa los hallazgos de todos los resultados de esa página', async () => {
    const resultadoA = await resultados.guardar(1, '1.1.1', { estado: 'falla', notas: '' });
    const resultadoB = await resultados.guardar(1, '1.4.3', { estado: 'falla', notas: '' });
    await resultados.guardar(2, '1.1.1', { estado: 'falla', notas: 'Otra página' });
    await service.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'A' });
    await service.crear({ resultado_id: resultadoB, severidad: 'baja', notas: 'B' });

    const hallazgos = await firstValueFrom(service.dePagina$(1));

    expect(hallazgos).toHaveLength(2);
  });

  it('dePagina$() devuelve vacío si la página no tiene resultados todavía', async () => {
    const hallazgos = await firstValueFrom(service.dePagina$(999));
    expect(hallazgos).toEqual([]);
  });
});
