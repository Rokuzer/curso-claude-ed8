import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DatePipe } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { EMPTY, map } from 'rxjs'
import { DiscountStore } from '../../store/discount.store'
import { DISCOUNT_TYPE_LABELS, discountErrorMessage, discountValueLabel } from '../../models/discount.model'

@Component({
  selector: 'app-discount-list',
  imports: [RouterLink, DatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './discount-list.component.html',
  styleUrl: './discount-list.component.css'
})
export class DiscountListComponent {
  protected readonly store = inject(DiscountStore)
  private readonly route = inject(ActivatedRoute)

  protected readonly typeLabels = DISCOUNT_TYPE_LABELS
  protected readonly valueLabel = discountValueLabel

  // The component is reused when only :restaurantId changes, so derive it from the param stream
  private readonly restaurantId = toSignal(
    (this.route.parent?.paramMap ?? EMPTY).pipe(map(params => params.get('restaurantId') ?? '')),
    { initialValue: '' }
  )

  constructor() {
    effect(() => {
      const restaurantId = this.restaurantId()
      if (restaurantId) {
        untracked(() => this.store.loadDiscounts(restaurantId))
      }
    })
  }

  protected async onDelete(id: string): Promise<void> {
    const restaurantId = this.restaurantId()
    if (!restaurantId) return
    if (confirm('¿Estás seguro de eliminar este código de descuento?')) {
      try {
        await this.store.delete(restaurantId, id)
      } catch (err) {
        alert(discountErrorMessage(err, 'Error al eliminar el código.'))
      }
    }
  }
}
