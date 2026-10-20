import { Component, inject, OnInit, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { TableSessionStore } from '../../core/store/table-session.store'
import { Restaurant } from '../../core/models/restaurant.model'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Cargando...' }}</h1>
          <p>Indica cuántas personas sois y elige una mesa</p>
        </div>
      </div>

      @if (existing(); as s) {
        <div class="card current-table">
          <p>Ya tienes la mesa {{ s.table.number }} en este restaurante.</p>
          <a [routerLink]="['/restaurants', restaurantId, 'menu']" class="btn btn-primary">Ir a la carta</a>
        </div>
      }

      <form class="card party-form" (ngSubmit)="search()">
        <label for="partySize">Número de personas</label>
        <input id="partySize" name="partySize" type="number" min="1" step="1" class="input"
               [ngModel]="partySize()" (ngModelChange)="partySize.set($event)" />
        <button type="submit" class="btn btn-primary" [disabled]="loading() || !validPartySize()">
          Ver mesas disponibles
        </button>
      </form>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (tables() !== null) {
        @if (tables()!.length === 0) {
          <div class="empty-state card">
            <p>No hay mesas disponibles para {{ searchedSize() }} personas</p>
          </div>
        } @else {
          <div class="table-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                      (click)="selectedId.set(table.id)">
                <strong>Mesa {{ table.number }}</strong>
                <span>Capacidad: {{ table.capacity }}</span>
                @if (table.description) {
                  <span class="desc">{{ table.description }}</span>
                }
              </button>
            }
          </div>
          <div class="actions">
            <button class="btn btn-primary" [disabled]="!selectedId() || occupying()" (click)="continue()">
              @if (occupying()) { Reservando mesa... } @else { Continuar }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .back-link { color: var(--text-muted); font-size: 13px; }
    .party-form { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px 20px; margin-bottom: 20px; }
    .party-form .input { width: 100px; }
    .current-table { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; margin-bottom: 20px; }
    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .table-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; text-align: left; cursor: pointer; }
    .table-card.selected { border-color: var(--green-medium); background: var(--green-glow); }
    .table-card .desc { color: var(--text-muted); font-size: 13px; }
    .actions { display: flex; justify-content: flex-end; margin-top: 20px; }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly restaurantService = inject(RestaurantService)
  private readonly tableService = inject(TableService)
  private readonly tableSession = inject(TableSessionStore)

  restaurantId = ''
  readonly restaurant = signal<Restaurant | null>(null)
  readonly partySize = signal<number | null>(2)
  readonly searchedSize = signal(0)
  readonly tables = signal<Table[] | null>(null)
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)
  readonly existing = signal(this.tableSession.session())

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    if (!this.tableSession.hasTableFor(this.restaurantId)) this.existing.set(null)
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => this.error.set('Error al cargar el restaurante')
    })
  }

  validPartySize(): boolean {
    const n = this.partySize()
    return typeof n === 'number' && Number.isInteger(n) && n >= 1
  }

  search(): void {
    if (!this.validPartySize()) return
    const size = this.partySize()!
    this.loading.set(true)
    this.error.set(null)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, size).subscribe({
      next: (tables) => {
        this.searchedSize.set(size)
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const tableId = this.selectedId()
    if (!tableId) return
    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, tableId, this.searchedSize()).subscribe({
      next: (table) => {
        this.tableSession.set({ restaurantId: this.restaurantId, partySize: this.searchedSize(), table })
        this.router.navigate(['/restaurants', this.restaurantId, 'menu'])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.search()
          this.error.set('Esa mesa acaba de ser ocupada. Elige otra.')
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
