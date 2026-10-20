import { describe, it, expect, beforeEach } from 'vitest'
import { BillService } from './bill.service.js'
import { MockBillRepository } from '@repositories/mocks/MockBillRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockDiscountRepository } from '@repositories/mocks/MockDiscountRepository.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import {
    OrderNotFoundError, BillAlreadyRequestedError, BillNotFoundError, DiscountCodeNotFoundError,
    DiscountCodeInvalidError, InsufficientPointsError, PointsRuleNotFoundError
} from '@errors/DomainErrors.js'
import type { DiscountCode } from '@models/discount.model.js'
import type { Order } from '@models/order.model.js'

const item = (id: string, price: number) => ({ id, dishId: 'dish-1', quantity: 1, notes: null, status: 'entregado' as const, dishPrice: price })

const makeCode = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
    id: 'd-1', restaurantId: 'rest-1', code: 'VERANO', type: 'fixed', value: 5,
    active: true, expiresAt: null, maxUses: null, usedCount: 0, ...overrides
})

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
    describe('requestBill with a discount code', () => {
        it('applies a fixed code', async () => {
            await discounts.save(makeCode())
            const bill = await service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })
            expect(bill).toMatchObject({ discountCode: 'VERANO', codeDiscount: 5, total: 15 })
            expect((await discounts.findById('d-1'))?.usedCount).toBe(1)
        })

        it('applies a percent code ignoring case and spaces', async () => {
            await discounts.save(makeCode({ type: 'percent', value: 10 }))
            const bill = await service.requestBill('order-1', 'cli-1', { discountCode: ' verano ' })
            expect(bill).toMatchObject({ codeDiscount: 2, total: 18 })
        })

        it('never discounts more than the subtotal', async () => {
            await discounts.save(makeCode({ value: 500 }))
            expect(await service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })).toMatchObject({ codeDiscount: 20, total: 0 })
        })

        it('rejects unknown codes and codes of another restaurant without creating the bill', async () => {
            await expect(service.requestBill('order-1', 'cli-1', { discountCode: 'NOPE' })).rejects.toThrow(DiscountCodeNotFoundError)
            await discounts.save(makeCode({ restaurantId: 'rest-2' }))
            await expect(service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })).rejects.toThrow(DiscountCodeNotFoundError)
            expect(await bills.findByOrderId('order-1')).toBeNull()
        })

        it('rejects inactive, expired and exhausted codes', async () => {
            await discounts.save(makeCode({ active: false }))
            await expect(service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })).rejects.toThrow(DiscountCodeInvalidError)
            await discounts.save(makeCode({ expiresAt: '2000-01-01T00:00:00.000Z' }))
            await expect(service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })).rejects.toThrow(DiscountCodeInvalidError)
            await discounts.save(makeCode({ maxUses: 1, usedCount: 1 }))
            await expect(service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO' })).rejects.toThrow(DiscountCodeInvalidError)
            expect(await bills.findByOrderId('order-1')).toBeNull()
        })
    })

    describe('requestBill redeeming points', () => {
        beforeEach(async () => {
            await points.saveRule({ id: 'r-10', restaurantId: 'rest-1', points: 10, discountAmount: 1 })
            await points.saveRule({ id: 'r-100', restaurantId: 'rest-1', points: 100, discountAmount: 10 })
            await points.setBalance('cli-1', 'rest-1', 150)
        })

        it('redeems a rule when the balance is enough', async () => {
            const bill = await service.requestBill('order-1', 'cli-1', { pointsRuleId: 'r-100' })
            expect(bill).toMatchObject({ pointsUsed: 100, pointsDiscount: 10, total: 10 })
            expect(await points.getBalance('cli-1', 'rest-1')).toBe(50)
        })

        it('rejects insufficient balance leaving it untouched', async () => {
            await points.setBalance('cli-1', 'rest-1', 50)
            await expect(service.requestBill('order-1', 'cli-1', { pointsRuleId: 'r-100' })).rejects.toThrow(InsufficientPointsError)
            expect(await points.getBalance('cli-1', 'rest-1')).toBe(50)
            expect(await bills.findByOrderId('order-1')).toBeNull()
        })

        it('rejects unknown rules and rules of another restaurant', async () => {
            await expect(service.requestBill('order-1', 'cli-1', { pointsRuleId: 'nope' })).rejects.toThrow(PointsRuleNotFoundError)
            await points.saveRule({ id: 'r-x', restaurantId: 'rest-2', points: 10, discountAmount: 1 })
            await expect(service.requestBill('order-1', 'cli-1', { pointsRuleId: 'r-x' })).rejects.toThrow(PointsRuleNotFoundError)
        })

        it('combines code and points without a negative total', async () => {
            await discounts.save(makeCode({ value: 15 }))
            const bill = await service.requestBill('order-1', 'cli-1', { discountCode: 'VERANO', pointsRuleId: 'r-100' })
            expect(bill).toMatchObject({ codeDiscount: 15, pointsDiscount: 5, pointsUsed: 100, total: 0 })
        })
    })
})
