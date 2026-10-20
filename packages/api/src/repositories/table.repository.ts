import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    occupiedAt: string | null
    occupiedBy: string | null
}

const SELECT_TABLE = 'SELECT id, restaurant_id as restaurantId, number, description, capacity, status, occupied_at as occupiedAt, occupied_by as occupiedBy FROM tables'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
    findByRestaurantId(restaurantId: string, status?: string): Promise<Table[]>
    findAvailable(restaurantId: string, partySize?: number): Promise<Table[]>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
    occupyIfFree(id: string, occupiedAt: string, occupiedBy: string | null): Promise<boolean>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? AND number = ?`, [restaurantId, number])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string, status?: string): Promise<Table[]> {
        const rows = status
            ? await this.db.all<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? AND status = ? ORDER BY number ASC`, [restaurantId, status])
            : await this.db.all<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? ORDER BY number ASC`, [restaurantId])
        return rows.map(row => this.mapToTable(row))
    }

    async findAvailable(restaurantId: string, partySize?: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_TABLE} WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ? ORDER BY capacity ASC, number ASC`,
            [restaurantId, partySize ?? 1]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async save(table: Table): Promise<void> {
        await this.db.run(
            `INSERT INTO tables (id, restaurant_id, number, description, capacity, status, occupied_at, occupied_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                number = excluded.number,
                description = excluded.description,
                capacity = excluded.capacity,
                status = excluded.status,
                occupied_at = excluded.occupied_at,
                occupied_by = excluded.occupied_by`,
            [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.occupiedAt, table.occupiedBy]
        )
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    async occupyIfFree(id: string, occupiedAt: string, occupiedBy: string | null): Promise<boolean> {
        const result = await this.db.run(
            `UPDATE tables SET status = 'ocupada', occupied_at = ?, occupied_by = ? WHERE id = ? AND status = 'libre'`,
            [occupiedAt, occupiedBy, id]
        )
        return result.changes === 1
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            occupiedAt: row.occupiedAt,
            occupiedBy: row.occupiedBy
        }
    }
}
