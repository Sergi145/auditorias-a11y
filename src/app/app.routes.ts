import { Routes } from '@angular/router';

// Orden de specs/02-maqueta-m3.md tabla de pantallas — las rutas estáticas
// ('nueva', 'progreso', 'exportar', 'escaneo', 'criterios/:codigo') van
// antes que sus equivalentes con parámetro para que Angular no las confunda
// con un :id.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auditorias' },
  {
    path: 'auditorias',
    loadComponent: () =>
      import('./features/auditorias/auditorias-listado/auditorias-listado').then(
        (m) => m.AuditoriasListado,
      ),
  },
  {
    path: 'auditorias/nueva',
    loadComponent: () =>
      import('./features/auditorias/auditoria-nueva/auditoria-nueva').then(
        (m) => m.AuditoriaNueva,
      ),
  },
  {
    path: 'auditorias/:auditoriaId/paginas/nueva',
    loadComponent: () =>
      import('./features/auditorias/pagina-nueva/pagina-nueva').then((m) => m.PaginaNueva),
  },
  {
    path: 'auditorias/:auditoriaId/paginas/:paginaId/escaneo',
    loadComponent: () =>
      import('./features/auditorias/pagina-escaneo/pagina-escaneo').then((m) => m.PaginaEscaneo),
  },
  {
    path: 'auditorias/:auditoriaId/paginas/:paginaId/criterios/:codigo',
    loadComponent: () =>
      import('./features/auditorias/criterio-revision/criterio-revision').then(
        (m) => m.CriterioRevision,
      ),
  },
  {
    path: 'auditorias/:auditoriaId/paginas/:paginaId',
    loadComponent: () =>
      import('./features/auditorias/pagina-checklist/pagina-checklist').then(
        (m) => m.PaginaChecklist,
      ),
  },
  {
    path: 'auditorias/:auditoriaId/progreso',
    loadComponent: () =>
      import('./features/auditorias/auditoria-progreso/auditoria-progreso').then(
        (m) => m.AuditoriaProgreso,
      ),
  },
  {
    path: 'auditorias/:auditoriaId/exportar',
    loadComponent: () =>
      import('./features/auditorias/auditoria-exportar/auditoria-exportar').then(
        (m) => m.AuditoriaExportar,
      ),
  },
  {
    path: 'auditorias/:auditoriaId',
    loadComponent: () =>
      import('./features/auditorias/auditoria-detalle/auditoria-detalle').then(
        (m) => m.AuditoriaDetalle,
      ),
  },
  {
    path: 'biblioteca',
    loadComponent: () =>
      import('./features/biblioteca-hallazgos/biblioteca-listado/biblioteca-listado').then(
        (m) => m.BibliotecaListado,
      ),
  },
  {
    path: 'biblioteca/:id',
    loadComponent: () =>
      import('./features/biblioteca-hallazgos/hallazgo-detalle/hallazgo-detalle').then(
        (m) => m.HallazgoDetalle,
      ),
  },
  {
    path: 'componentes',
    loadComponent: () =>
      import('./features/componentes/componentes-listado/componentes-listado').then(
        (m) => m.ComponentesListado,
      ),
  },
  { path: '**', redirectTo: 'auditorias' },
];
