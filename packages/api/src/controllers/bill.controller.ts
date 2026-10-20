import type { Request, Response, NextFunction } from 'express'
import type { BillService } from '@services/bill.service.js'

export class BillController {
    constructor(private readonly billService: BillService) {}

    requestBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientId = (req as any).user?.id as string
            const bill = await this.billService.requestBill(req.params.id as string, clientId, {
                ...(req.body?.discountCode !== undefined && { discountCode: req.body.discountCode }),
                ...(req.body?.pointsRuleId !== undefined && { pointsRuleId: req.body.pointsRuleId })
            })
            res.status(201).json(bill)
        } catch (error) {
            next(error)
        }
    }

    getBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientId = (req as any).user?.id as string
            const bill = await this.billService.getBill(req.params.id as string, clientId)
            res.status(200).json(bill)
        } catch (error) {
            next(error)
        }
    }
}
