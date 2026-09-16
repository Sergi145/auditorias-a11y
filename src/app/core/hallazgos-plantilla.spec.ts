import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from './database';
import { HallazgosPlantillaService } from './hallazgos-plantilla';
import type { HallazgoPlantilla } from './models';

describe('HallazgosPlantillaService', () => {
  let service: HallazgosPlantillaService;
  let database: DatabaseService;

  const datosBase: Omit<HallazgoPlantilla, 'id' | 'veces_usado' | 'fecha_creacion'> = {
    criterio_codigo: '1.1.1',
    titulo: 'Imagen sin alt',
    descripcion: 'La imagen no tiene texto alternativo.',
    recomendacion_fix: 'Añadir un atributo alt descriptivo.',
    severidad_tipica: 'media',
    etiquetas: ['imagen', 'alt'],
  };

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HallazgosPlantillaService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.hallazgosPlantilla.clear();
  });

  it('crea una plantilla con veces_usado en 0 y fecha_creacion asignada', async () => {
    const id = await service.crear(datosBase);
    const todas = await firstValueFrom(service.todos$());
    const creada = todas.find((plantilla) => plantilla.id === id);

    expect(creada).toEqual({ id, ...datosBase, veces_usado: 0, fecha_creacion: creada!.fecha_creacion });
    expect(creada!.fecha_creacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('sugeridos$ sin componenteId devuelve todas las plantillas del criterio', async () => {
    await service.crear({ ...datosBase, componente_id: 5 });
    await service.crear(datosBase);
    await service.crear({ ...datosBase, criterio_codigo: '1.4.3' });

    const sugeridas = await firstValueFrom(service.sugeridos$('1.1.1'));
    expect(sugeridas).toHaveLength(2);
  });

  it('sugeridos$ con componenteId solo devuelve las de ese componente exacto', async () => {
    const idConComponente = await service.crear({ ...datosBase, componente_id: 5 });
    await service.crear({ ...datosBase, componente_id: 9 });
    await service.crear(datosBase);

    const sugeridas = await firstValueFrom(service.sugeridos$('1.1.1', 5));
    expect(sugeridas).toEqual([expect.objectContaining({ id: idConComponente })]);
  });

  it('actualiza una plantilla existente sin duplicarla', async () => {
    const id = await service.crear(datosBase);
    await service.actualizar(id, { titulo: 'Título editado' });

    const todas = await firstValueFrom(service.todos$());
    expect(todas).toHaveLength(1);
    expect(todas[0].titulo).toBe('Título editado');
  });

  it('elimina una plantilla', async () => {
    const id = await service.crear(datosBase);
    await service.eliminar(id);

    const todas = await firstValueFrom(service.todos$());
    expect(todas.some((plantilla) => plantilla.id === id)).toBe(false);
  });

  it('incrementarUso suma 1 a veces_usado en cada llamada', async () => {
    const id = await service.crear(datosBase);

    await service.incrementarUso(id);
    await service.incrementarUso(id);

    const todas = await firstValueFrom(service.todos$());
    expect(todas.find((plantilla) => plantilla.id === id)?.veces_usado).toBe(2);
  });
});
