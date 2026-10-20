import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { DiscountCode, DiscountInputDto, PointsRule, PointsRuleInputDto } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private readonly http = inject(HttpClient)

  private discountsUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/discounts`
  }

  private rulesUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/points-rules`
  }

  getAll(restaurantId: string) {
    return this.http.get<DiscountCode[]>(this.discountsUrl(restaurantId))
  }

  getById(restaurantId: string, id: string) {
    return this.http.get<DiscountCode>(`${this.discountsUrl(restaurantId)}/${id}`)
  }

  create(restaurantId: string, dto: DiscountInputDto) {
    return this.http.post<DiscountCode>(this.discountsUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: DiscountInputDto) {
    return this.http.put<DiscountCode>(`${this.discountsUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.discountsUrl(restaurantId)}/${id}`)
  }

  getRules(restaurantId: string) {
    return this.http.get<PointsRule[]>(this.rulesUrl(restaurantId))
  }

  createRule(restaurantId: string, dto: PointsRuleInputDto) {
    return this.http.post<PointsRule>(this.rulesUrl(restaurantId), dto)
  }

  deleteRule(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.rulesUrl(restaurantId)}/${id}`)
  }
}
