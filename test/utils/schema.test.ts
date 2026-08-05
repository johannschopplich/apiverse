import type { Schema } from '../../src/utils/schema'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isSchema, jsonSchema } from '../../src/utils/schema'
import { safeValidateTypes, validator } from '../../src/utils/validator'

describe('schema', () => {
  describe('jsonSchema', () => {
    it('keeps the JSON schema definition it was given', () => {
      const schema = jsonSchema<string>({
        type: 'string',
      })
      expectTypeOf(schema).toEqualTypeOf<Schema<string>>()
      expect(schema.jsonSchema).toMatchInlineSnapshot(`
        {
          "type": "string",
        }
      `)
    })

    it('keeps the validate function it was given', () => {
      const schema = jsonSchema<number>(
        {
          type: 'number',
        },
        {
          validate: (value) => {
            if (typeof value === 'number') {
              return { success: true, value }
            }
            return { success: false, error: new Error('Not a number') }
          },
        },
      )

      expectTypeOf(schema).toEqualTypeOf<Schema<number>>()
      expect(schema.validate).toBeDefined()
    })
  })

  describe('isSchema', () => {
    it('returns true for a schema from jsonSchema', () => {
      const schema = jsonSchema<string>({ type: 'string' })
      expect(isSchema(schema)).toBe(true)
    })

    it('rejects non-schema objects', () => {
      expect(isSchema({})).toBe(false)
      expect(isSchema(null)).toBe(false)
      expect(isSchema(undefined)).toBe(false)
    })

    it('rejects validators that are not wrapped as schemas', () => {
      const bareValidator = validator<string>()
      expect(isSchema(bareValidator)).toBe(false)
    })

    it('rejects primitive values outright', () => {
      expect(isSchema('string')).toBe(false)
      expect(isSchema(42)).toBe(false)
      expect(isSchema(true)).toBe(false)
    })
  })

  describe('validation', () => {
    it('validates values against the schema validate function', () => {
      const schema = jsonSchema<number>(
        { type: 'number' },
        {
          validate: (value) => {
            if (typeof value === 'number') {
              return { success: true, value }
            }
            return { success: false, error: new Error('Not a number') }
          },
        },
      )

      expect(safeValidateTypes({ value: 7, schema }))
        .toEqual({ success: true, value: 7 })
    })

    it('accepts any value when the schema has no validator', () => {
      const schema = jsonSchema<string>({ type: 'string' })
      const result = safeValidateTypes({ value: 'anything', schema })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe('anything')
      }
    })
  })
})
