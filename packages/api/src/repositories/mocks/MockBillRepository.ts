import type { BillRepository } from '@repositories/bill.repository.js'
import type { Bill } from '@models/bill.model.js'

export class MockBillRepository implements BillRepository {
    private bills: Map<string, Bill> = new Map()

    async findByOrderId(orderId: string): Promise<Bill | null> {
        const bill = this.bills.get(orderId)
        return bill ? { ...bill } : null
    }

    async save(bill: Bill): Promise<void> {
        this.bills.set(bill.orderId, { ...bill })
    }
}
