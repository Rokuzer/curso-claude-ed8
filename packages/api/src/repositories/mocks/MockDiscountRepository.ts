import type { DiscountRepository } from '@repositories/discount.repository.js'
import type { DiscountCode } from '@models/discount.model.js'

export class MockDiscountRepository implements DiscountRepository {
    private discounts: Map<string, DiscountCode> = new Map()

    async findById(id: string): Promise<DiscountCode | null> {
        const discount = this.discounts.get(id)
        return discount ? { ...discount } : null
    }

    async findByCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        const discount = Array.from(this.discounts.values()).find(d => d.restaurantId === restaurantId && d.code === code)
        return discount ? { ...discount } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        return Array.from(this.discounts.values())
            .filter(d => d.restaurantId === restaurantId)
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(d => ({ ...d }))
    }

    async save(discount: DiscountCode): Promise<void> {
        this.discounts.set(discount.id, { ...discount })
    }

    async delete(id: string): Promise<void> {
        this.discounts.delete(id)
    }

    async incrementUsed(id: string): Promise<boolean> {
        const discount = this.discounts.get(id)
        if (!discount || (discount.maxUses !== null && discount.usedCount >= discount.maxUses)) return false
        this.discounts.set(id, { ...discount, usedCount: discount.usedCount + 1 })
        return true
    }
}
