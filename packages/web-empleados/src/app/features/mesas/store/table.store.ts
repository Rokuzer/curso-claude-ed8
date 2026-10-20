import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Table, TableStatus } from '../models/table.model';
import { Order } from '../../orders/models/order.model';
import { TableService } from '../services/table.service';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);

  private readonly _tables = signal<Table[]>([]);
  private readonly _ordersByTable = signal<Record<string, Order[]>>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly ordersByTable = this._ordersByTable.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadTables(restaurantId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const tables = await firstValueFrom(this.tableService.getTables(restaurantId));
      this._tables.set(tables);
      await this.loadOrdersOfOccupied(restaurantId, tables);
    } catch (err: any) {
      this._error.set(err.message || 'Error al cargar mesas');
    } finally {
      this._loading.set(false);
    }
  }

  private async loadOrdersOfOccupied(restaurantId: string, tables: Table[]): Promise<void> {
    const occupied = tables.filter(t => t.status === 'ocupada');
    const results = await Promise.all(
      occupied.map(async t => {
        try {
          return [t.id, await firstValueFrom(this.tableService.getTableOrders(restaurantId, t.id))] as const;
        } catch {
          return [t.id, this._ordersByTable()[t.id] ?? []] as const;
        }
      })
    );
    this._ordersByTable.set(Object.fromEntries(results));
  }

  async updateStatus(restaurantId: string, tableId: string, status: TableStatus): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(this.tableService.updateStatus(restaurantId, tableId, { status }));
      this._tables.update(tables => tables.map(t => (t.id === tableId ? updated : t)));
      if (updated.status === 'ocupada') {
        const orders = await firstValueFrom(this.tableService.getTableOrders(restaurantId, tableId));
        this._ordersByTable.update(map => ({ ...map, [tableId]: orders }));
      } else {
        this._ordersByTable.update(map => {
          const { [tableId]: _removed, ...rest } = map;
          return rest;
        });
      }
    } catch (err: any) {
      this._error.set(err.message || 'Error al cambiar el estado de la mesa');
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.loadTables(restaurantId);
    this.pollingInterval = setInterval(() => {
      this.loadTables(restaurantId);
    }, 30000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
