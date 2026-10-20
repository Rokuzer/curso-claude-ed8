import type { Bill } from '@models/bill.model.js'
import type { Order } from '@models/order.model.js'
import type { BillRepository } from '@repositories/bill.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { DiscountRepository } from '@repositories/discount.repository.js'
import type { PointsRepository } from '@repositories/points.repository.js'
import type { DiscountCode, PointsRule } from '@models/discount.model.js'
import {
    OrderNotFoundError, BillAlreadyRequestedError, BillNotFoundError, DiscountCodeNotFoundError,
    DiscountCodeInvalidError, InsufficientPointsError, PointsRuleNotFoundError
} from '@errors/DomainErrors.js'

export interface BillRequest {
    discountCode?: string
    pointsRuleId?: string
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

export class BillService {
    constructor(
        private readonly billRepository: BillRepository,
        private readonly orderRepository: OrderRepository,
        private readonly discountRepository: DiscountRepository,
        private readonly pointsRepository: PointsRepository
    ) {}

    async requestBill(orderId: string, clientId: string, request: BillRequest): Promise<Bill> {
        const order = await this.getOwnOrder(orderId, clientId)
        if (await this.billRepository.findByOrderId(orderId)) {
            throw new BillAlreadyRequestedError()
        }

        const subtotal = this.subtotalOf(order)
        const discount = request.discountCode ? await this.findUsableDiscount(order.restaurantId, request.discountCode) : null
        const rule = request.pointsRuleId ? await this.findRule(order.restaurantId, request.pointsRuleId) : null
        if (rule && await this.pointsRepository.getBalance(clientId, order.restaurantId) < rule.points) {
            throw new InsufficientPointsError()
        }

        const codeDiscount = discount ? Math.min(this.discountAmount(discount, subtotal), subtotal) : 0
        const pointsDiscount = rule ? Math.min(rule.discountAmount, round2(subtotal - codeDiscount)) : 0

        await this.consume(clientId, order.restaurantId, discount, rule)

        const bill: Bill = {
            orderId,
            subtotal,
            discountCode: discount?.code ?? null,
            codeDiscount,
            pointsUsed: rule?.points ?? 0,
            pointsDiscount,
            total: round2(subtotal - codeDiscount - pointsDiscount),
            createdAt: new Date().toISOString()
        }
        await this.billRepository.save(bill)
        return bill
    }

    async getBill(orderId: string, clientId: string): Promise<Bill> {
        await this.getOwnOrder(orderId, clientId)
        const bill = await this.billRepository.findByOrderId(orderId)
        if (!bill) {
            throw new BillNotFoundError()
        }
        return bill
    }

    private async getOwnOrder(orderId: string, clientId: string): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order || order.clientId !== clientId) {
            throw new OrderNotFoundError()
        }
        return order
    }

    private async findUsableDiscount(restaurantId: string, rawCode: string): Promise<DiscountCode> {
        const discount = await this.discountRepository.findByCode(restaurantId, rawCode.trim().toUpperCase())
        if (!discount) {
            throw new DiscountCodeNotFoundError()
        }
        if (!discount.active) {
            throw new DiscountCodeInvalidError('Discount code is not active')
        }
        if (discount.expiresAt !== null && Date.parse(discount.expiresAt) < Date.now()) {
            throw new DiscountCodeInvalidError('Discount code has expired')
        }
        if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
            throw new DiscountCodeInvalidError('Discount code has no uses left')
        }
        return discount
    }

    private async findRule(restaurantId: string, ruleId: string): Promise<PointsRule> {
        const rule = await this.pointsRepository.findRuleById(ruleId)
        if (!rule || rule.restaurantId !== restaurantId) {
            throw new PointsRuleNotFoundError()
        }
        return rule
    }

    private discountAmount(discount: DiscountCode, subtotal: number): number {
        return round2(discount.type === 'percent' ? subtotal * discount.value / 100 : discount.value)
    }

    private async consume(clientId: string, restaurantId: string, discount: DiscountCode | null, rule: PointsRule | null): Promise<void> {
        if (rule && !await this.pointsRepository.deductPoints(clientId, restaurantId, rule.points)) {
            throw new InsufficientPointsError()
        }
        if (discount && !await this.discountRepository.incrementUsed(discount.id)) {
            if (rule) {
                const balance = await this.pointsRepository.getBalance(clientId, restaurantId)
                await this.pointsRepository.setBalance(clientId, restaurantId, balance + rule.points)
            }
            throw new DiscountCodeInvalidError('Discount code has no uses left')
        }
    }

    private subtotalOf(order: Order): number {
        return round2(order.items.reduce((sum, item) => sum + (item.dishPrice ?? 0) * item.quantity, 0))
    }
}
