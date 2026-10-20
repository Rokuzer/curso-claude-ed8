import { Injectable, signal } from '@angular/core'
import { Table } from '../models/table.model'

const STORAGE_KEY = 'resttek.tableSession'

export interface TableSession {
  restaurantId: string
  partySize: number
  table: Table
}

@Injectable({ providedIn: 'root' })
export class TableSessionStore {
  private readonly _session = signal<TableSession | null>(this.load())

  readonly session = this._session.asReadonly()

  set(session: TableSession): void {
    this._session.set(session)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // storage unavailable: keep it in memory only
    }
  }

  clear(): void {
    this._session.set(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  hasTableFor(restaurantId: string): boolean {
    return this._session()?.restaurantId === restaurantId
  }

  private load(): TableSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as TableSession) : null
    } catch {
      return null
    }
  }
}
