import { Routes } from '@angular/router';

export const MESAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/mesas/mesas.component').then(m => m.MesasComponent),
  }
];
