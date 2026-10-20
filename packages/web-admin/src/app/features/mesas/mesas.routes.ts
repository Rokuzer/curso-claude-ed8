import type { Routes } from '@angular/router'

export const MESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/mesa-list/mesa-list.component').then(m => m.MesaListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/mesa-form/mesa-form.component').then(m => m.MesaFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/mesa-form/mesa-form.component').then(m => m.MesaFormComponent)
  }
]
