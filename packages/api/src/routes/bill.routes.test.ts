import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const token = (role: string, id = `${role}-1`) =>
    `Bearer ${jwt.sign({ id, role, restaurantId: 'rest-1' }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const bill = (orderId: string) => `/api/v1/orders/${orderId}/bill`

async function createOrder(id: string, clientId = 'cliente-1'): Promise<void> {
    await dbConfig.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)', [id, 'rest-1', null, clientId, new Date().toISOString()])
    for (const n of [1, 2]) {
        await dbConfig.run('INSERT INTO order_items (id, order_id, dish_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [`${id}-${n}`, id, 'dish-1', 1, null, 'entregado'])
    }
}

describe('Order bill HTTP API', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        const now = new Date().toISOString()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', now, now]
        )
        for (const id of ['cliente-1', 'cliente-2']) {
            await dbConfig.run(
                'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, 'C', 'L', `${id}@c.com`, 'x', 'cliente', null]
            )
        }
        await dbConfig.run('INSERT INTO dishes (id, name, description, price, category, restaurant_id, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['dish-1', 'Plato', null, 5, 'principal', 'rest-1', 1, now, now])
        await dbConfig.run("INSERT INTO discount_codes (id, restaurant_id, code, type, value) VALUES ('d-1', 'rest-1', 'BIENVENIDO10', 'percent', 10)")
        await dbConfig.run("INSERT INTO discount_codes (id, restaurant_id, code, type, value, expires_at) VALUES ('d-2', 'rest-1', 'CADUCADO', 'fixed', 1, '2000-01-01T00:00:00.000Z')")
        await dbConfig.run("INSERT INTO points_rules (id, restaurant_id, points, discount_amount) VALUES ('r-100', 'rest-1', 100, 3)")
        await dbConfig.run("INSERT INTO customer_points (client_id, restaurant_id, balance) VALUES ('cliente-1', 'rest-1', 150)")
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('only clients can request or read a bill', async () => {
        await createOrder('o-roles')
        await request(app).post(bill('o-roles')).send({}).expect(401)
        await request(app).post(bill('o-roles')).set('Authorization', token('admin')).send({}).expect(403)
        await request(app).get(bill('o-roles')).set('Authorization', token('camarero')).expect(403)
    })

    it('creates a bill with a discount code and returns it later', async () => {
        await createOrder('o-code')
        const res = await request(app).post(bill('o-code')).set('Authorization', token('cliente'))
            .send({ discountCode: 'bienvenido10' }).expect(201)
        expect(res.body).toMatchObject({ orderId: 'o-code', subtotal: 10, discountCode: 'BIENVENIDO10', codeDiscount: 1, pointsUsed: 0, total: 9 })

        await request(app).get(bill('o-code')).set('Authorization', token('cliente')).expect(200)
            .then(r => expect(r.body.total).toBe(9))
        await request(app).post(bill('o-code')).set('Authorization', token('cliente')).send({}).expect(409)
            .then(r => expect(r.body.error).toBe('BillAlreadyRequestedError'))
    })

    it('rejects unknown and expired codes without creating the bill', async () => {
        await createOrder('o-bad')
        await request(app).post(bill('o-bad')).set('Authorization', token('cliente')).send({ discountCode: 'NOPE' }).expect(404)
        await request(app).post(bill('o-bad')).set('Authorization', token('cliente')).send({ discountCode: 'CADUCADO' }).expect(400)
            .then(r => expect(r.body.error).toBe('DiscountCodeInvalidError'))
        await request(app).get(bill('o-bad')).set('Authorization', token('cliente')).expect(404)
    })

    it('redeems points and fails without enough balance', async () => {
        await createOrder('o-pts-1')
        await createOrder('o-pts-2')
        const ok = await request(app).post(bill('o-pts-1')).set('Authorization', token('cliente'))
            .send({ pointsRuleId: 'r-100' }).expect(201)
        expect(ok.body).toMatchObject({ pointsUsed: 100, pointsDiscount: 3, total: 7 })

        await request(app).post(bill('o-pts-2')).set('Authorization', token('cliente'))
            .send({ pointsRuleId: 'r-100' }).expect(400)
            .then(r => expect(r.body.error).toBe('InsufficientPointsError'))
        const balance = await dbConfig.get<{ balance: number }>("SELECT balance FROM customer_points WHERE client_id = 'cliente-1'")
        expect(balance?.balance).toBe(50)
    })

    it('hides orders of other clients', async () => {
        await createOrder('o-other', 'cliente-2')
        await request(app).post(bill('o-other')).set('Authorization', token('cliente')).send({}).expect(404)
        await request(app).post(bill('nope')).set('Authorization', token('cliente')).send({}).expect(404)
    })
})
