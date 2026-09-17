import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { DatabaseService } from './database';
import { EvidenciasService, TAMANO_MAXIMO_EVIDENCIA, validarImagenEvidencia } from './evidencias';

function archivo(nombre: string, tipo: string, tamano: number): File {
  return new File([new Uint8Array(tamano)], nombre, { type: tipo });
}

describe('validarImagenEvidencia()', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('acepta %s dentro del límite de tamaño', (tipo) => {
    expect(validarImagenEvidencia(archivo('captura', tipo, 1024))).toBeNull();
  });

  it('rechaza un formato no admitido', () => {
    const resultado = validarImagenEvidencia(archivo('informe.pdf', 'application/pdf', 1024));
    expect(resultado).toBe('formato-no-admitido');
  });

  it('rechaza un GIF aunque sea una imagen', () => {
    const resultado = validarImagenEvidencia(archivo('animacion.gif', 'image/gif', 1024));
    expect(resultado).toBe('formato-no-admitido');
  });

  it('acepta una imagen justo en el límite de 5 MB', () => {
    expect(validarImagenEvidencia(archivo('grande.png', 'image/png', TAMANO_MAXIMO_EVIDENCIA))).toBeNull();
  });

  it('rechaza una imagen de más de 5 MB', () => {
    const resultado = validarImagenEvidencia(archivo('grande.png', 'image/png', TAMANO_MAXIMO_EVIDENCIA + 1));
    expect(resultado).toBe('tamano-excedido');
  });
});

describe('EvidenciasService', () => {
  let service: EvidenciasService;
  let database: DatabaseService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvidenciasService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.evidencias.clear();
  });

  it('deHallazgos$() devuelve vacío sin ids', async () => {
    const evidencias = await firstValueFrom(service.deHallazgos$([]));
    expect(evidencias).toEqual([]);
  });

  it('deHallazgos$() solo devuelve las evidencias de los hallazgos pedidos', async () => {
    await database.db.evidencias.bulkAdd([
      { hallazgo_id: 1, tipo: 'captura', descripcion: 'De 1' },
      { hallazgo_id: 2, tipo: 'captura', descripcion: 'De 2' },
    ]);

    const evidencias = await firstValueFrom(service.deHallazgos$([1]));

    expect(evidencias).toEqual([expect.objectContaining({ hallazgo_id: 1, descripcion: 'De 1' })]);
  });

  it('aplicarCambios() añade, actualiza y elimina en una sola llamada', async () => {
    const idPrevia = (await database.db.evidencias.add({
      hallazgo_id: 5,
      tipo: 'captura',
      descripcion: 'Antes',
    }))!;
    const idAQuitar = (await database.db.evidencias.add({
      hallazgo_id: 5,
      tipo: 'captura',
      descripcion: 'A quitar',
    }))!;
    const nuevoBlob = new Blob(['imagen'], { type: 'image/png' });
    const addSpy = vi.spyOn(database.db.evidencias, 'add');

    await service.aplicarCambios(5, {
      nuevas: [{ archivo: nuevoBlob, descripcion: 'Nueva imagen' }],
      actualizadas: [{ id: idPrevia, descripcion: 'Después' }],
      eliminadas: [idAQuitar],
    });

    // El Blob en sí se verifica aquí por referencia, en la llamada a Dexie:
    // el jsdom/happy-dom del entorno de test usa su propio polyfill de Blob,
    // que fake-indexeddb no clona igual que el Blob nativo de un navegador
    // real (queda vacío al releerlo) — round-trip real verificado en
    // e2e/evidencia-hallazgo.spec.ts, que corre en Chromium de verdad. Dexie
    // muta el objeto pasado a add() para escribirle el id generado, así que
    // se comprueba con objectContaining en vez de con el objeto exacto.
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hallazgo_id: 5,
        tipo: 'captura',
        archivo: nuevoBlob,
        descripcion: 'Nueva imagen',
      }),
    );

    const evidencias = await firstValueFrom(service.deHallazgos$([5]));
    expect(evidencias).toHaveLength(2);

    const actualizada = evidencias.find((evidencia) => evidencia.id === idPrevia);
    expect(actualizada?.descripcion).toBe('Después');

    const nueva = evidencias.find((evidencia) => evidencia.descripcion === 'Nueva imagen');
    expect(nueva).toEqual(expect.objectContaining({ hallazgo_id: 5, tipo: 'captura' }));

    expect(evidencias.some((evidencia) => evidencia.id === idAQuitar)).toBe(false);
  });
});
