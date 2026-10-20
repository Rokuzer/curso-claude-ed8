import type { PointsRepository } from '@repositories/points.repository.js'
import type { PointsRule } from '@models/discount.model.js'

export class MockPointsRepository implements PointsRepository {
    private rules: Map<string, PointsRule> = new Map()
    private balances: Map<string, number> = new Map()

    async findRuleById(id: string): Promise<PointsRule | null> {
        const rule = this.rules.get(id)
        return rule ? { ...rule } : null
    }

    async findRuleByPoints(restaurantId: string, points: number): Promise<PointsRule | null> {
        const rule = Array.from(this.rules.values()).find(r => r.restaurantId === restaurantId && r.points === points)
        return rule ? { ...rule } : null
    }

    async findRulesByRestaurantId(restaurantId: string): Promise<PointsRule[]> {
        return Array.from(this.rules.values())
            .filter(r => r.restaurantId === restaurantId)
            .sort((a, b) => a.points - b.points)
            .map(r => ({ ...r }))
    }

    async saveRule(rule: PointsRule): Promise<void> {
        this.rules.set(rule.id, { ...rule })
    }

    async deleteRule(id: string): Promise<void> {
        this.rules.delete(id)
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        return this.balances.get(this.key(clientId, restaurantId)) ?? 0
    }

    async setBalance(clientId: string, restaurantId: string, balance: number): Promise<void> {
        this.balances.set(this.key(clientId, restaurantId), balance)
    }

    async deductPoints(clientId: string, restaurantId: string, points: number): Promise<boolean> {
        const balance = await this.getBalance(clientId, restaurantId)
        if (balance < points) return false
        this.balances.set(this.key(clientId, restaurantId), balance - points)
        return true
    }

    private key(clientId: string, restaurantId: string): string {
        return `${clientId}:${restaurantId}`
    }
}
