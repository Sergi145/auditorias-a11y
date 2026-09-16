import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from './database';
import { ResultadosService } from './resultados';

const PAGINA_ID = 1;
const CRITERIO = '1.1.1';

describe('ResultadosService', () => {
  let service: ResultadosService;
  let database: DatabaseService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultadosService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.resultados.clear();
  });

  it('crea un resultado nuevo si no existía para ese criterio/página', async () => {
    const id = await service.guardar(PAGINA_ID, CRITERIO, { estado: 'falla' });
    const resultado = await firstValueFrom(service.porPaginaYCriterio$(PAGINA_ID, CRITERIO));

    expect(resultado).toEqual({
      id,
      pagina_id: PAGINA_ID,
      criterio_codigo: CRITERIO,
      estado: 'falla',
      origen: 'manual',
      fecha_revision: resultado?.fecha_revision,
    });
    expect(resultado?.fecha_revision).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('actualiza el resultado existente en vez de duplicarlo', async () => {
    const primerId = await service.guardar(PAGINA_ID, CRITERIO, { estado: 'por_revisar' });
    const segundoId = await service.guardar(PAGINA_ID, CRITERIO, { estado: 'pasa' });

    expect(segundoId).toBe(primerId);

    const resultados = await firstValueFrom(service.dePagina$(PAGINA_ID));
    expect(resultados).toHaveLength(1);
    expect(resultados[0].estado).toBe('pasa');
  });

  it('dePagina$() no devuelve resultados de otra página', async () => {
    await service.guardar(PAGINA_ID, CRITERIO, { estado: 'falla' });
    await service.guardar(PAGINA_ID + 1, CRITERIO, { estado: 'falla' });

    const resultados = await firstValueFrom(service.dePagina$(PAGINA_ID));

    expect(resultados).toHaveLength(1);
    expect(resultados[0].pagina_id).toBe(PAGINA_ID);
  });

  it('porPaginaYCriterio$() no devuelve nada si todavía no se ha guardado ese criterio', async () => {
    const resultado = await firstValueFrom(service.porPaginaYCriterio$(PAGINA_ID, '9.9.9'));
    expect(resultado).toBeUndefined();
  });
});
