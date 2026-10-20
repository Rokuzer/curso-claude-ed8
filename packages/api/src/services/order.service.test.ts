import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotOccupiedError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let tables: MockTableRepository
    let service: OrderService
    const items = [{ dishId: 'dish-1', quantity: 2, notes: null }]

    beforeEach(async () => {
        tables = new MockTableRepository()
        service = new OrderService(new MockOrderRepository(), tables)
        await tables.save({ id: 't-occ', restaurantId: 'rest-1', number: 7, description: null, capacity: 4, status: 'ocupada', occupiedAt: new Date().toISOString(), occupiedBy: null })
        await tables.save({ id: 't-free', restaurantId: 'rest-1', number: 8, description: null, capacity: 4, status: 'libre', occupiedAt: null, occupiedBy: null })
        await tables.save({ id: 't-other', restaurantId: 'rest-2', number: 1, description: null, capacity: 4, status: 'ocupada', occupiedAt: new Date().toISOString(), occupiedBy: null })
    })

    it('creates the order on an occupied table of the restaurant and returns tableNumber', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: 't-occ', clientId: 'c', items })
        expect(order.tableId).toBe('t-occ')
        expect(order.tableNumber).toBe(7)
    })

    it('still allows orders without table', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: null, clientId: 'c', items })
        expect(order.tableId).toBeNull()
        expect(order.tableNumber).toBeNull()
    })

    it('rejects unknown table or table of another restaurant', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 'nope', clientId: 'c', items })).rejects.toThrow(TableNotFoundError)
        await expect(service.create({ restaurantId: 'rest-1', tableId: 't-other', clientId: 'c', items })).rejects.toThrow(TableNotFoundError)
    })

    it('rejects a table that is not occupied', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 't-free', clientId: 'c', items })).rejects.toThrow(TableNotOccupiedError)
    })
})
