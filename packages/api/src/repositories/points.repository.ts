import { Database } from '@config/database.js'
import type { PointsRule } from '@models/discount.model.js'

interface PointsRuleRow {
    id: string
    restaurantId: string
    points: number
    discountAmount: number
}

const SELECT_RULE = 'SELECT id, restaurant_id as restaurantId, points, discount_amount as discountAmount FROM points_rules'

export interface PointsRepository {
    findRuleById(id: string): Promise<PointsRule | null>
    findRuleByPoints(restaurantId: string, points: number): Promise<PointsRule | null>
    findRulesByRestaurantId(restaurantId: string): Promise<PointsRule[]>
    saveRule(rule: PointsRule): Promise<void>
    deleteRule(id: string): Promise<void>
    getBalance(clientId: string, restaurantId: string): Promise<number>
    setBalance(clientId: string, restaurantId: string, balance: number): Promise<void>
    deductPoints(clientId: string, restaurantId: string, points: number): Promise<boolean>
}

export class SqlitePointsRepository implements PointsRepository {
    constructor(private db: Database) {}

    async findRuleById(id: string): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRuleRow>(`${SELECT_RULE} WHERE id = ?`, [id])
        return row ? { ...row } : null
    }

    async findRuleByPoints(restaurantId: string, points: number): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRuleRow>(`${SELECT_RULE} WHERE restaurant_id = ? AND points = ?`, [restaurantId, points])
        return row ? { ...row } : null
    }

    async findRulesByRestaurantId(restaurantId: string): Promise<PointsRule[]> {
        const rows = await this.db.all<PointsRuleRow>(`${SELECT_RULE} WHERE restaurant_id = ? ORDER BY points ASC`, [restaurantId])
        return rows.map(row => ({ ...row }))
    }

    async saveRule(rule: PointsRule): Promise<void> {
        await this.db.run(
            `INSERT INTO points_rules (id, restaurant_id, points, discount_amount)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                points = excluded.points,
                discount_amount = excluded.discount_amount`,
            [rule.id, rule.restaurantId, rule.points, rule.discountAmount]
        )
    }

    async deleteRule(id: string): Promise<void> {
        await this.db.run('DELETE FROM points_rules WHERE id = ?', [id])
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        const row = await this.db.get<{ balance: number }>(
            'SELECT balance FROM customer_points WHERE client_id = ? AND restaurant_id = ?',
            [clientId, restaurantId]
        )
        return row?.balance ?? 0
    }

    async setBalance(clientId: string, restaurantId: string, balance: number): Promise<void> {
        await this.db.run(
            `INSERT INTO customer_points (client_id, restaurant_id, balance) VALUES (?, ?, ?)
             ON CONFLICT(client_id, restaurant_id) DO UPDATE SET balance = excluded.balance`,
            [clientId, restaurantId, balance]
        )
    }

    async deductPoints(clientId: string, restaurantId: string, points: number): Promise<boolean> {
        const result = await this.db.run(
            'UPDATE customer_points SET balance = balance - ? WHERE client_id = ? AND restaurant_id = ? AND balance >= ?',
            [points, clientId, restaurantId, points]
        )
        return result.changes === 1
    }
}
