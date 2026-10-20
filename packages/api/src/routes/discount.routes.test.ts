import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const token = (role: string, id = `${role}-1`) =>
    `Bearer ${jwt.sign({ id, role, restaurantId: 'rest-1' }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const discounts = '/api/v1/restaurants/rest-1/discounts'
const rules = '/api/v1/restaurants/rest-1/points-rules'

describe('Discounts and points rules HTTP API', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        const now = new Date().toISOString()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', now, now]
        )
        await dbConfig.run(
            'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['cliente-1', 'C', 'L', 'c@c.com', 'x', 'cliente', null]
        )
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('enforces roles on discount codes', async () => {
        const body = { code: 'VERANO5', type: 'fixed', value: 5 }
        await request(app).post(discounts).send(body).expect(401)
        await request(app).post(discounts).set('Authorization', token('camarero')).send(body).expect(403)
        await request(app).post(discounts).set('Authorization', token('manager')).send(body).expect(403)
        await request(app).get(discounts).set('Authorization', token('cliente')).expect(403)
        await request(app).get(discounts).set('Authorization', token('manager')).expect(200)
    })

    it('runs the CRUD flow for discount codes', async () => {
        const created = await request(app).post(discounts).set('Authorization', token('admin'))
            .send({ code: 'verano5', type: 'fixed', value: 5 }).expect(201)
        expect(created.body).toMatchObject({ code: 'VERANO5', type: 'fixed', value: 5, active: true, usedCount: 0, expiresAt: null, maxUses: null })
        const id = created.body.id

        await request(app).post(discounts).set('Authorization', token('admin')).send({ code: 'VERANO5', type: 'fixed', value: 1 }).expect(409)
            .then(r => expect(r.body.error).toBe('DuplicatedDiscountCodeError'))
        await request(app).post(discounts).set('Authorization', token('admin')).send({ code: 'X', type: 'percent', value: 150 }).expect(400)
        await request(app).post('/api/v1/restaurants/nope/discounts').set('Authorization', token('admin')).send({ code: 'X', type: 'fixed', value: 1 }).expect(404)

        const list = await request(app).get(discounts).set('Authorization', token('admin')).expect(200)
        expect(list.body.map((d: any) => d.id)).toContain(id)

        await request(app).get(`${discounts}/${id}`).set('Authorization', token('admin')).expect(200)
        const updated = await request(app).put(`${discounts}/${id}`).set('Authorization', token('admin'))
            .send({ code: 'VERANO5', type: 'percent', value: 10, active: false }).expect(200)
        expect(updated.body).toMatchObject({ type: 'percent', value: 10, active: false })

        await request(app).delete(`${discounts}/${id}`).set('Authorization', token('admin')).expect(204)
        await request(app).get(`${discounts}/${id}`).set('Authorization', token('admin')).expect(404)
            .then(r => expect(r.body.error).toBe('DiscountCodeNotFoundError'))
    })

    it('manages points rules: admin writes, clients can read', async () => {
        await request(app).post(rules).set('Authorization', token('manager')).send({ points: 10, discountAmount: 1 }).expect(403)
        await request(app).post(rules).set('Authorization', token('admin')).send({ points: 0, discountAmount: 1 }).expect(400)
        const created = await request(app).post(rules).set('Authorization', token('admin')).send({ points: 10, discountAmount: 1 }).expect(201)
        await request(app).post(rules).set('Authorization', token('admin')).send({ points: 10, discountAmount: 2 }).expect(409)

        const list = await request(app).get(rules).set('Authorization', token('cliente')).expect(200)
        expect(list.body).toEqual([{ id: created.body.id, restaurantId: 'rest-1', points: 10, discountAmount: 1 }])

        await request(app).put(`${rules}/${created.body.id}`).set('Authorization', token('admin')).send({ points: 10, discountAmount: 1.5 }).expect(200)
        await request(app).delete(`${rules}/${created.body.id}`).set('Authorization', token('admin')).expect(204)
        await request(app).delete(`${rules}/${created.body.id}`).set('Authorization', token('admin')).expect(404)
    })

    it('returns the client balance for the restaurant', async () => {
        const mine = '/api/v1/restaurants/rest-1/points/me'
        await request(app).get(mine).set('Authorization', token('admin')).expect(403)
        await request(app).get(mine).set('Authorization', token('cliente')).expect(200)
            .then(r => expect(r.body).toEqual({ restaurantId: 'rest-1', balance: 0 }))
        await dbConfig.run('INSERT INTO customer_points (client_id, restaurant_id, balance) VALUES (?, ?, ?)', ['cliente-1', 'rest-1', 150])
        await request(app).get(mine).set('Authorization', token('cliente')).expect(200)
            .then(r => expect(r.body.balance).toBe(150))
    })
})
