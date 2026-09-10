import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from './database';
import type { Pagina } from './models';
import { PaginasService } from './paginas';

const PAGINA_EJEMPLO: Omit<Pagina, 'id'> = {
  auditoria_id: 1,
  nombre: 'Home',
  url: 'https://ejemplo.test/',
  notas_generales: '',
};

describe('PaginasService', () => {
  let service: PaginasService;
  let database: DatabaseService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaginasService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.paginas.clear();
  });

  it('crea una página y aparece en deAuditoria$()', async () => {
    const id = await service.crear(PAGINA_EJEMPLO);
    const paginas = await firstValueFrom(service.deAuditoria$(PAGINA_EJEMPLO.auditoria_id));
    expect(paginas).toEqual([{ id, ...PAGINA_EJEMPLO }]);
  });

  it('devuelve la página correcta por id', async () => {
    const id = await service.crear(PAGINA_EJEMPLO);
    const pagina = await firstValueFrom(service.porId$(id));
    expect(pagina).toEqual({ id, ...PAGINA_EJEMPLO });
  });

  it('actualiza los datos de una página existente', async () => {
    const id = await service.crear(PAGINA_EJEMPLO);
    await service.actualizar(id, { nombre: 'Contacto', notas_generales: 'Revisar formulario' });
    const pagina = await firstValueFrom(service.porId$(id));
    expect(pagina?.nombre).toBe('Contacto');
    expect(pagina?.notas_generales).toBe('Revisar formulario');
  });

  it('elimina una página', async () => {
    const id = await service.crear(PAGINA_EJEMPLO);
    await service.eliminar(id);
    const pagina = await firstValueFrom(service.porId$(id));
    expect(pagina).toBeUndefined();
  });

  it('deAuditoria$() no devuelve páginas de otra auditoría', async () => {
    const id = await service.crear(PAGINA_EJEMPLO);
    // Id explícito (fuera del rango autoincremental) para la página de la
    // otra auditoría: evita pedir una segunda clave autoincremental en el
    // mismo test — ver la nota sobre fake-indexeddb + zone.js en
    // auditorias.spec.ts.
    await database.db.paginas.put({
      ...PAGINA_EJEMPLO,
      id: 999_999,
      auditoria_id: PAGINA_EJEMPLO.auditoria_id + 1,
      nombre: 'Otra auditoría',
    });

    const paginas = await firstValueFrom(service.deAuditoria$(PAGINA_EJEMPLO.auditoria_id));

    expect(paginas).toEqual([{ id, ...PAGINA_EJEMPLO }]);
  });
});
