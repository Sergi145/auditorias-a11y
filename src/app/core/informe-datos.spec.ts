import { TestBed } from '@angular/core/testing';
import { AuditoriasService } from './auditorias';
import { ComponentesService } from './componentes';
import { CriteriosWcagService } from './criterios-wcag';
import { DatabaseService } from './database';
import { HallazgosService } from './hallazgos';
import { InformeDatosService } from './informe-datos';
import type { Auditoria } from './models';
import { PaginasService } from './paginas';
import { ResultadosService } from './resultados';

const AUDITORIA_EJEMPLO: Omit<Auditoria, 'id'> = {
  nombre: 'Portal de prueba',
  cliente: 'Cliente de prueba',
  url_base: 'https://ejemplo.test',
  fecha_inicio: '2026-09-10',
  estandar_objetivo: 'AA',
  estado: 'en_progreso',
};

describe('InformeDatosService', () => {
  let service: InformeDatosService;
  let auditorias: AuditoriasService;
  let paginas: PaginasService;
  let resultados: ResultadosService;
  let hallazgos: HallazgosService;
  let componentes: ComponentesService;
  let database: DatabaseService;
  let totalCriteriosWcag: number;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InformeDatosService);
    auditorias = TestBed.inject(AuditoriasService);
    paginas = TestBed.inject(PaginasService);
    resultados = TestBed.inject(ResultadosService);
    hallazgos = TestBed.inject(HallazgosService);
    componentes = TestBed.inject(ComponentesService);
    database = TestBed.inject(DatabaseService);
    totalCriteriosWcag = TestBed.inject(CriteriosWcagService).todos().length;
  });

  afterEach(async () => {
    await database.db.hallazgos.clear();
    await database.db.resultados.clear();
    await database.db.paginas.clear();
    await database.db.auditorias.clear();
  });

  async function crearAuditoriaConPagina(nombrePagina = 'Home') {
    const auditoriaId = await auditorias.crear(AUDITORIA_EJEMPLO);
    const paginaId = await paginas.crear({
      auditoria_id: auditoriaId,
      nombre: nombrePagina,
      url: 'https://ejemplo.test/',
      notas_generales: '',
    });
    return { auditoriaId, paginaId };
  }

  it('devuelve undefined si la auditoría no existe', async () => {
    const informe = await service.ensamblar(999999);
    expect(informe).toBeUndefined();
  });

  it('una auditoría sin páginas devuelve checklist y hallazgos vacíos, con progreso vacío', async () => {
    const auditoriaId = await auditorias.crear(AUDITORIA_EJEMPLO);
    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.paginas).toEqual([]);
    expect(informe?.checklist).toEqual([]);
    expect(informe?.hallazgos).toEqual([]);
    expect(informe?.progreso).toEqual({
      totalCriterios: 0,
      revisados: 0,
      porcentajeRevisado: 0,
      fallosPorSeveridad: { critica: 0, alta: 0, media: 0, baja: 0 },
    });
  });

  it('un criterio sin Resultado guardado se mapea a "por_revisar" en el checklist', async () => {
    const { auditoriaId, paginaId } = await crearAuditoriaConPagina();
    await resultados.guardar(paginaId, '1.1.1', { estado: 'pasa' });

    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.checklist).toHaveLength(totalCriteriosWcag);
    const filaSinRevisar = informe?.checklist.find((fila) => fila.criterio.codigo === '1.4.3');
    expect(filaSinRevisar?.estado).toBe('por_revisar');
    const filaRevisada = informe?.checklist.find((fila) => fila.criterio.codigo === '1.1.1');
    expect(filaRevisada?.estado).toBe('pasa');
  });

  it('agrupa los hallazgos bajo la página y el criterio correctos, uno por resultado en falla', async () => {
    const { auditoriaId, paginaId: paginaAId } = await crearAuditoriaConPagina('Home');
    const paginaBId = await paginas.crear({
      auditoria_id: auditoriaId,
      nombre: 'Contacto',
      url: 'https://ejemplo.test/contacto',
      notas_generales: '',
    });

    const resultadoA = await resultados.guardar(paginaAId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'alta', notas: 'Falta alt' });
    await hallazgos.crear({ resultado_id: resultadoA, severidad: 'critica', notas: 'Contraste insuficiente' });

    const resultadoB = await resultados.guardar(paginaBId, '2.4.7', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoB, severidad: 'baja', notas: 'Foco poco visible' });

    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.hallazgos).toHaveLength(3);
    expect(
      informe?.hallazgos.filter((h) => h.pagina.nombre === 'Home' && h.criterio.codigo === '1.1.1'),
    ).toHaveLength(2);
    expect(
      informe?.hallazgos.filter((h) => h.pagina.nombre === 'Contacto' && h.criterio.codigo === '2.4.7'),
    ).toHaveLength(1);
  });

  it('no incluye hallazgos cuyo resultado ya no está en "falla"', async () => {
    const { auditoriaId, paginaId } = await crearAuditoriaConPagina();
    const resultadoId = await resultados.guardar(paginaId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Falta alt' });

    await resultados.guardar(paginaId, '1.1.1', { estado: 'pasa' });

    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.hallazgos).toEqual([]);
  });

  it('resuelve el nombre de un componente aunque esté oculto', async () => {
    const { auditoriaId, paginaId } = await crearAuditoriaConPagina();
    const componenteId = await componentes.crear('Modal de prueba');
    await componentes.alternarVisible(componenteId, false);

    const resultadoId = await resultados.guardar(paginaId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({
      resultado_id: resultadoId,
      severidad: 'media',
      componente_id: componenteId,
      notas: 'No cierra con Escape',
    });

    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.hallazgos[0].componenteNombre).toBe('Modal de prueba');

    await database.db.componentes.delete(componenteId);
  });

  it('deja componenteNombre indefinido cuando el hallazgo no tiene componente asignado', async () => {
    const { auditoriaId, paginaId } = await crearAuditoriaConPagina();
    const resultadoId = await resultados.guardar(paginaId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoId, severidad: 'media', notas: 'Sin componente' });

    const informe = await service.ensamblar(auditoriaId);

    expect(informe?.hallazgos[0].componenteNombre).toBeUndefined();
  });
});
