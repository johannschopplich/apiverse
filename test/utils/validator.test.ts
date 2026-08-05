import type { Validator } from '../../src/utils/validator'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  isValidator,
  safeValidateTypes,
  TypeValidationError,
  validateTypes,
  validator,
} from '../../src/utils/validator'

describe('validation', () => {
  const schema = validator<number>((value) => {
    if (typeof value === 'number') {
      return { success: true, value }
    }
    return { success: false, error: new Error('Not a number') }
  })

  describe('validator', () => {
    it('creates a validator without a validate function', () => {
      const testValidator = validator<string>()
      expectTypeOf(testValidator).toEqualTypeOf<Validator<string>>()
    })

    it('keeps the validate function it was given', () => {
      const customValidator = validator<number>((value) => {
        if (typeof value === 'number') {
          return { success: true, value }
        }
        return { success: false, error: new Error('Not a number') }
      })

      expectTypeOf(customValidator).toEqualTypeOf<Validator<number>>()
      expect(customValidator.validate).toBeDefined()
      expect(customValidator.validate!(42)).toEqual({ success: true, value: 42 })
    })
  })

  describe('validateTypes', () => {
    it('returns the value when the schema validates it', () => {
      const result = validateTypes({ value: 42, schema })
      expect(result).toBe(42)
    })

    it('throws TypeValidationError on validation failure', () => {
      expect(() => validateTypes({ value: 'not a number', schema }))
        .toThrow(TypeValidationError)
    })

    it('returns the value when the schema has no validator', () => {
      const schema = validator<string>()
      const result = validateTypes({ value: 'test', schema })
      expect(result).toBe('test')
    })
  })

  describe('safeValidateTypes', () => {
    it('returns a success result when the schema validates the value', () => {
      const result = safeValidateTypes({ value: 42, schema })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe(42)
      }
    })

    it('returns a failure result carrying the validator error', () => {
      const result = safeValidateTypes({ value: 'not a number', schema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(TypeValidationError)
      }
    })
  })

  describe('isValidator', () => {
    it('returns true for an object from validator', () => {
      const testValidator = validator<string>()
      expect(isValidator(testValidator)).toBe(true)
    })

    it('rejects non-validator objects', () => {
      expect(isValidator({})).toBe(false)
      expect(isValidator(null)).toBe(false)
      expect(isValidator(undefined)).toBe(false)
    })
  })

  // eslint-disable-next-line test/prefer-lowercase-title
  describe('TypeValidationError', () => {
    it('wraps the cause of the validation failure', () => {
      const result = safeValidateTypes({ value: 'oops', schema })
      if (!result.success) {
        expect(result.error.value).toBe('oops')
        expect(result.error.cause).toBeInstanceOf(Error)
        expect((result.error.cause as Error).message).toBe('Not a number')
      }
    })

    it('stringifies circular values in the error message', () => {
      const circular: Record<string, unknown> = {}
      circular.self = circular

      const circularSchema = validator<unknown>(() => ({
        success: false,
        error: new Error('fail'),
      }))

      const result = safeValidateTypes({ value: circular, schema: circularSchema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('[object Object]')
        expect(result.error.message).toContain('fail')
      }
    })

    it('reports thrown validator errors as validation failures', () => {
      const throwingSchema = validator<unknown>(() => {
        throw new Error('boom')
      })

      const result = safeValidateTypes({ value: 1, schema: throwingSchema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(TypeValidationError)
        expect(result.error.message).toContain('boom')
      }
    })

    it.each([
      ['a string cause', 'literal string error' as unknown as Error, 'literal string error'],
      ['an object cause', { code: 42 } as unknown as Error, '{"code":42}'],
      ['a null cause', null as unknown as Error, 'Unknown error'],
    ])('formats %s in the error message', (_name, cause, expected) => {
      const schema = validator<unknown>(() => ({ success: false, error: cause }))
      const result = safeValidateTypes({ value: 1, schema })
      expect(result.success).toBe(false)
      if (!result.success)
        expect(result.error.message).toContain(expected)
    })
  })
})
