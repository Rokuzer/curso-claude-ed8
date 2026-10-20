import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteDiscountRepository, type DiscountRepository } from './discount.repository.js'
import { MockDiscountRepository } from './mocks/MockDiscountRepository.js'
import type { DiscountCode } from '@models/discount.model.js'

const code = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
    id: 'd-1', restaurantId: 'rest-1', code: 'VERANO', type: 'fixed', value: 5,
    active: true, expiresAt: null, maxUses: null, usedCount: 0, ...overrides
})

describe.each(['sqlite', 'mock'])('DiscountRepository (%s)', (kind) => {
    const db = new Database()
    let repo: DiscountRepository

    beforeAll(async () => {
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', 'now', 'now']
        )
    })

    afterAll(async () => {
        await db.close()
    })

    beforeEach(async () => {
        await db.run('DELETE FROM discount_codes')
        repo = kind === 'sqlite' ? new SqliteDiscountRepository(db) : new MockDiscountRepository()
    })

    it('saves and finds by id and by code', async () => {
        await repo.save(code({ expiresAt: '2030-01-01T00:00:00.000Z', maxUses: 3 }))
        expect(await repo.findById('d-1')).toEqual(code({ expiresAt: '2030-01-01T00:00:00.000Z', maxUses: 3 }))
        expect((await repo.findByCode('rest-1', 'VERANO'))?.id).toBe('d-1')
        expect(await repo.findByCode('rest-1', 'OTRO')).toBeNull()
        expect(await repo.findById('nope')).toBeNull()
    })

    it('updates an existing code on save', async () => {
        await repo.save(code())
        await repo.save(code({ value: 8, active: false }))
        expect(await repo.findById('d-1')).toMatchObject({ value: 8, active: false })
    })

    it('lists by restaurant ordered by code and deletes', async () => {
        await repo.save(code({ id: 'd-2', code: 'B' }))
        await repo.save(code({ id: 'd-1', code: 'A' }))
        expect((await repo.findByRestaurantId('rest-1')).map(c => c.code)).toEqual(['A', 'B'])
        await repo.delete('d-1')
        expect((await repo.findByRestaurantId('rest-1')).map(c => c.code)).toEqual(['B'])
    })

    it('increments usedCount only while below maxUses', async () => {
        await repo.save(code({ maxUses: 1 }))
        expect(await repo.incrementUsed('d-1')).toBe(true)
        expect(await repo.incrementUsed('d-1')).toBe(false)
        expect((await repo.findById('d-1'))?.usedCount).toBe(1)
    })

    it('increments without limit when maxUses is null', async () => {
        await repo.save(code())
        expect(await repo.incrementUsed('d-1')).toBe(true)
        expect(await repo.incrementUsed('d-1')).toBe(true)
        expect((await repo.findById('d-1'))?.usedCount).toBe(2)
    })
})
