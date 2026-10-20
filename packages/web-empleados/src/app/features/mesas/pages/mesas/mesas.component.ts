import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus, TABLE_STATUSES } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses = TABLE_STATUSES;
  readonly expandedTableId = signal<string | null>(null);

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId ?? undefined;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  changeStatus(table: Table, status: TableStatus): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId || table.status === status) return;
    this.tableStore.updateStatus(restaurantId, table.id, status);
  }

  toggleOrders(table: Table): void {
    this.expandedTableId.update(id => (id === table.id ? null : table.id));
  }

  ordersOf(table: Table) {
    return this.tableStore.ordersByTable()[table.id] ?? [];
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`;
  }
}
