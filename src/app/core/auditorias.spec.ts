import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuditoriasService } from './auditorias';
import { DatabaseService } from './database';
import type { Auditoria } from './models';

const AUDITORIA_EJEMPLO: Omit<Auditoria, 'id'> = {
  nombre: 'Portal de prueba',
  cliente: 'Cliente de prueba',
  url_base: 'https://ejemplo.test',
  fecha_inicio: '2026-09-10',
  estandar_objetivo: 'AA',
  estado: 'en_progreso',
};

describe('AuditoriasService', () => {
  let service: AuditoriasService;
  let database: DatabaseService;

  // Una sola conexión Dexie para todo el archivo (patrón recomendado por
  // Dexie en tests): recrearla en cada test abriría una nueva conexión
  // sobre el mismo nombre de base de datos en fake-indexeddb y provoca
  // ConstraintError espurios al reabrir un esquema ya creado.
  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditoriasService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.auditorias.clear();
    await database.db.paginas.clear();
  });

  it('crea una auditoría y la devuelve en todas$()', async () => {
    const id = await service.crear(AUDITORIA_EJEMPLO);
    const auditorias = await firstValueFrom(service.todas$());
    expect(auditorias).toEqual([{ id, ...AUDITORIA_EJEMPLO }]);
  });

  it('actualiza los datos de una auditoría existente', async () => {
    const id = await service.crear(AUDITORIA_EJEMPLO);
    await service.actualizar(id, { nombre: 'Nombre actualizado' });
    const auditoria = await firstValueFrom(service.porId$(id));
    expect(auditoria?.nombre).toBe('Nombre actualizado');
  });

  it('cambia el estado de una auditoría', async () => {
    const id = await service.crear(AUDITORIA_EJEMPLO);
    await service.cambiarEstado(id, 'archivada');
    const auditoria = await firstValueFrom(service.porId$(id));
    expect(auditoria?.estado).toBe('archivada');
  });

  it('elimina una auditoría junto con sus páginas (cascada)', async () => {
    const id = await service.crear(AUDITORIA_EJEMPLO);
    await database.db.paginas.bulkAdd([
      { auditoria_id: id, nombre: 'Home', url: 'https://ejemplo.test/', notas_generales: '' },
      { auditoria_id: id, nombre: 'Contacto', url: 'https://ejemplo.test/contacto', notas_generales: '' },
    ]);

    await service.eliminar(id);

    const auditoria = await firstValueFrom(service.porId$(id));
    const paginasRestantes = await database.db.paginas.where('auditoria_id').equals(id).toArray();
    expect(auditoria).toBeUndefined();
    expect(paginasRestantes).toEqual([]);
  });

  it('no toca páginas de otras auditorías al eliminar en cascada', async () => {
    const idBorrada = await service.crear(AUDITORIA_EJEMPLO);
    const idOtra = idBorrada + 1000; // otra auditoría cualquiera, no tiene que existir de verdad para esta prueba
    await database.db.paginas.bulkAdd([
      { auditoria_id: idBorrada, nombre: 'Home', url: 'https://ejemplo.test/', notas_generales: '' },
      { auditoria_id: idOtra, nombre: 'Home', url: 'https://ejemplo.test/', notas_generales: '' },
    ]);

    await service.eliminar(idBorrada);

    const paginasOtra = await database.db.paginas.where('auditoria_id').equals(idOtra).toArray();
    expect(paginasOtra.length).toBe(1);
  });
});
