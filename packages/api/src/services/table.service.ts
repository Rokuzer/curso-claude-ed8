import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { Order } from '@models/order.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import {
    RestaurantNotFoundError, TableNotFoundError, InvalidTableNumberError, InvalidTableCapacityError,
    InvalidTableDescriptionError, InvalidPartySizeError, TableCapacityExceededError, DuplicatedTableNumberError,
    TableInUseError, TableNotAvailableError
} from '@errors/DomainErrors.js'

const MAX_DESCRIPTION_LENGTH = 200

interface TableInput {
    number: number
    capacity: number
    description?: string | null
    status?: string
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository,
        private readonly orderRepository: OrderRepository
    ) {}

    async create(restaurantId: string, input: TableInput): Promise<Table> {
        await this.ensureRestaurantExists(restaurantId)
        const fields = this.validateFields(input)
        await this.ensureNumberAvailable(restaurantId, fields.number)

        const table = this.withStatus({
            id: randomUUID(),
            restaurantId,
            ...fields,
            status: 'libre',
            occupiedAt: null,
            occupiedBy: null
        }, input.status === undefined ? 'libre' : normalizeTableStatus(input.status))

        await this.tableRepository.save(table)
        return table
    }

    async list(restaurantId: string, status?: string): Promise<Table[]> {
        await this.ensureRestaurantExists(restaurantId)
        const normalized = status === undefined ? undefined : normalizeTableStatus(status)
        return this.tableRepository.findByRestaurantId(restaurantId, normalized)
    }

    async listAvailable(restaurantId: string, partySize?: number): Promise<Table[]> {
        await this.ensureRestaurantExists(restaurantId)
        if (partySize !== undefined) this.validatePartySize(partySize)
        return this.tableRepository.findAvailable(restaurantId, partySize)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, id: string, input: TableInput): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const fields = this.validateFields(input)
        const status = input.status === undefined ? existing.status : normalizeTableStatus(input.status)
        if (fields.number !== existing.number) {
            await this.ensureNumberAvailable(restaurantId, fields.number)
        }

        const updated = this.withStatus({ ...existing, ...fields }, status)
        await this.tableRepository.save(updated)
        return updated
    }

    async updateStatus(restaurantId: string, id: string, status: unknown): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const updated = this.withStatus(existing, normalizeTableStatus(status))
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const table = await this.getById(restaurantId, id)
        if (table.status === 'ocupada') {
            throw new TableInUseError()
        }
        await this.tableRepository.delete(id)
    }

    async occupy(restaurantId: string, id: string, partySize: unknown, clientId: string | null): Promise<Table> {
        const size = this.validatePartySize(partySize)
        const table = await this.getById(restaurantId, id)
        if (size > table.capacity) {
            throw new TableCapacityExceededError()
        }

        const occupied = await this.tableRepository.occupyIfFree(id, new Date().toISOString(), clientId)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return this.getById(restaurantId, id)
    }

    async listOrders(restaurantId: string, id: string): Promise<Order[]> {
        const table = await this.getById(restaurantId, id)
        if (table.status !== 'ocupada' || !table.occupiedAt) {
            return []
        }
        return this.orderRepository.findByTable(table.id, new Date(table.occupiedAt))
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!await this.restaurantRepository.findById(restaurantId)) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensureNumberAvailable(restaurantId: string, number: number): Promise<void> {
        if (await this.tableRepository.findByNumber(restaurantId, number)) {
            throw new DuplicatedTableNumberError()
        }
    }

    private validatePartySize(value: unknown): number {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
            throw new InvalidPartySizeError()
        }
        return value
    }

    private validateFields(input: TableInput): { number: number, capacity: number, description: string | null } {
        if (typeof input.number !== 'number' || !Number.isInteger(input.number) || input.number < 1) {
            throw new InvalidTableNumberError()
        }
        if (typeof input.capacity !== 'number' || !Number.isInteger(input.capacity) || input.capacity < 1) {
            throw new InvalidTableCapacityError()
        }

        let description: string | null = null
        if (input.description !== undefined && input.description !== null) {
            if (typeof input.description !== 'string') {
                throw new InvalidTableDescriptionError()
            }
            const trimmed = input.description.trim()
            if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
                throw new InvalidTableDescriptionError(`Table description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
            }
            description = trimmed === '' ? null : trimmed
        }

        return { number: input.number, capacity: input.capacity, description }
    }

    private withStatus(table: Table, status: TableStatusType): Table {
        if (status !== 'ocupada') {
            return { ...table, status, occupiedAt: null, occupiedBy: null }
        }
        if (table.status === 'ocupada') {
            return { ...table, status }
        }
        return { ...table, status, occupiedAt: new Date().toISOString(), occupiedBy: null }
    }
}
