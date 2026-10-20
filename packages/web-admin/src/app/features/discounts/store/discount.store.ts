import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { DiscountService } from '../services/discount.service'
import type { DiscountCode, DiscountInputDto, PointsRule, PointsRuleInputDto } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class DiscountStore {
  private readonly service = inject(DiscountService)

  private readonly _discounts = signal<DiscountCode[]>([])
  private readonly _rules = signal<PointsRule[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private _currentRestaurantId: string | null = null

  readonly discounts = this._discounts.asReadonly()
  readonly rules = this._rules.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  private static sortedRules(list: PointsRule[]): PointsRule[] {
    return [...list].sort((a, b) => a.points - b.points)
  }

  async loadDiscounts(restaurantId: string): Promise<void> {
    this._currentRestaurantId = restaurantId
    this._discounts.set([])
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getAll(restaurantId))
      if (this._currentRestaurantId !== restaurantId) return
      this._discounts.set(data)
    } catch {
      if (this._currentRestaurantId !== restaurantId) return
      this._error.set('No se pudieron cargar los códigos de descuento.')
    } finally {
      if (this._currentRestaurantId === restaurantId) this._loading.set(false)
    }
  }

  async loadRules(restaurantId: string): Promise<void> {
    this._currentRestaurantId = restaurantId
    this._rules.set([])
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getRules(restaurantId))
      if (this._currentRestaurantId !== restaurantId) return
      this._rules.set(data)
    } catch {
      if (this._currentRestaurantId !== restaurantId) return
      this._error.set('No se pudieron cargar los tramos de puntos.')
    } finally {
      if (this._currentRestaurantId === restaurantId) this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: DiscountInputDto): Promise<void> {
    const discount = await firstValueFrom(this.service.create(restaurantId, dto))
    this._discounts.update(list => [...list, discount].sort((a, b) => a.code.localeCompare(b.code)))
  }

  async update(restaurantId: string, id: string, dto: DiscountInputDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._discounts.update(list => list.map(d => d.id === id ? updated : d).sort((a, b) => a.code.localeCompare(b.code)))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._discounts.update(list => list.filter(d => d.id !== id))
  }

  async createRule(restaurantId: string, dto: PointsRuleInputDto): Promise<void> {
    const rule = await firstValueFrom(this.service.createRule(restaurantId, dto))
    this._rules.update(list => DiscountStore.sortedRules([...list, rule]))
  }

  async deleteRule(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.deleteRule(restaurantId, id))
    this._rules.update(list => list.filter(r => r.id !== id))
  }
}
