import { Routes } from '@angular/router';
import { confirmarSalidaSinGuardar } from './features/auditorias/criterio-revision/confirmar-salida';

// La zona pública ('bienvenida' y, desde la spec 24, las vistas
// informativas) vive fuera del shell interno (sin drawer/nav lateral) y
// comparte LayoutPublico. Va antes del padre del Shell: si ningún hijo
// público coincide, el router prueba el siguiente padre con path ''. Todo lo
// demás cuelga de Shell como ruta padre — Shell ya trae su propio
// <router-outlet> (ver shell.html) — así que las rutas hijas conservan
// exactamente las mismas URLs que antes ('auditorias', 'auditorias/nueva',
// etc.).
//
// Orden de specs/02-maqueta-m3.md tabla de pantallas — las rutas estáticas
// ('nueva', 'progreso', 'exportar', 'escaneo', 'criterios/:codigo') van
// antes que sus equivalentes con parámetro para que Angular no las confunda
// con un :id.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },
  {
    path: '',
    loadComponent: () =>
      import('./features/publico/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      {
        path: 'bienvenida',
        title: 'Bienvenida',
        loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
      },
      {
        path: 'funcionalidades',
        title: 'Funcionalidades',
        loadComponent: () =>
          import('./features/publico/funcionalidades/funcionalidades').then(
            (m) => m.Funcionalidades,
          ),
      },
      {
        path: 'como-funciona',
        title: 'Cómo funciona',
        loadComponent: () =>
          import('./features/publico/como-funciona/como-funciona').then((m) => m.ComoFunciona),
      },
      {
        path: 'accesibilidad',
        title: 'Declaración de accesibilidad',
        loadComponent: () =>
          import('./features/publico/accesibilidad/accesibilidad').then((m) => m.Accesibilidad),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./shared/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'auditorias',
        title: 'Auditorías',
        loadComponent: () =>
          import('./features/auditorias/auditorias-listado/auditorias-listado').then(
            (m) => m.AuditoriasListado,
          ),
      },
      {
        path: 'auditorias/nueva',
        title: 'Nueva auditoría',
        loadComponent: () =>
          import('./features/auditorias/auditoria-nueva/auditoria-nueva').then(
            (m) => m.AuditoriaNueva,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/paginas/nueva',
        title: 'Añadir página',
        loadComponent: () =>
          import('./features/auditorias/pagina-nueva/pagina-nueva').then((m) => m.PaginaNueva),
      },
      {
        path: 'auditorias/:auditoriaId/paginas/:paginaId/escaneo',
        title: 'Escaneo automático',
        loadComponent: () =>
          import('./features/auditorias/pagina-escaneo/pagina-escaneo').then(
            (m) => m.PaginaEscaneo,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/paginas/:paginaId/editar',
        title: 'Editar página',
        loadComponent: () =>
          import('./features/auditorias/pagina-nueva/pagina-nueva').then((m) => m.PaginaNueva),
      },
      {
        path: 'auditorias/:auditoriaId/paginas/:paginaId/criterios/:codigo',
        title: (ruta) => `Revisión del criterio ${ruta.paramMap.get('codigo')}`,
        // Pregunta antes de salir con un hallazgo a medio redactar
        // (specs/22-informe-ux.md P8).
        canDeactivate: [confirmarSalidaSinGuardar],
        loadComponent: () =>
          import('./features/auditorias/criterio-revision/criterio-revision').then(
            (m) => m.CriterioRevision,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/paginas/:paginaId',
        title: 'Checklist de la página',
        loadComponent: () =>
          import('./features/auditorias/pagina-checklist/pagina-checklist').then(
            (m) => m.PaginaChecklist,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/progreso',
        title: 'Progreso de la auditoría',
        loadComponent: () =>
          import('./features/auditorias/auditoria-progreso/auditoria-progreso').then(
            (m) => m.AuditoriaProgreso,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/exportar',
        title: 'Exportar informe',
        loadComponent: () =>
          import('./features/auditorias/auditoria-exportar/auditoria-exportar').then(
            (m) => m.AuditoriaExportar,
          ),
      },
      {
        path: 'auditorias/:auditoriaId/editar',
        title: 'Editar auditoría',
        loadComponent: () =>
          import('./features/auditorias/auditoria-nueva/auditoria-nueva').then(
            (m) => m.AuditoriaNueva,
          ),
      },
      {
        path: 'auditorias/:auditoriaId',
        title: 'Detalle de la auditoría',
        loadComponent: () =>
          import('./features/auditorias/auditoria-detalle/auditoria-detalle').then(
            (m) => m.AuditoriaDetalle,
          ),
      },
      {
        path: 'biblioteca',
        title: 'Biblioteca de hallazgos',
        loadComponent: () =>
          import('./features/biblioteca-hallazgos/biblioteca-listado/biblioteca-listado').then(
            (m) => m.BibliotecaListado,
          ),
      },
      {
        path: 'biblioteca/:id',
        title: 'Plantilla de hallazgo',
        loadComponent: () =>
          import('./features/biblioteca-hallazgos/hallazgo-detalle/hallazgo-detalle').then(
            (m) => m.HallazgoDetalle,
          ),
      },
      {
        path: 'componentes',
        title: 'Catálogo de componentes',
        loadComponent: () =>
          import('./features/componentes/componentes-listado/componentes-listado').then(
            (m) => m.ComponentesListado,
          ),
      },
      { path: '**', redirectTo: 'auditorias' },
    ],
  },
];
