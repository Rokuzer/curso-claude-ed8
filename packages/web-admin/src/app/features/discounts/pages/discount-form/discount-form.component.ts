import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DiscountStore } from '../../store/discount.store'
import { DiscountService } from '../../services/discount.service'
import {
  DISCOUNT_TYPES, DISCOUNT_TYPE_LABELS, discountErrorMessage, fromDateInput, toDateInput,
  type DiscountType
} from '../../models/discount.model'

interface DiscountFormState {
  code: string
  type: DiscountType
  value: number | null
  active: boolean
  expiresAt: string
  maxUses: number | null
}

@Component({
  selector: 'app-discount-form',
  imports: [FormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './discount-form.component.html',
  styleUrl: './discount-form.component.css'
})
export class DiscountFormComponent {
  private readonly store = inject(DiscountStore)
  private readonly service = inject(DiscountService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  private readonly restaurantId = this.route.parent?.snapshot.paramMap.get('restaurantId') ?? ''
  private readonly discountId = this.route.snapshot.paramMap.get('id')

  protected readonly types = DISCOUNT_TYPES
  protected readonly typeLabels = DISCOUNT_TYPE_LABELS
  protected readonly isEditing = this.discountId !== null
  protected readonly pageTitle = this.isEditing ? 'Editar código' : 'Nuevo código'
  protected readonly listUrl = `/restaurants/${this.restaurantId}/discounts`

  protected readonly loading = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly form = signal<DiscountFormState>({
    code: '',
    type: 'percent',
    value: null,
    active: true,
    expiresAt: '',
    maxUses: null
  })
  protected readonly valueMax = computed(() => (this.form().type === 'percent' ? 100 : null))

  constructor() {
    if (this.isEditing && this.restaurantId) {
      void this.load()
    }
  }

  protected patch(changes: Partial<DiscountFormState>): void {
    this.form.update(current => ({ ...current, ...changes }))
  }

  private async load(): Promise<void> {
    this.loading.set(true)
    try {
      const discount = await firstValueFrom(this.service.getById(this.restaurantId, this.discountId!))
      this.form.set({
        code: discount.code,
        type: discount.type,
        value: discount.value,
        active: discount.active,
        expiresAt: toDateInput(discount.expiresAt),
        maxUses: discount.maxUses
      })
    } catch {
      this.error.set('No se pudo cargar el código.')
    } finally {
      this.loading.set(false)
    }
  }

  protected async onSubmit(): Promise<void> {
    const { value, ...rest } = this.form()
    if (value === null) return
    this.error.set(null)
    this.loading.set(true)
    const dto = {
      code: rest.code.trim(),
      type: rest.type,
      value,
      active: rest.active,
      expiresAt: fromDateInput(rest.expiresAt),
      maxUses: rest.maxUses
    }
    try {
      if (this.discountId) {
        await this.store.update(this.restaurantId, this.discountId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      await this.router.navigateByUrl(this.listUrl)
    } catch (err) {
      this.error.set(discountErrorMessage(err, 'Error al guardar el código.'))
    } finally {
      this.loading.set(false)
    }
  }
}
