import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CATALOGO_COMPONENTES_BOOTSTRAP } from './componentes-catalogo';
import { ComponentesService } from './componentes';
import { DatabaseService } from './database';

describe('ComponentesService', () => {
  let service: ComponentesService;
  let database: DatabaseService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComponentesService);
    database = TestBed.inject(DatabaseService);
  });

  it('siembra el catálogo Bootstrap una sola vez', async () => {
    await service.catalogoListo;

    const total = await database.db.componentes.count();
    expect(total).toBe(CATALOGO_COMPONENTES_BOOTSTRAP.length);

    const todos = await firstValueFrom(service.todos$());
    expect(todos.every((componente) => componente.origen === 'bootstrap')).toBe(true);
  });

  it('crea un componente personalizado visible', async () => {
    const id = await service.crear('Chip de filtro');
    const todos = await firstValueFrom(service.todos$());
    const creado = todos.find((componente) => componente.id === id);

    expect(creado).toEqual({ id, nombre: 'Chip de filtro', origen: 'personalizado', visible: true });

    await database.db.componentes.delete(id);
  });

  it('renombra un componente existente', async () => {
    const id = await service.crear('Selector de fecha');
    await service.renombrar(id, 'Selector de fecha custom');

    const todos = await firstValueFrom(service.todos$());
    expect(todos.find((componente) => componente.id === id)?.nombre).toBe('Selector de fecha custom');

    await database.db.componentes.delete(id);
  });

  it('alterna la visibilidad de un componente', async () => {
    const id = await service.crear('Componente de prueba');

    await service.alternarVisible(id, false);
    let visibles = await firstValueFrom(service.visibles$());
    expect(visibles.some((componente) => componente.id === id)).toBe(false);

    await service.alternarVisible(id, true);
    visibles = await firstValueFrom(service.visibles$());
    expect(visibles.some((componente) => componente.id === id)).toBe(true);

    await database.db.componentes.delete(id);
  });

  it('elimina un componente personalizado', async () => {
    const id = await service.crear('Componente a borrar');
    await service.eliminar(id);

    const todos = await firstValueFrom(service.todos$());
    expect(todos.some((componente) => componente.id === id)).toBe(false);
  });
});
