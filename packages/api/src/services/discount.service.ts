import { randomUUID } from 'crypto'
import type { DiscountCode, DiscountType } from '@models/discount.model.js'
import { normalizeDiscountType } from '@models/discount.model.js'
import type { DiscountRepository } from '@repositories/discount.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    RestaurantNotFoundError, DiscountCodeRequiredError, InvalidDiscountValueError, InvalidDiscountExpirationError,
    InvalidDiscountMaxUsesError, DuplicatedDiscountCodeError, DiscountCodeNotFoundError
} from '@errors/DomainErrors.js'

export interface DiscountInput {
    code: string
    type: string
    value: number
    active?: boolean
    expiresAt?: string | null
    maxUses?: number | null
}

interface DiscountFields {
    code: string
    type: DiscountType
    value: number
    active: boolean
    expiresAt: string | null
    maxUses: number | null
}

export class DiscountService {
    constructor(
        private readonly discountRepository: DiscountRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, input: DiscountInput): Promise<DiscountCode> {
        await this.ensureRestaurantExists(restaurantId)
        const fields = this.validateFields(input)
        await this.ensureCodeAvailable(restaurantId, fields.code)

        const discount: DiscountCode = { id: randomUUID(), restaurantId, ...fields, usedCount: 0 }
        await this.discountRepository.save(discount)
        return discount
    }

    async list(restaurantId: string): Promise<DiscountCode[]> {
        await this.ensureRestaurantExists(restaurantId)
        return this.discountRepository.findByRestaurantId(restaurantId)
    }

    async getById(restaurantId: string, id: string): Promise<DiscountCode> {
        const discount = await this.discountRepository.findById(id)
        if (!discount || discount.restaurantId !== restaurantId) {
            throw new DiscountCodeNotFoundError()
        }
        return discount
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!await this.restaurantRepository.findById(restaurantId)) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensureCodeAvailable(restaurantId: string, code: string): Promise<void> {
        if (await this.discountRepository.findByCode(restaurantId, code)) {
            throw new DuplicatedDiscountCodeError()
        }
    }

    private validateFields(input: DiscountInput): DiscountFields {
        const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : ''
        if (code === '') {
            throw new DiscountCodeRequiredError()
        }

        const type = normalizeDiscountType(input.type)
        if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value <= 0) {
            throw new InvalidDiscountValueError()
        }
        if (type === 'percent' && input.value > 100) {
            throw new InvalidDiscountValueError('Percent discount cannot exceed 100')
        }

        let expiresAt: string | null = null
        if (input.expiresAt !== undefined && input.expiresAt !== null) {
            const time = typeof input.expiresAt === 'string' ? Date.parse(input.expiresAt) : NaN
            if (Number.isNaN(time)) {
                throw new InvalidDiscountExpirationError()
            }
            expiresAt = new Date(time).toISOString()
        }

        let maxUses: number | null = null
        if (input.maxUses !== undefined && input.maxUses !== null) {
            if (typeof input.maxUses !== 'number' || !Number.isInteger(input.maxUses) || input.maxUses < 1) {
                throw new InvalidDiscountMaxUsesError()
            }
            maxUses = input.maxUses
        }

        return { code, type, value: input.value, active: input.active ?? true, expiresAt, maxUses }
    }
}
