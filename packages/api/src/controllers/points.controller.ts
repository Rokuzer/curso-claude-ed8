import type { Request, Response, NextFunction } from 'express'
import type { PointsService } from '@services/points.service.js'
import type { PointsRule } from '@models/discount.model.js'

export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    createRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.createRule(req.params.restaurantId as string, this.readInput(req))
            res.status(201).json(this.toJSON(rule))
        } catch (error) {
            next(error)
        }
    }

    getRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rules = await this.pointsService.listRules(req.params.restaurantId as string)
            res.status(200).json(rules.map(r => this.toJSON(r)))
        } catch (error) {
            next(error)
        }
    }

    updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.updateRule(req.params.restaurantId as string, req.params.id as string, this.readInput(req))
            res.status(200).json(this.toJSON(rule))
        } catch (error) {
            next(error)
        }
    }

    deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pointsService.deleteRule(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    getMyBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientId = (req as any).user?.id as string
            const balance = await this.pointsService.getBalance(clientId, req.params.restaurantId as string)
            res.status(200).json({ restaurantId: req.params.restaurantId, balance })
        } catch (error) {
            next(error)
        }
    }

    private readInput(req: Request) {
        return { points: req.body?.points, discountAmount: req.body?.discountAmount }
    }

    private toJSON(rule: PointsRule) {
        return { id: rule.id, restaurantId: rule.restaurantId, points: rule.points, discountAmount: rule.discountAmount }
    }
}
