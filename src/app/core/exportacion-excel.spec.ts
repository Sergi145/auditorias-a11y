import { TestBed } from '@angular/core/testing';
import { ExportacionExcelService } from './exportacion-excel';
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

const PAGINA: Pagina = { id: 1, auditoria_id: 1, nombre: 'Home', url: 'https://ejemplo.test/', notas_generales: '' };

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

const INFORME: InformeAuditoria = {
  auditoria: AUDITORIA,
  paginas: [PAGINA],
  checklist: [
    { pagina: PAGINA, criterio: CRITERIO_1_1_1, estado: 'pasa' },
    { pagina: PAGINA, criterio: CRITERIO_1_4_3, estado: 'por_revisar' },
  ],
  hallazgos: [
    { pagina: PAGINA, criterio: CRITERIO_1_1_1, severidad: 'alta', componenteNombre: 'Botón', notas: 'Falta alt' },
    { pagina: PAGINA, criterio: CRITERIO_1_4_3, severidad: 'baja', notas: 'Sin componente asignado' },
  ],
  progreso: {
    totalCriterios: 2,
    revisados: 1,
    porcentajeRevisado: 50,
    fallosPorSeveridad: { critica: 0, alta: 1, media: 0, baja: 1 },
    criteriosPorEstado: { pasa: 1, falla: 0, no_aplica: 0, por_revisar: 1 },
    fallosPorCategoria: { perceptible: 2, operable: 0, comprensible: 0, robusto: 0 },
  },
};

describe('ExportacionExcelService', () => {
  let service: ExportacionExcelService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportacionExcelService);
  });

  it('filasChecklist() traduce cada fila con etiquetas legibles y el estado implícito', () => {
    const filas = service.filasChecklist(INFORME);

    expect(filas).toEqual([
      {
        Página: 'Home',
        'Código de criterio': '1.1.1',
        'Nombre de criterio': 'Contenido no textual',
        Nivel: 'A',
        Categoría: 'Perceptible',
        Estado: 'Pasa',
      },
      {
        Página: 'Home',
        'Código de criterio': '1.4.3',
        'Nombre de criterio': 'Contraste (mínimo)',
        Nivel: 'AA',
        Categoría: 'Perceptible',
        Estado: 'Por revisar',
      },
    ]);
  });

  it('filasHallazgos() traduce severidad y deja el componente vacío si no hay ninguno asignado', () => {
    const filas = service.filasHallazgos(INFORME);

    expect(filas).toEqual([
      {
        Página: 'Home',
        'Código de criterio': '1.1.1',
        Severidad: 'Alta',
        Componente: 'Botón',
        Notas: 'Falta alt',
      },
      {
        Página: 'Home',
        'Código de criterio': '1.4.3',
        Severidad: 'Baja',
        Componente: '',
        Notas: 'Sin componente asignado',
      },
    ]);
  });
});
