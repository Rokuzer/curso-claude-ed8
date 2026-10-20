import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from './errorHandler.js'
import {
    DiscountCodeNotFoundError, PointsRuleNotFoundError, BillNotFoundError, DuplicatedDiscountCodeError,
    DuplicatedPointsRuleError, BillAlreadyRequestedError, DiscountCodeInvalidError, InsufficientPointsError,
    OrderNotFoundError
} from '@errors/DomainErrors.js'

function statusFor(error: Error): number {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    errorHandler(error, {} as any, { status } as any, vi.fn())
    return status.mock.calls[0]![0]
}

describe('errorHandler status mapping for discounts', () => {
    it('maps not found errors to 404', () => {
        for (const E of [DiscountCodeNotFoundError, PointsRuleNotFoundError, BillNotFoundError, OrderNotFoundError]) {
            expect(statusFor(new E())).toBe(404)
        }
    })

    it('maps duplicates and already requested bills to 409', () => {
        for (const E of [DuplicatedDiscountCodeError, DuplicatedPointsRuleError, BillAlreadyRequestedError]) {
            expect(statusFor(new E())).toBe(409)
        }
    })

    it('keeps validation errors as 400', () => {
        expect(statusFor(new DiscountCodeInvalidError())).toBe(400)
        expect(statusFor(new InsufficientPointsError())).toBe(400)
    })
})
