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
    await database.db.evidencias.clear();
  });

  it('crea un hallazgo y aparece en deResultado$()', async () => {
    const resultadoId = await resultados.guardar(1, '1.1.1', { estado: 'falla' });
    const id = await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Sin alt' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));

    expect(hallazgos).toEqual([
      {
        id,
        resultado_id: resultadoId,
        severidad: 'alta',
        notas: 'Sin alt',
        origen: 'manual',
        fecha_creacion: hallazgos[0].fecha_creacion,
      },
    ]);
    expect(hallazgos[0].fecha_creacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('guarda la solución opcional de un hallazgo', async () => {
    const resultadoId = await resultados.guardar(1, '4.1.2', { estado: 'falla' });
    const id = await service.crear({
      resultado_id: resultadoId,
      severidad: 'media',
      notas: 'Falta name accesible',
      solucion: 'Añadir aria-label al botón',
    });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
    expect(hallazgos.find((h) => h.id === id)?.solucion).toBe('Añadir aria-label al botón');
  });

  it('permite varios hallazgos para el mismo resultado', async () => {
    const resultadoId = await resultados.guardar(1, '1.4.3', { estado: 'falla' });
    await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Primer error' });
    await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'Segundo error' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));

    expect(hallazgos).toHaveLength(2);
    expect(hallazgos.map((h) => h.severidad).sort()).toEqual(['alta', 'baja']);
  });

  it('actualiza un hallazgo existente sin duplicarlo', async () => {
    const resultadoId = await resultados.guardar(1, '2.4.7', { estado: 'falla' });
    const id = await service.crear({ resultado_id: resultadoId, severidad: 'media', notas: 'Borrador' });

    await service.actualizar(id, { severidad: 'critica', notas: 'Definitivo' });

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].severidad).toBe('critica');
    expect(hallazgos[0].notas).toBe('Definitivo');
  });

  it('elimina un hallazgo sin afectar a los demás del mismo resultado', async () => {
    const resultadoId = await resultados.guardar(1, '3.3.2', { estado: 'falla' });
    const idBorrar = await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'A' });
    const idQueda = await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'B' });

    await service.eliminar(idBorrar);

    const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
    expect(hallazgos).toEqual([expect.objectContaining({ id: idQueda, notas: 'B' })]);
  });

  it('elimina en cascada las evidencias del hallazgo borrado, sin tocar las de otro', async () => {
    const resultadoId = await resultados.guardar(1, '1.4.5', { estado: 'falla' });
    const idBorrar = await service.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'A' });
    const idQueda = await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'B' });
    await database.db.evidencias.bulkAdd([
      { hallazgo_id: idBorrar, tipo: 'captura', descripcion: 'De A' },
      { hallazgo_id: idQueda, tipo: 'captura', descripcion: 'De B' },
    ]);

    await service.eliminar(idBorrar);

    const evidenciasRestantes = await database.db.evidencias.toArray();
    expect(evidenciasRestantes).toEqual([expect.objectContaining({ hallazgo_id: idQueda, descripcion: 'De B' })]);
  });

  it('dePagina$() agrupa los hallazgos de todos los resultados de esa página', async () => {
    const resultadoA = await resultados.guardar(1, '1.1.1', { estado: 'falla' });
    const resultadoB = await resultados.guardar(1, '1.4.3', { estado: 'falla' });
    await resultados.guardar(2, '1.1.1', { estado: 'falla' });
    await service.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'A' });
    await service.crear({ resultado_id: resultadoB, severidad: 'baja', notas: 'B' });

    const hallazgos = await firstValueFrom(service.dePagina$(1));

    expect(hallazgos).toHaveLength(2);
  });

  it('dePagina$() devuelve vacío si la página no tiene resultados todavía', async () => {
    const hallazgos = await firstValueFrom(service.dePagina$(999));
    expect(hallazgos).toEqual([]);
  });

  it('actualizar() promociona un hallazgo automático a manual', async () => {
    const resultadoId = await resultados.guardar(1, '1.4.3', { estado: 'falla' });
    await service.guardarAutomatico(resultadoId, { severidad: 'alta', notas: 'Contraste insuficiente' });
    const [automatico] = await firstValueFrom(service.deResultado$(resultadoId));

    await service.actualizar(automatico.id!, { notas: 'Contraste corregido a mano' });

    const [actualizado] = await firstValueFrom(service.deResultado$(resultadoId));
    expect(actualizado.origen).toBe('manual');
    expect(actualizado.notas).toBe('Contraste corregido a mano');
  });

  describe('guardarAutomatico()', () => {
    it('crea un hallazgo automático si no existía ninguno para ese resultado', async () => {
      const resultadoId = await resultados.guardar(1, '1.1.1', { estado: 'falla' });

      await service.guardarAutomatico(resultadoId, { severidad: 'alta', notas: 'Falta alt (axe)' });

      const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
      expect(hallazgos).toEqual([
        expect.objectContaining({ severidad: 'alta', notas: 'Falta alt (axe)', origen: 'automatico' }),
      ]);
    });

    it('actualiza el hallazgo automático existente en vez de duplicarlo', async () => {
      const resultadoId = await resultados.guardar(1, '1.4.3', { estado: 'falla' });
      await service.guardarAutomatico(resultadoId, { severidad: 'media', notas: 'Primer escaneo' });

      await service.guardarAutomatico(resultadoId, { severidad: 'critica', notas: 'Segundo escaneo' });

      const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
      expect(hallazgos).toHaveLength(1);
      expect(hallazgos[0]).toEqual(
        expect.objectContaining({ severidad: 'critica', notas: 'Segundo escaneo', origen: 'automatico' }),
      );
    });

    it('crea uno nuevo si el hallazgo automático previo fue promocionado a manual', async () => {
      const resultadoId = await resultados.guardar(1, '2.4.7', { estado: 'falla' });
      await service.guardarAutomatico(resultadoId, { severidad: 'media', notas: 'Escaneo inicial' });
      const [automatico] = await firstValueFrom(service.deResultado$(resultadoId));
      await service.actualizar(automatico.id!, { notas: 'Revisado a mano' });

      await service.guardarAutomatico(resultadoId, { severidad: 'alta', notas: 'Re-escaneo' });

      const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
      expect(hallazgos).toHaveLength(2);
      expect(hallazgos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ origen: 'manual', notas: 'Revisado a mano' }),
          expect.objectContaining({ origen: 'automatico', notas: 'Re-escaneo' }),
        ]),
      );
    });

    it('no toca un hallazgo manual sin relación con el escaneo', async () => {
      const resultadoId = await resultados.guardar(1, '3.3.2', { estado: 'falla' });
      await service.crear({ resultado_id: resultadoId, severidad: 'baja', notas: 'Nota manual' });

      await service.guardarAutomatico(resultadoId, { severidad: 'alta', notas: 'Hallazgo de axe' });

      const hallazgos = await firstValueFrom(service.deResultado$(resultadoId));
      expect(hallazgos).toHaveLength(2);
      expect(hallazgos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ origen: 'manual', notas: 'Nota manual' }),
          expect.objectContaining({ origen: 'automatico', notas: 'Hallazgo de axe' }),
        ]),
      );
    });
  });
});
