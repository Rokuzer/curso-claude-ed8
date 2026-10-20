import { describe, it, expect, beforeEach } from 'vitest'
import { BillService } from './bill.service.js'
import { MockBillRepository } from '@repositories/mocks/MockBillRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockDiscountRepository } from '@repositories/mocks/MockDiscountRepository.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import { OrderNotFoundError, BillAlreadyRequestedError, BillNotFoundError } from '@errors/DomainErrors.js'
import type { Order } from '@models/order.model.js'

const item = (id: string, price: number) => ({ id, dishId: 'dish-1', quantity: 1, notes: null, status: 'entregado' as const, dishPrice: price })

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'order-1', restaurantId: 'rest-1', tableId: null, clientId: 'cli-1', createdAt: new Date(),
    items: [item('i-1', 10), item('i-2', 10)], ...overrides
})

describe('BillService', () => {
    let bills: MockBillRepository
    let orders: MockOrderRepository
    let discounts: MockDiscountRepository
    let points: MockPointsRepository
    let service: BillService

    beforeEach(async () => {
        bills = new MockBillRepository()
        orders = new MockOrderRepository()
        discounts = new MockDiscountRepository()
        points = new MockPointsRepository()
        await orders.create(makeOrder())
        service = new BillService(bills, orders, discounts, points)
    })

    describe('requestBill without discounts', () => {
        it('stores subtotal and total equal to the sum of dish prices', async () => {
            const bill = await service.requestBill('order-1', 'cli-1', {})
            expect(bill).toMatchObject({
                orderId: 'order-1', subtotal: 20, discountCode: null, codeDiscount: 0,
                pointsUsed: 0, pointsDiscount: 0, total: 20
            })
            expect(await bills.findByOrderId('order-1')).toEqual(bill)
        })

        it('rounds amounts to two decimals', async () => {
            await orders.create(makeOrder({ id: 'order-2', items: [item('a', 0.1), item('b', 0.2)] }))
            expect((await service.requestBill('order-2', 'cli-1', {})).subtotal).toBe(0.3)
        })

        it('rejects unknown orders and orders of other clients', async () => {
            await expect(service.requestBill('nope', 'cli-1', {})).rejects.toThrow(OrderNotFoundError)
            await expect(service.requestBill('order-1', 'cli-2', {})).rejects.toThrow(OrderNotFoundError)
        })

        it('rejects a second request for the same order', async () => {
            await service.requestBill('order-1', 'cli-1', {})
            await expect(service.requestBill('order-1', 'cli-1', {})).rejects.toThrow(BillAlreadyRequestedError)
        })
    })

    describe('getBill', () => {
        it('returns the stored bill to its owner', async () => {
            const bill = await service.requestBill('order-1', 'cli-1', {})
            expect(await service.getBill('order-1', 'cli-1')).toEqual(bill)
        })

        it('fails when there is no bill or the order is not the client\'s', async () => {
            await expect(service.getBill('order-1', 'cli-1')).rejects.toThrow(BillNotFoundError)
            await expect(service.getBill('order-1', 'cli-2')).rejects.toThrow(OrderNotFoundError)
        })
    })
})
