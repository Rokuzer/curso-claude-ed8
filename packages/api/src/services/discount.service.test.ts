import { describe, it, expect, beforeEach } from 'vitest'
import { DiscountService } from './discount.service.js'
import { MockDiscountRepository } from '@repositories/mocks/MockDiscountRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    RestaurantNotFoundError, DiscountCodeRequiredError, InvalidDiscountTypeError, InvalidDiscountValueError,
    InvalidDiscountExpirationError, InvalidDiscountMaxUsesError, DuplicatedDiscountCodeError, DiscountCodeNotFoundError
} from '@errors/DomainErrors.js'

describe('DiscountService', () => {
    let discounts: MockDiscountRepository
    let service: DiscountService

    beforeEach(async () => {
        discounts = new MockDiscountRepository()
        const restaurants = new MockRestaurantRepository()
        const now = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await restaurants.save({
                id, name: 'R', address: 'A', email: 'r@r.com', phone: '+34 600000000',
                ownerFirstName: 'O', ownerLastName: 'W', logoUrl: null, createdAt: now, updatedAt: now
            })
        }
        service = new DiscountService(discounts, restaurants)
    })

    describe('create', () => {
        it('creates an active code with normalized uppercase code', async () => {
            const discount = await service.create('rest-1', { code: '  verano5 ', type: 'fixed', value: 5 })
            expect(discount).toMatchObject({
                restaurantId: 'rest-1', code: 'VERANO5', type: 'fixed', value: 5,
                active: true, expiresAt: null, maxUses: null, usedCount: 0
            })
            expect(await discounts.findById(discount.id)).not.toBeNull()
        })

        it('stores expiration as ISO date and max uses', async () => {
            const discount = await service.create('rest-1', { code: 'A', type: 'percent', value: 10, expiresAt: '2030-01-01', maxUses: 3, active: false })
            expect(discount).toMatchObject({ expiresAt: '2030-01-01T00:00:00.000Z', maxUses: 3, active: false })
        })

        it('rejects unknown restaurant', async () => {
            await expect(service.create('nope', { code: 'A', type: 'fixed', value: 1 })).rejects.toThrow(RestaurantNotFoundError)
        })

        it('rejects blank code, bad type and bad values', async () => {
            await expect(service.create('rest-1', { code: '   ', type: 'fixed', value: 1 })).rejects.toThrow(DiscountCodeRequiredError)
            await expect(service.create('rest-1', { code: 'A', type: 'gift', value: 1 })).rejects.toThrow(InvalidDiscountTypeError)
            await expect(service.create('rest-1', { code: 'A', type: 'fixed', value: 0 })).rejects.toThrow(InvalidDiscountValueError)
            await expect(service.create('rest-1', { code: 'A', type: 'fixed', value: '5' as any })).rejects.toThrow(InvalidDiscountValueError)
            await expect(service.create('rest-1', { code: 'A', type: 'percent', value: 101 })).rejects.toThrow(InvalidDiscountValueError)
        })

        it('rejects invalid expiration and max uses', async () => {
            await expect(service.create('rest-1', { code: 'A', type: 'fixed', value: 1, expiresAt: 'ayer' })).rejects.toThrow(InvalidDiscountExpirationError)
            await expect(service.create('rest-1', { code: 'A', type: 'fixed', value: 1, maxUses: 0 })).rejects.toThrow(InvalidDiscountMaxUsesError)
            await expect(service.create('rest-1', { code: 'A', type: 'fixed', value: 1, maxUses: 1.5 })).rejects.toThrow(InvalidDiscountMaxUsesError)
        })

        it('rejects duplicated code in the same restaurant but allows it in another', async () => {
            await service.create('rest-1', { code: 'VERANO', type: 'fixed', value: 5 })
            await expect(service.create('rest-1', { code: 'verano', type: 'fixed', value: 2 })).rejects.toThrow(DuplicatedDiscountCodeError)
            await expect(service.create('rest-2', { code: 'VERANO', type: 'fixed', value: 2 })).resolves.toBeDefined()
        })
    })

    describe('list and getById', () => {
        it('lists only the codes of the restaurant', async () => {
            await service.create('rest-1', { code: 'B', type: 'fixed', value: 1 })
            await service.create('rest-1', { code: 'A', type: 'fixed', value: 1 })
            await service.create('rest-2', { code: 'C', type: 'fixed', value: 1 })
            expect((await service.list('rest-1')).map(d => d.code)).toEqual(['A', 'B'])
            await expect(service.list('nope')).rejects.toThrow(RestaurantNotFoundError)
        })

        it('gets by id and hides codes of other restaurants', async () => {
            const created = await service.create('rest-1', { code: 'A', type: 'fixed', value: 1 })
            expect((await service.getById('rest-1', created.id)).code).toBe('A')
            await expect(service.getById('rest-2', created.id)).rejects.toThrow(DiscountCodeNotFoundError)
            await expect(service.getById('rest-1', 'nope')).rejects.toThrow(DiscountCodeNotFoundError)
        })
    })
})
