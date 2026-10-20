import type { Request, Response, NextFunction } from 'express'
import type { DiscountService } from '@services/discount.service.js'
import type { DiscountCode } from '@models/discount.model.js'

export class DiscountController {
    constructor(private readonly discountService: DiscountService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const discount = await this.discountService.create(req.params.restaurantId as string, this.readInput(req))
            res.status(201).json(this.toJSON(discount))
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const discounts = await this.discountService.list(req.params.restaurantId as string)
            res.status(200).json(discounts.map(d => this.toJSON(d)))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const discount = await this.discountService.getById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(this.toJSON(discount))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const discount = await this.discountService.update(req.params.restaurantId as string, req.params.id as string, this.readInput(req))
            res.status(200).json(this.toJSON(discount))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.discountService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    private readInput(req: Request) {
        return {
            code: req.body?.code,
            type: req.body?.type,
            value: req.body?.value,
            ...(req.body?.active !== undefined && { active: req.body.active }),
            ...(req.body?.expiresAt !== undefined && { expiresAt: req.body.expiresAt }),
            ...(req.body?.maxUses !== undefined && { maxUses: req.body.maxUses })
        }
    }

    private toJSON(discount: DiscountCode) {
        return {
            id: discount.id,
            restaurantId: discount.restaurantId,
            code: discount.code,
            type: discount.type,
            value: discount.value,
            active: discount.active,
            expiresAt: discount.expiresAt,
            maxUses: discount.maxUses,
            usedCount: discount.usedCount
        }
    }
}
