import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Database } from '@config/database.js'
import { SqlitePointsRepository, type PointsRepository } from './points.repository.js'
import { MockPointsRepository } from './mocks/MockPointsRepository.js'

describe.each(['sqlite', 'mock'])('PointsRepository (%s)', (kind) => {
    const db = new Database()
    let repo: PointsRepository

    beforeAll(async () => {
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', 'now', 'now']
        )
        await db.run(
            'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['cli-1', 'C', 'L', 'c@c.com', 'x', 'cliente', null]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    beforeEach(async () => {
        await db.run('DELETE FROM points_rules')
        await db.run('DELETE FROM customer_points')
        repo = kind === 'sqlite' ? new SqlitePointsRepository(db) : new MockPointsRepository()
    })

    it('saves rules, finds them and lists ordered by points', async () => {
        await repo.saveRule({ id: 'r-100', restaurantId: 'rest-1', points: 100, discountAmount: 10 })
        await repo.saveRule({ id: 'r-10', restaurantId: 'rest-1', points: 10, discountAmount: 1 })
        expect((await repo.findRulesByRestaurantId('rest-1')).map(r => r.points)).toEqual([10, 100])
        expect(await repo.findRuleById('r-10')).toEqual({ id: 'r-10', restaurantId: 'rest-1', points: 10, discountAmount: 1 })
        expect((await repo.findRuleByPoints('rest-1', 100))?.id).toBe('r-100')
        expect(await repo.findRuleByPoints('rest-1', 5)).toBeNull()
    })

    it('updates and deletes rules', async () => {
        await repo.saveRule({ id: 'r-10', restaurantId: 'rest-1', points: 10, discountAmount: 1 })
        await repo.saveRule({ id: 'r-10', restaurantId: 'rest-1', points: 10, discountAmount: 2 })
        expect((await repo.findRuleById('r-10'))?.discountAmount).toBe(2)
        await repo.deleteRule('r-10')
        expect(await repo.findRuleById('r-10')).toBeNull()
    })

    it('returns zero balance by default and stores balances', async () => {
        expect(await repo.getBalance('cli-1', 'rest-1')).toBe(0)
        await repo.setBalance('cli-1', 'rest-1', 150)
        expect(await repo.getBalance('cli-1', 'rest-1')).toBe(150)
    })

    it('deducts points only when the balance is enough', async () => {
        await repo.setBalance('cli-1', 'rest-1', 150)
        expect(await repo.deductPoints('cli-1', 'rest-1', 100)).toBe(true)
        expect(await repo.deductPoints('cli-1', 'rest-1', 100)).toBe(false)
        expect(await repo.getBalance('cli-1', 'rest-1')).toBe(50)
    })
})
