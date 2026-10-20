import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { CurrencyPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { EMPTY, map } from 'rxjs'
import { DiscountStore } from '../../store/discount.store'
import { discountErrorMessage } from '../../models/discount.model'

@Component({
  selector: 'app-points-rules',
  imports: [FormsModule, RouterLink, CurrencyPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './points-rules.component.html',
  styleUrl: './points-rules.component.css'
})
export class PointsRulesComponent {
  protected readonly store = inject(DiscountStore)
  private readonly route = inject(ActivatedRoute)

  private readonly restaurantId = toSignal(
    (this.route.parent?.paramMap ?? EMPTY).pipe(map(params => params.get('restaurantId') ?? '')),
    { initialValue: '' }
  )

  protected readonly listUrl = computed(() => `/restaurants/${this.restaurantId()}/discounts`)
  protected readonly points = signal<number | null>(null)
  protected readonly discountAmount = signal<number | null>(null)
  protected readonly saving = signal(false)
  protected readonly formError = signal<string | null>(null)
  protected readonly canAdd = computed(() => (this.points() ?? 0) >= 1 && (this.discountAmount() ?? 0) > 0)

  constructor() {
    effect(() => {
      const restaurantId = this.restaurantId()
      if (restaurantId) {
        untracked(() => this.store.loadRules(restaurantId))
      }
    })
  }

  protected async onAdd(): Promise<void> {
    const restaurantId = this.restaurantId()
    const points = this.points()
    const discountAmount = this.discountAmount()
    if (!restaurantId || points === null || discountAmount === null) return
    this.formError.set(null)
    this.saving.set(true)
    try {
      await this.store.createRule(restaurantId, { points, discountAmount })
      this.points.set(null)
      this.discountAmount.set(null)
    } catch (err) {
      this.formError.set(discountErrorMessage(err, 'Error al guardar el tramo.'))
    } finally {
      this.saving.set(false)
    }
  }

  protected async onDelete(id: string): Promise<void> {
    const restaurantId = this.restaurantId()
    if (!restaurantId) return
    if (confirm('¿Estás seguro de eliminar este tramo?')) {
      try {
        await this.store.deleteRule(restaurantId, id)
      } catch (err) {
        alert(discountErrorMessage(err, 'Error al eliminar el tramo.'))
      }
    }
  }
}
