import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auditorias' },
  {
    path: 'auditorias',
    loadComponent: () => import('./shared/proximamente/proximamente').then((m) => m.Proximamente),
    data: { titulo: 'Auditorías' },
  },
  {
    path: 'biblioteca',
    loadComponent: () => import('./shared/proximamente/proximamente').then((m) => m.Proximamente),
    data: { titulo: 'Biblioteca de hallazgos' },
  },
  {
    path: 'componentes',
    loadComponent: () => import('./shared/proximamente/proximamente').then((m) => m.Proximamente),
    data: { titulo: 'Componentes' },
  },
  { path: '**', redirectTo: 'auditorias' },
];
