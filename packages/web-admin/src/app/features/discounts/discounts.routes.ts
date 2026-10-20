import type { Routes } from '@angular/router'

export const DISCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/discount-list/discount-list.component').then(m => m.DiscountListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/discount-form/discount-form.component').then(m => m.DiscountFormComponent)
  },
  {
    path: 'points',
    loadComponent: () => import('./pages/points-rules/points-rules.component').then(m => m.PointsRulesComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/discount-form/discount-form.component').then(m => m.DiscountFormComponent)
  }
]
