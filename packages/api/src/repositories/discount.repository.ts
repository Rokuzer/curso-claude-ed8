import { Database } from '@config/database.js'
import type { DiscountCode } from '@models/discount.model.js'
import { normalizeDiscountType } from '@models/discount.model.js'

interface DiscountRow {
    id: string
    restaurantId: string
    code: string
    type: string
    value: number
    active: number
    expiresAt: string | null
    maxUses: number | null
    usedCount: number
}

const SELECT_DISCOUNT = 'SELECT id, restaurant_id as restaurantId, code, type, value, active, expires_at as expiresAt, max_uses as maxUses, used_count as usedCount FROM discount_codes'

export interface DiscountRepository {
    findById(id: string): Promise<DiscountCode | null>
    findByCode(restaurantId: string, code: string): Promise<DiscountCode | null>
    findByRestaurantId(restaurantId: string): Promise<DiscountCode[]>
    save(discount: DiscountCode): Promise<void>
    delete(id: string): Promise<void>
    incrementUsed(id: string): Promise<boolean>
}

export class SqliteDiscountRepository implements DiscountRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountRow>(`${SELECT_DISCOUNT} WHERE id = ?`, [id])
        return row ? this.mapToDiscount(row) : null
    }

    async findByCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountRow>(`${SELECT_DISCOUNT} WHERE restaurant_id = ? AND code = ?`, [restaurantId, code])
        return row ? this.mapToDiscount(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        const rows = await this.db.all<DiscountRow>(`${SELECT_DISCOUNT} WHERE restaurant_id = ? ORDER BY code ASC`, [restaurantId])
        return rows.map(row => this.mapToDiscount(row))
    }

    async save(discount: DiscountCode): Promise<void> {
        await this.db.run(
            `INSERT INTO discount_codes (id, restaurant_id, code, type, value, active, expires_at, max_uses, used_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                type = excluded.type,
                value = excluded.value,
                active = excluded.active,
                expires_at = excluded.expires_at,
                max_uses = excluded.max_uses,
                used_count = excluded.used_count`,
            [discount.id, discount.restaurantId, discount.code, discount.type, discount.value, discount.active ? 1 : 0, discount.expiresAt, discount.maxUses, discount.usedCount]
        )
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM discount_codes WHERE id = ?', [id])
    }

    async incrementUsed(id: string): Promise<boolean> {
        const result = await this.db.run(
            'UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)',
            [id]
        )
        return result.changes === 1
    }

    private mapToDiscount(row: DiscountRow): DiscountCode {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            code: row.code,
            type: normalizeDiscountType(row.type),
            value: row.value,
            active: row.active === 1,
            expiresAt: row.expiresAt,
            maxUses: row.maxUses,
            usedCount: row.usedCount
        }
    }
}
