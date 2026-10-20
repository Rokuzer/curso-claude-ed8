import type { Bill } from '@models/bill.model.js'
import type { Order } from '@models/order.model.js'
import type { BillRepository } from '@repositories/bill.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { DiscountRepository } from '@repositories/discount.repository.js'
import type { PointsRepository } from '@repositories/points.repository.js'
import { OrderNotFoundError, BillAlreadyRequestedError, BillNotFoundError } from '@errors/DomainErrors.js'

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

    async requestBill(orderId: string, clientId: string, _request: BillRequest): Promise<Bill> {
        const order = await this.getOwnOrder(orderId, clientId)
        if (await this.billRepository.findByOrderId(orderId)) {
            throw new BillAlreadyRequestedError()
        }

        const subtotal = this.subtotalOf(order)
        const bill: Bill = {
            orderId,
            subtotal,
            discountCode: null,
            codeDiscount: 0,
            pointsUsed: 0,
            pointsDiscount: 0,
            total: subtotal,
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

    private subtotalOf(order: Order): number {
        return round2(order.items.reduce((sum, item) => sum + (item.dishPrice ?? 0) * item.quantity, 0))
    }
}
