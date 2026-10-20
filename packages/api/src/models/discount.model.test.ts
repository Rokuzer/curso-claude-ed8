import { describe, it, expect } from 'vitest'
import { normalizeDiscountType } from './discount.model.js'
import { InvalidDiscountTypeError } from '@errors/DomainErrors.js'

describe('normalizeDiscountType', () => {
    it('accepts percent and fixed ignoring case and spaces', () => {
        expect(normalizeDiscountType(' Percent ')).toBe('percent')
        expect(normalizeDiscountType('FIXED')).toBe('fixed')
    })

    it('rejects unknown or non-string values', () => {
        expect(() => normalizeDiscountType('gift')).toThrow(InvalidDiscountTypeError)
        expect(() => normalizeDiscountType(undefined)).toThrow(InvalidDiscountTypeError)
    })
})
