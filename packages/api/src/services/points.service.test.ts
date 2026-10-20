import { describe, it, expect, beforeEach } from 'vitest'
import { PointsService } from './points.service.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    RestaurantNotFoundError, InvalidPointsRuleError, DuplicatedPointsRuleError, PointsRuleNotFoundError
} from '@errors/DomainErrors.js'

describe('PointsService', () => {
    let points: MockPointsRepository
    let service: PointsService

    beforeEach(async () => {
        points = new MockPointsRepository()
        const restaurants = new MockRestaurantRepository()
        const now = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await restaurants.save({
                id, name: 'R', address: 'A', email: 'r@r.com', phone: '+34 600000000',
                ownerFirstName: 'O', ownerLastName: 'W', logoUrl: null, createdAt: now, updatedAt: now
            })
        }
        service = new PointsService(points, restaurants)
    })

    describe('createRule', () => {
        it('creates a rule linking points to a discount amount', async () => {
            const rule = await service.createRule('rest-1', { points: 10, discountAmount: 1 })
            expect(rule).toMatchObject({ restaurantId: 'rest-1', points: 10, discountAmount: 1 })
            expect(await points.findRuleById(rule.id)).not.toBeNull()
        })

        it('rejects unknown restaurant and invalid values', async () => {
            await expect(service.createRule('nope', { points: 10, discountAmount: 1 })).rejects.toThrow(RestaurantNotFoundError)
            await expect(service.createRule('rest-1', { points: 0, discountAmount: 1 })).rejects.toThrow(InvalidPointsRuleError)
            await expect(service.createRule('rest-1', { points: 1.5, discountAmount: 1 })).rejects.toThrow(InvalidPointsRuleError)
            await expect(service.createRule('rest-1', { points: 10, discountAmount: 0 })).rejects.toThrow(InvalidPointsRuleError)
            await expect(service.createRule('rest-1', { points: '10' as any, discountAmount: 1 })).rejects.toThrow(InvalidPointsRuleError)
        })

        it('rejects a duplicated points amount in the same restaurant only', async () => {
            await service.createRule('rest-1', { points: 10, discountAmount: 1 })
            await expect(service.createRule('rest-1', { points: 10, discountAmount: 2 })).rejects.toThrow(DuplicatedPointsRuleError)
            await expect(service.createRule('rest-2', { points: 10, discountAmount: 2 })).resolves.toBeDefined()
        })
    })

    describe('listRules, updateRule and deleteRule', () => {
        it('lists rules ordered by points', async () => {
            await service.createRule('rest-1', { points: 100, discountAmount: 10 })
            await service.createRule('rest-1', { points: 10, discountAmount: 1 })
            expect((await service.listRules('rest-1')).map(r => r.points)).toEqual([10, 100])
            await expect(service.listRules('nope')).rejects.toThrow(RestaurantNotFoundError)
        })

        it('updates a rule and rejects collisions', async () => {
            const a = await service.createRule('rest-1', { points: 10, discountAmount: 1 })
            await service.createRule('rest-1', { points: 20, discountAmount: 2 })
            expect(await service.updateRule('rest-1', a.id, { points: 10, discountAmount: 1.5 })).toMatchObject({ discountAmount: 1.5 })
            await expect(service.updateRule('rest-1', a.id, { points: 20, discountAmount: 2 })).rejects.toThrow(DuplicatedPointsRuleError)
        })

        it('deletes a rule and fails for unknown or foreign ids', async () => {
            const a = await service.createRule('rest-1', { points: 10, discountAmount: 1 })
            await expect(service.deleteRule('rest-2', a.id)).rejects.toThrow(PointsRuleNotFoundError)
            await service.deleteRule('rest-1', a.id)
            expect(await points.findRuleById(a.id)).toBeNull()
            await expect(service.deleteRule('rest-1', a.id)).rejects.toThrow(PointsRuleNotFoundError)
        })
    })

    describe('getBalance', () => {
        it('returns the client balance in the restaurant, zero by default', async () => {
            expect(await service.getBalance('cli-1', 'rest-1')).toBe(0)
            await points.setBalance('cli-1', 'rest-1', 150)
            expect(await service.getBalance('cli-1', 'rest-1')).toBe(150)
            expect(await service.getBalance('cli-1', 'rest-2')).toBe(0)
            await expect(service.getBalance('cli-1', 'nope')).rejects.toThrow(RestaurantNotFoundError)
        })
    })
})
