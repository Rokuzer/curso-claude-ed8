import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const token = (role: string, id = `${role}-1`) =>
    `Bearer ${jwt.sign({ id, role, restaurantId: 'rest-1' }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const base = '/api/v1/restaurants/rest-1/tables'

describe('Tables HTTP API', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        const now = new Date().toISOString()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-1', 'R', 'A', 'r@r.com', '600', 'O', 'W', now, now]
        )
        await dbConfig.run('INSERT INTO dishes (id, name, description, price, category, restaurant_id, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['dish-1', 'Plato', null, 5, 'principal', 'rest-1', 1, now, now])
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('enforces roles on CRUD', async () => {
        await request(app).post(base).send({ number: 1, capacity: 2 }).expect(401)
        await request(app).post(base).set('Authorization', token('camarero')).send({ number: 1, capacity: 2 }).expect(403)
        await request(app).get(base).set('Authorization', token('cliente')).expect(403)
        await request(app).get(base).set('Authorization', token('cocinero')).expect(200)
    })

    it('runs the full flow: create, available, occupy (409 for second), order, staff views, free', async () => {
        const created = await request(app).post(base).set('Authorization', token('admin'))
            .send({ number: 10, capacity: 4, description: 'Terraza' }).expect(201)
        const id = created.body.id
        expect(created.body).toMatchObject({ number: 10, capacity: 4, status: 'libre', occupiedAt: null, occupiedBy: null })

        await request(app).post(base).set('Authorization', token('manager')).send({ number: 10, capacity: 2 }).expect(409)
            .then(r => expect(r.body.error).toBe('DuplicatedTableNumberError'))
        await request(app).post(base).set('Authorization', token('manager')).send({ number: 0, capacity: 2 }).expect(400)

        const available = await request(app).get('/api/v1/public/restaurants/rest-1/tables?partySize=3').expect(200)
        expect(available.body.map((t: any) => t.id)).toContain(id)
        await request(app).get('/api/v1/public/restaurants/rest-1/tables?partySize=abc').expect(400)
        await request(app).get('/api/v1/public/restaurants/nope/tables').expect(404)

        await request(app).post(`${base}/${id}/occupy`).set('Authorization', token('camarero')).send({ partySize: 2 }).expect(403)
        await request(app).post(`${base}/${id}/occupy`).set('Authorization', token('cliente')).send({ partySize: 9 }).expect(400)
        const occupied = await request(app).post(`${base}/${id}/occupy`).set('Authorization', token('cliente', 'c1')).send({ partySize: 3 }).expect(200)
        expect(occupied.body).toMatchObject({ status: 'ocupada', occupiedBy: 'c1' })
        await request(app).post(`${base}/${id}/occupy`).set('Authorization', token('cliente', 'c2')).send({ partySize: 3 }).expect(409)
            .then(r => expect(r.body.error).toBe('TableNotAvailableError'))

        const after = await request(app).get('/api/v1/public/restaurants/rest-1/tables?partySize=3').expect(200)
        expect(after.body.map((t: any) => t.id)).not.toContain(id)

        const order = await request(app).post('/api/v1/orders').set('Authorization', token('cliente', 'c1'))
            .send({ restaurantId: 'rest-1', tableId: id, items: [{ dishId: 'dish-1', quantity: 2 }] }).expect(201)
        expect(order.body.tableNumber).toBe(10)

        const orders = await request(app).get(`${base}/${id}/orders`).set('Authorization', token('camarero')).expect(200)
        expect(orders.body).toHaveLength(1)
        expect(orders.body[0].items).toHaveLength(2)

        await request(app).delete(`${base}/${id}`).set('Authorization', token('admin')).expect(409)
            .then(r => expect(r.body.error).toBe('TableInUseError'))

        await request(app).patch(`${base}/${id}/status`).set('Authorization', token('camarero')).send({ status: 'rota' }).expect(400)
        await request(app).patch(`${base}/${id}/status`).set('Authorization', token('camarero')).send({ status: 'libre' }).expect(200)
        const none = await request(app).get(`${base}/${id}/orders`).set('Authorization', token('camarero')).expect(200)
        expect(none.body).toEqual([])

        await request(app).post('/api/v1/orders').set('Authorization', token('cliente', 'c1'))
            .send({ restaurantId: 'rest-1', tableId: id, items: [{ dishId: 'dish-1', quantity: 1 }] }).expect(400)

        await request(app).delete(`${base}/${id}`).set('Authorization', token('admin')).expect(204)
        await request(app).get(`${base}/${id}`).set('Authorization', token('admin')).expect(404)
    })

    it('only one of many concurrent occupy requests wins', async () => {
        const created = await request(app).post(base).set('Authorization', token('admin')).send({ number: 11, capacity: 2 }).expect(201)
        const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
            request(app).post(`${base}/${created.body.id}/occupy`).set('Authorization', token('cliente', `c${i}`)).send({ partySize: 2 })))
        expect(results.filter(r => r.status === 200)).toHaveLength(1)
        expect(results.filter(r => r.status === 409)).toHaveLength(4)
    })
})
