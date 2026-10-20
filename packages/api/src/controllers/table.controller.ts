import type { Request, Response, NextFunction } from 'express'
import type { TableService } from '@services/table.service.js'
import type { Table } from '@models/table.model.js'
import { InvalidPartySizeError } from '@errors/DomainErrors.js'

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create(req.params.restaurantId as string, this.readInput(req))
            res.status(201).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const status = typeof req.query.status === 'string' ? req.query.status : undefined
            const tables = await this.tableService.list(req.params.restaurantId as string, status)
            res.status(200).json(tables.map(t => this.toJSON(t)))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(req.params.restaurantId as string, req.params.id as string, this.readInput(req))
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.updateStatus(req.params.restaurantId as string, req.params.id as string, req.body?.status)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const orders = await this.tableService.listOrders(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(orders)
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientId = (req as any).user?.id ?? null
            const table = await this.tableService.occupy(req.params.restaurantId as string, req.params.id as string, req.body?.partySize, clientId)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    getPublicAvailable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const raw = req.query.partySize
            let partySize: number | undefined
            if (raw !== undefined) {
                partySize = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN
                if (Number.isNaN(partySize)) throw new InvalidPartySizeError()
            }
            const tables = await this.tableService.listAvailable(req.params.restaurantId as string, partySize)
            res.status(200).json(tables.map(t => this.toJSON(t)))
        } catch (error) {
            next(error)
        }
    }

    private readInput(req: Request) {
        return {
            number: req.body?.number,
            capacity: req.body?.capacity,
            description: req.body?.description ?? null,
            ...(req.body?.status !== undefined && { status: req.body.status })
        }
    }

    private toJSON(table: Table) {
        return {
            id: table.id,
            restaurantId: table.restaurantId,
            number: table.number,
            description: table.description,
            capacity: table.capacity,
            status: table.status,
            occupiedAt: table.occupiedAt,
            occupiedBy: table.occupiedBy
        }
    }
}
