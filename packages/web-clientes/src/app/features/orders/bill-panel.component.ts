import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { BillService } from '../../core/services/bill.service'
import { Bill, PointsRule, billErrorMessage } from '../../core/models/bill.model'

@Component({
  selector: 'app-bill-panel',
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bill card">
      <h2>La cuenta</h2>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (bill(); as b) {
        <dl class="breakdown">
          <div><dt>Subtotal</dt><dd>{{ b.subtotal | number:'1.2-2' }} €</dd></div>
          @if (b.discountCode) {
            <div class="discount">
              <dt>Código {{ b.discountCode }}</dt>
              <dd>-{{ b.codeDiscount | number:'1.2-2' }} €</dd>
            </div>
          }
          @if (b.pointsUsed > 0) {
            <div class="discount">
              <dt>{{ b.pointsUsed }} puntos canjeados</dt>
              <dd>-{{ b.pointsDiscount | number:'1.2-2' }} €</dd>
            </div>
          }
          <div class="total"><dt>Total</dt><dd>{{ b.total | number:'1.2-2' }} €</dd></div>
        </dl>
      } @else {
        <p class="subtotal">Subtotal: <strong>{{ subtotal() | number:'1.2-2' }} €</strong></p>

        <div class="form-group">
          <label for="discount-code">Código de descuento</label>
          <input id="discount-code" class="form-control" type="text" maxlength="40" placeholder="Opcional"
            [ngModel]="code()" (ngModelChange)="code.set($event)" />
        </div>

        @if (availableRules().length > 0) {
          <div class="form-group">
            <label for="points-rule">Canjear puntos (tienes {{ balance() }})</label>
            <select id="points-rule" class="form-control"
              [ngModel]="selectedRuleId()" (ngModelChange)="selectedRuleId.set($event)">
              <option value="">No canjear</option>
              @for (r of availableRules(); track r.id) {
                <option [value]="r.id">{{ r.points }} puntos = {{ r.discountAmount | number:'1.2-2' }} € de descuento</option>
              }
            </select>
          </div>
        } @else if (rules().length > 0) {
          <p class="hint">Tienes {{ balance() }} puntos: aún no alcanzan ningún tramo de canje.</p>
        }

        @if (error()) {
          <div class="alert-error">{{ error() }}</div>
        }

        <button type="button" class="btn btn-primary" [disabled]="submitting()" (click)="onRequest()">
          {{ submitting() ? 'Pidiendo la cuenta...' : 'Pedir la cuenta' }}
        </button>
      }
    </section>
  `,
  styles: [`
    .bill {
      margin-top: 16px;
      padding: 24px;
    }
    h2 {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .subtotal, .hint {
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .breakdown > div {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .breakdown dd {
      margin: 0;
    }
    .discount {
      color: var(--green-light);
    }
    .total {
      border-top: 1px dashed var(--border-color);
      margin-top: 8px;
      padding-top: 12px !important;
      font-size: 18px;
      font-weight: 700;
    }
  `]
})
export class BillPanelComponent {
  readonly orderId = input.required<string>()
  readonly restaurantId = input.required<string>()
  readonly subtotal = input.required<number>()

  private readonly billService = inject(BillService)

  protected readonly bill = signal<Bill | null>(null)
  protected readonly rules = signal<PointsRule[]>([])
  protected readonly balance = signal(0)
  protected readonly loading = signal(true)
  protected readonly submitting = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly code = signal('')
  protected readonly selectedRuleId = signal('')

  protected readonly availableRules = computed(() => this.rules().filter(rule => rule.points <= this.balance()))

  constructor() {
    effect(() => {
      const orderId = this.orderId()
      const restaurantId = this.restaurantId()
      untracked(() => void this.load(orderId, restaurantId))
    })
  }

  private async load(orderId: string, restaurantId: string): Promise<void> {
    this.loading.set(true)
    const [bill, rules, points] = await Promise.all([
      firstValueFrom(this.billService.getBill(orderId)).catch(() => null),
      firstValueFrom(this.billService.getPointsRules(restaurantId)).catch(() => []),
      firstValueFrom(this.billService.getMyPoints(restaurantId)).catch(() => ({ balance: 0 }))
    ])
    this.bill.set(bill)
    this.rules.set(rules)
    this.balance.set(points.balance)
    this.loading.set(false)
  }

  protected async onRequest(): Promise<void> {
    const discountCode = this.code().trim()
    const pointsRuleId = this.selectedRuleId()
    this.error.set(null)
    this.submitting.set(true)
    try {
      const bill = await firstValueFrom(this.billService.requestBill(this.orderId(), {
        ...(discountCode && { discountCode }),
        ...(pointsRuleId && { pointsRuleId })
      }))
      this.bill.set(bill)
    } catch (err) {
      this.error.set(billErrorMessage(err, 'No se pudo pedir la cuenta.'))
    } finally {
      this.submitting.set(false)
    }
  }
}
