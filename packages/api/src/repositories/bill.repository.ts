import { Database } from '@config/database.js'
import type { Bill } from '@models/bill.model.js'

interface BillRow {
    orderId: string
    subtotal: number
    discountCode: string | null
    codeDiscount: number
    pointsUsed: number
    pointsDiscount: number
    total: number
    createdAt: string
}

export interface BillRepository {
    findByOrderId(orderId: string): Promise<Bill | null>
    save(bill: Bill): Promise<void>
}

export class SqliteBillRepository implements BillRepository {
    constructor(private db: Database) {}

    async findByOrderId(orderId: string): Promise<Bill | null> {
        const row = await this.db.get<BillRow>(
            `SELECT order_id as orderId, subtotal, discount_code as discountCode, code_discount as codeDiscount,
                    points_used as pointsUsed, points_discount as pointsDiscount, total, created_at as createdAt
             FROM bills WHERE order_id = ?`,
            [orderId]
        )
        return row ? { ...row } : null
    }

    async save(bill: Bill): Promise<void> {
        await this.db.run(
            `INSERT INTO bills (order_id, subtotal, discount_code, code_discount, points_used, points_discount, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bill.orderId, bill.subtotal, bill.discountCode, bill.codeDiscount, bill.pointsUsed, bill.pointsDiscount, bill.total, bill.createdAt]
        )
    }
}
