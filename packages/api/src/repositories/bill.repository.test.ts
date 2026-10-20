import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteBillRepository, type BillRepository } from './bill.repository.js'
import { MockBillRepository } from './mocks/MockBillRepository.js'
import type { Bill } from '@models/bill.model.js'

const bill: Bill = {
    orderId: 'o-1', subtotal: 20, discountCode: 'VERANO', codeDiscount: 5,
    pointsUsed: 10, pointsDiscount: 1, total: 14, createdAt: '2026-10-20T10:00:00.000Z'
}

describe.each(['sqlite', 'mock'])('BillRepository (%s)', (kind) => {
    const db = new Database()
    let repo: BillRepository

    beforeAll(async () => {
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', 'now', 'now']
        )
        await db.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)', ['o-1', 'rest-1', null, null, 'now'])
        repo = kind === 'sqlite' ? new SqliteBillRepository(db) : new MockBillRepository()
    })

    afterAll(async () => {
        await db.close()
    })

    it('returns null when the order has no bill', async () => {
        expect(await repo.findByOrderId('o-1')).toBeNull()
    })

    it('saves and finds a bill by order id', async () => {
        await repo.save(bill)
        expect(await repo.findByOrderId('o-1')).toEqual(bill)
    })

    it('stores a null discount code', async () => {
        const other: Bill = { ...bill, discountCode: null, codeDiscount: 0 }
        await db.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)', ['o-2', 'rest-1', null, null, 'now'])
        await repo.save({ ...other, orderId: 'o-2' })
        expect((await repo.findByOrderId('o-2'))?.discountCode).toBeNull()
    })
})
