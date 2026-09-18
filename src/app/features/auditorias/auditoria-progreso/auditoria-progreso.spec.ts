import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuditoriasService } from '../../../core/auditorias';
import { DatabaseService } from '../../../core/database';
import { HallazgosService } from '../../../core/hallazgos';
import type { Auditoria } from '../../../core/models';
import { PaginasService } from '../../../core/paginas';
import { ResultadosService } from '../../../core/resultados';
import { AuditoriaProgreso } from './auditoria-progreso';

const AUDITORIA: Omit<Auditoria, 'id'> = {
  nombre: 'Auditoría de prueba',
  cliente: 'Cliente de prueba',
  url_base: 'https://ejemplo.test',
  fecha_inicio: '2026-01-01',
  estandar_objetivo: 'AA',
  estado: 'en_progreso',
};

describe('AuditoriaProgreso', () => {
  let auditorias: AuditoriasService;
  let paginas: PaginasService;
  let resultados: ResultadosService;
  let hallazgos: HallazgosService;
  let database: DatabaseService;

  // El componente lee el id de la ruta de forma síncrona al construirse
  // (`this.route.snapshot.paramMap.get('auditoriaId')`), así que basta con
  // un ActivatedRoute falso cuyo id se fija justo antes de crear el
  // fixture — no hace falta (ni se puede) hacer overrideProvider() después
  // de que el módulo de pruebas ya se instanció con la primera inyección.
  let auditoriaIdRuta = 0;
  const activatedRouteFalso = {
    snapshot: { paramMap: { get: (clave: string) => (clave === 'auditoriaId' ? String(auditoriaIdRuta) : null) } },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: activatedRouteFalso }],
    });
    auditorias = TestBed.inject(AuditoriasService);
    paginas = TestBed.inject(PaginasService);
    resultados = TestBed.inject(ResultadosService);
    hallazgos = TestBed.inject(HallazgosService);
    database = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await database.db.hallazgos.clear();
    await database.db.resultados.clear();
    await database.db.paginas.clear();
    await database.db.auditorias.clear();
  });

  // El progreso llega de forma asíncrona (dos cadenas de liveQuery sobre
  // Dexie encadenadas con toSignal: auditoria() y datos()), y esta app no
  // usa zone.js: no hay forma de que el test se entere de que "todavía
  // quedan promesas de IndexedDB por resolver". Se sondea con
  // detectChanges() hasta que el texto pintado deja de cambiar entre dos
  // intentos seguidos (las dos cadenas ya emitieron su valor real), o hasta
  // agotar los intentos.
  async function crearFixture(auditoriaId: number): Promise<ComponentFixture<AuditoriaProgreso>> {
    auditoriaIdRuta = auditoriaId;
    const fixture = TestBed.createComponent(AuditoriaProgreso);
    let anterior: string | null = null;
    for (let intento = 0; intento < 50; intento++) {
      fixture.detectChanges();
      const actual: string = fixture.nativeElement.textContent;
      if (actual === anterior && fixture.nativeElement.querySelector('h1')) break;
      anterior = actual;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    fixture.detectChanges();
    return fixture;
  }

  function encabezados(fixture: ComponentFixture<AuditoriaProgreso>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h2) =>
      (h2 as HTMLElement).textContent?.trim(),
    ) as string[];
  }

  it('pinta los cuatro bloques de distribución, en orden, con el bloque de "Revisado" antes', async () => {
    const auditoriaId = await auditorias.crear(AUDITORIA);
    const paginaId = await paginas.crear({
      auditoria_id: auditoriaId,
      nombre: 'Home',
      url: 'https://ejemplo.test/',
      notas_generales: '',
    });
    const resultadoId = await resultados.guardar(paginaId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoId, severidad: 'alta', notas: 'Falta alt' });

    const fixture = await crearFixture(auditoriaId);

    expect(encabezados(fixture)).toEqual([
      'Estado de los criterios',
      'Fallos por severidad',
      'Fallos por principio WCAG',
      'Páginas con más incidencias',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Revisado');
  });

  it('sin hallazgos registrados, muestra el aviso en los bloques de severidad y de principio', async () => {
    const auditoriaId = await auditorias.crear(AUDITORIA);
    await paginas.crear({
      auditoria_id: auditoriaId,
      nombre: 'Home',
      url: 'https://ejemplo.test/',
      notas_generales: '',
    });

    const fixture = await crearFixture(auditoriaId);

    const avisos = Array.from(fixture.nativeElement.querySelectorAll('p')).filter((p) =>
      (p as HTMLElement).textContent?.includes('Todavía no hay hallazgos registrados.'),
    );
    expect(avisos.length).toBe(2);
  });

  it('con hallazgos registrados, no muestra el aviso de "sin hallazgos"', async () => {
    const auditoriaId = await auditorias.crear(AUDITORIA);
    const paginaId = await paginas.crear({
      auditoria_id: auditoriaId,
      nombre: 'Home',
      url: 'https://ejemplo.test/',
      notas_generales: '',
    });
    const resultadoId = await resultados.guardar(paginaId, '1.1.1', { estado: 'falla' });
    await hallazgos.crear({ resultado_id: resultadoId, severidad: 'critica', notas: 'Falta alt' });

    const fixture = await crearFixture(auditoriaId);

    expect(fixture.nativeElement.textContent).not.toContain('Todavía no hay hallazgos registrados.');
  });
});
