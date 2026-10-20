import { InvalidDiscountTypeError } from '@errors/DomainErrors.js'

const VALID_DISCOUNT_TYPES = ['percent', 'fixed'] as const

export type DiscountType = typeof VALID_DISCOUNT_TYPES[number]

export interface DiscountCode {
    id: string
    restaurantId: string
    code: string
    type: DiscountType
    value: number
    active: boolean
    expiresAt: string | null
    maxUses: number | null
    usedCount: number
}

export interface PointsRule {
    id: string
    restaurantId: string
    points: number
    discountAmount: number
}

export function normalizeDiscountType(value: unknown): DiscountType {
    const normalized = typeof value === 'string' ? value.toLowerCase().trim() : ''
    if (!VALID_DISCOUNT_TYPES.includes(normalized as DiscountType)) {
        throw new InvalidDiscountTypeError(`Invalid type: ${String(value)}. Must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}`)
    }
    return normalized as DiscountType
}
