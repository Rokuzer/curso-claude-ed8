import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './database.js'

describe('Database schema for discounts', () => {
    const db = new Database()

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

    it('creates the new tables', async () => {
        const rows = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
        const names = rows.map(r => r.name)
        expect(names).toEqual(expect.arrayContaining(['discount_codes', 'points_rules', 'customer_points', 'bills']))
    })

    it('enforces unique code per restaurant', async () => {
        const insert = () => db.run(
            'INSERT INTO discount_codes (id, restaurant_id, code, type, value) VALUES (?, ?, ?, ?, ?)',
            [`d-${Math.random()}`, 'rest-1', 'VERANO', 'fixed', 5]
        )
        await insert()
        await expect(insert()).rejects.toThrow(/UNIQUE/)
    })

    it('enforces unique points per restaurant and foreign keys', async () => {
        const insert = () => db.run(
            'INSERT INTO points_rules (id, restaurant_id, points, discount_amount) VALUES (?, ?, ?, ?)',
            [`p-${Math.random()}`, 'rest-1', 10, 1]
        )
        await insert()
        await expect(insert()).rejects.toThrow(/UNIQUE/)
        await expect(db.run(
            'INSERT INTO points_rules (id, restaurant_id, points, discount_amount) VALUES (?, ?, ?, ?)',
            ['p-x', 'missing', 20, 2]
        )).rejects.toThrow(/FOREIGN KEY/)
    })

    it('defaults counters and balances to zero', async () => {
        const code = await db.get<{ used_count: number, active: number }>("SELECT used_count, active FROM discount_codes WHERE code = 'VERANO'")
        expect(code).toEqual({ used_count: 0, active: 1 })
    })
})
