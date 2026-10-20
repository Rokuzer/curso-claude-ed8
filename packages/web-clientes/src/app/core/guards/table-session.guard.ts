import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { TableSessionStore } from '../store/table-session.store'

export const tableSessionGuard: CanActivateFn = (route) => {
  const restaurantId = route.paramMap.get('id') ?? ''
  const store = inject(TableSessionStore)
  const router = inject(Router)
  return store.hasTableFor(restaurantId) || router.createUrlTree(['/restaurants', restaurantId])
}
