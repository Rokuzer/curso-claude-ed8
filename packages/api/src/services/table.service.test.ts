import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import {
    TableNotFoundError, RestaurantNotFoundError, InvalidTableNumberError, InvalidTableCapacityError,
    InvalidTableDescriptionError, InvalidTableStatusError, InvalidPartySizeError, TableCapacityExceededError,
    DuplicatedTableNumberError, TableInUseError, TableNotAvailableError
} from '@errors/DomainErrors.js'

describe('TableService', () => {
    let tables: MockTableRepository
    let orders: MockOrderRepository
    let service: TableService

    beforeEach(async () => {
        tables = new MockTableRepository()
        orders = new MockOrderRepository()
        const restaurants = new MockRestaurantRepository()
        const now = new Date().toISOString()
        await restaurants.save({
            id: 'rest-1', name: 'R', address: 'A', email: 'r@r.com', phone: '+34 600000000',
            ownerFirstName: 'O', ownerLastName: 'W', logoUrl: null, createdAt: now, updatedAt: now
        })
        service = new TableService(tables, restaurants, orders)
    })

    describe('create', () => {
        it('creates a free table with normalized description', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, description: '  Terraza  ' })
            expect(table).toMatchObject({ restaurantId: 'rest-1', number: 1, capacity: 4, description: 'Terraza', status: 'libre', occupiedAt: null, occupiedBy: null })
            expect(await tables.findById(table.id)).not.toBeNull()
        })

        it('stores blank description as null', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, description: '   ' })
            expect(table.description).toBeNull()
        })

        it('rejects description longer than 200 characters', async () => {
            await expect(service.create('rest-1', { number: 1, capacity: 4, description: 'x'.repeat(201) }))
                .rejects.toThrow(InvalidTableDescriptionError)
        })

        it('rejects invalid number and capacity', async () => {
            await expect(service.create('rest-1', { number: 0, capacity: 4 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.create('rest-1', { number: 1.5, capacity: 4 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.create('rest-1', { number: 1, capacity: 0 })).rejects.toThrow(InvalidTableCapacityError)
            await expect(service.create('rest-1', { number: 1, capacity: '4' as any })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('rejects invalid status', async () => {
            await expect(service.create('rest-1', { number: 1, capacity: 4, status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('rejects duplicated number within the restaurant', async () => {
            await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.create('rest-1', { number: 1, capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('throws if the restaurant does not exist', async () => {
            await expect(service.create('nope', { number: 1, capacity: 4 })).rejects.toThrow(RestaurantNotFoundError)
        })

        it('sets occupiedAt when created as ocupada', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, status: 'ocupada' })
            expect(table.occupiedAt).not.toBeNull()
        })
    })

    describe('list', () => {
        it('lists tables ordered by number and filters by status', async () => {
            await service.create('rest-1', { number: 2, capacity: 4 })
            await service.create('rest-1', { number: 1, capacity: 2, status: 'reservada' })
            expect((await service.list('rest-1')).map(t => t.number)).toEqual([1, 2])
            expect((await service.list('rest-1', 'reservada')).map(t => t.number)).toEqual([1])
        })

        it('throws on unknown restaurant and invalid status filter', async () => {
            await expect(service.list('nope')).rejects.toThrow(RestaurantNotFoundError)
            await expect(service.list('rest-1', 'x')).rejects.toThrow(InvalidTableStatusError)
        })
    })

    describe('getById', () => {
        it('throws if the table belongs to another restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.getById('rest-2', table.id)).rejects.toThrow(TableNotFoundError)
            await expect(service.getById('rest-1', 'nope')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('update', () => {
        it('replaces fields and keeps status when omitted', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, status: 'reservada' })
            const updated = await service.update('rest-1', table.id, { number: 7, capacity: 6, description: 'Nueva' })
            expect(updated).toMatchObject({ number: 7, capacity: 6, description: 'Nueva', status: 'reservada' })
        })

        it('allows keeping its own number but not another table number', async () => {
            const a = await service.create('rest-1', { number: 1, capacity: 4 })
            await service.create('rest-1', { number: 2, capacity: 4 })
            await expect(service.update('rest-1', a.id, { number: 1, capacity: 5 })).resolves.toBeDefined()
            await expect(service.update('rest-1', a.id, { number: 2, capacity: 5 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('applies occupiedAt logic when status changes', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            const occupied = await service.update('rest-1', table.id, { number: 1, capacity: 4, status: 'ocupada' })
            expect(occupied.occupiedAt).not.toBeNull()
            const freed = await service.update('rest-1', table.id, { number: 1, capacity: 4, status: 'libre' })
            expect(freed.occupiedAt).toBeNull()
        })

        it('throws if not found', async () => {
            await expect(service.update('rest-1', 'nope', { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('deletes a free table', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await service.delete('rest-1', table.id)
            expect(await tables.findById(table.id)).toBeNull()
        })

        it('refuses to delete an occupied table', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, status: 'ocupada' })
            await expect(service.delete('rest-1', table.id)).rejects.toThrow(TableInUseError)
        })

        it('throws if not found', async () => {
            await expect(service.delete('rest-1', 'nope')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('updateStatus', () => {
        it('sets occupiedAt when becoming ocupada and keeps it if already ocupada', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            const first = await service.updateStatus('rest-1', table.id, 'ocupada')
            expect(first.status).toBe('ocupada')
            expect(first.occupiedAt).not.toBeNull()
            const second = await service.updateStatus('rest-1', table.id, 'ocupada')
            expect(second.occupiedAt).toBe(first.occupiedAt)
        })

        it('clears occupiedAt and occupiedBy when leaving ocupada', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await service.occupy('rest-1', table.id, 2, 'client-1')
            const freed = await service.updateStatus('rest-1', table.id, 'libre')
            expect(freed).toMatchObject({ status: 'libre', occupiedAt: null, occupiedBy: null })
        })

        it('rejects invalid status and unknown table', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.updateStatus('rest-1', table.id, 'rota')).rejects.toThrow(InvalidTableStatusError)
            await expect(service.updateStatus('rest-1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('listAvailable', () => {
        beforeEach(async () => {
            await service.create('rest-1', { number: 1, capacity: 6 })
            await service.create('rest-1', { number: 2, capacity: 2 })
            await service.create('rest-1', { number: 3, capacity: 4 })
            await service.create('rest-1', { number: 4, capacity: 4 })
            await service.create('rest-1', { number: 5, capacity: 4, status: 'ocupada' })
            await service.create('rest-1', { number: 6, capacity: 4, status: 'reservada' })
        })

        it('returns free tables with enough capacity, tightest first', async () => {
            const result = await service.listAvailable('rest-1', 3)
            expect(result.map(t => t.number)).toEqual([3, 4, 1])
        })

        it('returns all free tables without partySize', async () => {
            expect((await service.listAvailable('rest-1')).map(t => t.number)).toEqual([2, 3, 4, 1])
        })

        it('rejects invalid party size and unknown restaurant', async () => {
            await expect(service.listAvailable('rest-1', 0)).rejects.toThrow(InvalidPartySizeError)
            await expect(service.listAvailable('rest-1', 1.5)).rejects.toThrow(InvalidPartySizeError)
            await expect(service.listAvailable('nope', 2)).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('occupy', () => {
        it('occupies a free table recording who and when', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            const occupied = await service.occupy('rest-1', table.id, 3, 'client-1')
            expect(occupied).toMatchObject({ status: 'ocupada', occupiedBy: 'client-1' })
            expect(occupied.occupiedAt).not.toBeNull()
        })

        it('fails with TableNotAvailableError if it is not free (second occupant loses)', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await service.occupy('rest-1', table.id, 2, 'client-1')
            await expect(service.occupy('rest-1', table.id, 2, 'client-2')).rejects.toThrow(TableNotAvailableError)
            await expect(service.occupy('rest-1', (await service.create('rest-1', { number: 2, capacity: 4, status: 'reservada' })).id, 2, 'c'))
                .rejects.toThrow(TableNotAvailableError)
        })

        it('validates party size and capacity', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.occupy('rest-1', table.id, 0, 'c')).rejects.toThrow(InvalidPartySizeError)
            await expect(service.occupy('rest-1', table.id, undefined as any, 'c')).rejects.toThrow(InvalidPartySizeError)
            await expect(service.occupy('rest-1', table.id, 5, 'c')).rejects.toThrow(TableCapacityExceededError)
            expect((await service.getById('rest-1', table.id)).status).toBe('libre')
        })

        it('throws TableNotFoundError for other restaurant or unknown id', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.occupy('rest-2', table.id, 2, 'c')).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('rest-1', 'nope', 2, 'c')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('listOrders', () => {
        it('returns only orders created since occupiedAt, [] if not occupied', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            expect(await service.listOrders('rest-1', table.id)).toEqual([])

            const old = { id: 'o-old', restaurantId: 'rest-1', tableId: table.id, clientId: null, createdAt: new Date(Date.now() - 60_000), items: [] }
            await orders.create(old)
            const occupied = await service.occupy('rest-1', table.id, 2, 'c')
            const fresh = { id: 'o-new', restaurantId: 'rest-1', tableId: table.id, clientId: 'c', createdAt: new Date(new Date(occupied.occupiedAt!).getTime() + 1000), items: [] }
            await orders.create(fresh)
            await orders.create({ ...fresh, id: 'o-other', tableId: 'other-table' })

            expect((await service.listOrders('rest-1', table.id)).map(o => o.id)).toEqual(['o-new'])

            await service.updateStatus('rest-1', table.id, 'libre')
            expect(await service.listOrders('rest-1', table.id)).toEqual([])
        })
    })
})
