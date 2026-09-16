import { TestBed } from '@angular/core/testing';
import { ExportacionPdfService } from './exportacion-pdf';
import type { InformeAuditoria } from './informe-datos';
import type { Auditoria, CriterioWCAG, Pagina } from './models';

const AUDITORIA: Auditoria = {
  id: 1,
  nombre: 'Portal de prueba',
  cliente: 'Cliente de prueba',
  url_base: 'https://ejemplo.test',
  fecha_inicio: '2026-09-10',
  estandar_objetivo: 'AA',
  estado: 'en_progreso',
};

const PAGINA_HOME: Pagina = { id: 1, auditoria_id: 1, nombre: 'Home', url: 'https://ejemplo.test/', notas_generales: '' };
const PAGINA_CONTACTO: Pagina = {
  id: 2,
  auditoria_id: 1,
  nombre: 'Contacto',
  url: 'https://ejemplo.test/contacto',
  notas_generales: '',
};

const CRITERIO_1_1_1: CriterioWCAG = {
  codigo: '1.1.1',
  nombre: 'Contenido no textual',
  nivel: 'A',
  categoria: 'perceptible',
  descripcion: '',
  tecnicas: [],
};

const CRITERIO_1_4_3: CriterioWCAG = {
  codigo: '1.4.3',
  nombre: 'Contraste (mínimo)',
  nivel: 'AA',
  categoria: 'perceptible',
  descripcion: '',
  tecnicas: [],
};

const CRITERIO_2_4_7: CriterioWCAG = {
  codigo: '2.4.7',
  nombre: 'Foco visible',
  nivel: 'AA',
  categoria: 'operable',
  descripcion: '',
  tecnicas: [],
};

const INFORME: InformeAuditoria = {
  auditoria: AUDITORIA,
  paginas: [PAGINA_HOME, PAGINA_CONTACTO],
  checklist: [],
  hallazgos: [
    { pagina: PAGINA_HOME, criterio: CRITERIO_1_1_1, severidad: 'baja', notas: 'N1 — falta alt decorativo' },
    { pagina: PAGINA_HOME, criterio: CRITERIO_1_1_1, severidad: 'critica', notas: 'N2 — falta alt en logo' },
    { pagina: PAGINA_HOME, criterio: CRITERIO_1_4_3, severidad: 'alta', notas: 'N3 — contraste insuficiente' },
    {
      pagina: PAGINA_CONTACTO,
      criterio: CRITERIO_2_4_7,
      severidad: 'media',
      componenteNombre: 'Modal',
      notas: 'N4 — el foco no es visible al abrir',
    },
  ],
  progreso: {
    totalCriterios: 110,
    revisados: 4,
    porcentajeRevisado: 4,
    fallosPorSeveridad: { critica: 1, alta: 1, media: 1, baja: 1 },
  },
};

describe('ExportacionPdfService', () => {
  let service: ExportacionPdfService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportacionPdfService);
  });

  it('resumenEjecutivoLineas() incluye cliente, estándar, % revisado y fallos por severidad', () => {
    const lineas = service.resumenEjecutivoLineas(INFORME);

    expect(lineas).toEqual([
      'Cliente: Cliente de prueba',
      'Estándar objetivo: WCAG 2.2 AA',
      'Revisado: 4% (4/110 criterios)',
      'Fallos por severidad: Crítica 1 · Alta 1 · Media 1 · Baja 1',
      expect.stringMatching(/^Fecha de generación: \d{4}-\d{2}-\d{2}$/),
    ]);
  });

  it('filasTablaHallazgos() ordena crítica → alta → media → baja', () => {
    const filas = service.filasTablaHallazgos(INFORME);

    expect(filas).toEqual([
      ['Home', '1.1.1', 'Crítica', '', 'N2 — falta alt en logo'],
      ['Home', '1.4.3', 'Alta', '', 'N3 — contraste insuficiente'],
      ['Contacto', '2.4.7', 'Media', 'Modal', 'N4 — el foco no es visible al abrir'],
      ['Home', '1.1.1', 'Baja', '', 'N1 — falta alt decorativo'],
    ]);
  });

  it('agruparPorPaginaYCriterio() agrupa por página y, dentro, por criterio', () => {
    const grupos = service.agruparPorPaginaYCriterio(INFORME);

    expect(grupos).toHaveLength(2);

    expect(grupos[0].pagina.nombre).toBe('Home');
    expect(grupos[0].criterios).toHaveLength(2);
    expect(grupos[0].criterios[0].criterio.codigo).toBe('1.1.1');
    expect(grupos[0].criterios[0].hallazgos.map((h) => h.notas)).toEqual([
      'N1 — falta alt decorativo',
      'N2 — falta alt en logo',
    ]);
    expect(grupos[0].criterios[1].criterio.codigo).toBe('1.4.3');

    expect(grupos[1].pagina.nombre).toBe('Contacto');
    expect(grupos[1].criterios).toHaveLength(1);
    expect(grupos[1].criterios[0].criterio.codigo).toBe('2.4.7');
    expect(grupos[1].criterios[0].hallazgos[0].componenteNombre).toBe('Modal');
  });

  it('agruparPorPaginaYCriterio() omite páginas sin hallazgos en falla', () => {
    const informeSinHallazgos: InformeAuditoria = { ...INFORME, hallazgos: [] };
    expect(service.agruparPorPaginaYCriterio(informeSinHallazgos)).toEqual([]);
  });
});
