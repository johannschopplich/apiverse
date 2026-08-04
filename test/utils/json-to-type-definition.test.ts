import type { JsonValue } from '../../src/utils'
import { describe, expect, it } from 'vitest'
import { jsonToTypeDefinition } from '../../src/utils/json-to-type-definition'

describe('jsonToTypeDefinition', () => {
  describe('primitive types', () => {
    it.each([
      ['test', 'StringType', 'string'],
      [42, 'NumberType', 'number'],
      [true, 'BooleanType', 'boolean'],
      [null, 'NullType', 'null'],
    ] as const)('handles %p as %s', async (input, typeName, expected) => {
      const result = await jsonToTypeDefinition(input, { typeName })
      expect(result).toContain(`export type ${typeName} = ${expected}`)
    })
  })

  describe('arrays', () => {
    it('handles empty array', async () => {
      const result = await jsonToTypeDefinition([], { typeName: 'EmptyArray' })
      expect(result).toContain('export type EmptyArray = unknown[]')
    })

    it('handles homogeneous array', async () => {
      const result = await jsonToTypeDefinition([1, 2, 3], { typeName: 'NumberArray' })
      expect(result).toContain('export type NumberArray = number[]')
    })

    it('handles mixed type array', async () => {
      const result = await jsonToTypeDefinition([1, 'two', true], { typeName: 'MixedArray' })
      expect(result).toContain('(number | string | boolean)[]')
    })

    it('handles nested arrays', async () => {
      const result = await jsonToTypeDefinition([[1, 2], [3, 4]], { typeName: 'Matrix' })
      expect(result).toContain('export type Matrix = number[][]')
    })

    it('merges object properties across array items', async () => {
      const input = [
        { id: 1, name: 'first' },
        { id: 2, email: 'test@example.com' },
      ]
      const result = await jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'ObjectArray' })
      expect(result).toContain('id?: number')
      expect(result).toContain('name?: string')
      expect(result).toContain('email?: string')
    })

    it('merges object properties through nested arrays', async () => {
      const result = await jsonToTypeDefinition([[{ a: 1 }], [{ b: 2 }]], { typeName: 'Grid' })
      expect(result).toContain('a?: number')
      expect(result).toContain('b?: number')
      expect(result).toContain('}[][]')
    })

    it('merges deeply nested object schemas across array items', async () => {
      const input = [
        { meta: { version: 1 } },
        { meta: { name: 'alpha' } },
      ]
      const result = await jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Deep' })
      expect(result).toContain('version?: number')
      expect(result).toContain('name?: string')
    })

    it('unions a property that holds different types across items', async () => {
      const input = [
        { id: 1 },
        { id: 'two' },
      ]
      const result = await jsonToTypeDefinition(input, { typeName: 'MixedProp' })
      expect(result).toMatch(/id\?:\s*\(?number \| string\)?/)
    })

    it('merges objects even when the array also holds primitives', async () => {
      const input = [1, 'two', { a: 1 }, { b: 2 }]
      const result = await jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Mixed' })
      expect(result).toMatchInlineSnapshot(`
        "/* eslint-disable */
        export type Mixed = ({
          a?: number
          b?: number
        } | number | string)[]

        "
      `)
    })

    it('filters undefined and sparse values', async () => {
      // eslint-disable-next-line no-sparse-arrays
      const result = await jsonToTypeDefinition([1, undefined, , 3] as unknown as JsonValue, { typeName: 'Filtered' })
      expect(result).toContain('export type Filtered = number[]')
    })

    it('types sparse or all-undefined arrays as unknown items', async () => {
      // eslint-disable-next-line no-sparse-arrays
      const result = await jsonToTypeDefinition([undefined, , undefined] as unknown as JsonValue, { typeName: 'AllUnknown' })
      expect(result).toContain('unknown[]')
    })

    it('deduplicates primitive types', async () => {
      const result = await jsonToTypeDefinition([null, 'a', null, 'b'], { typeName: 'Dedup' })
      expect(result).toContain('(null | string)[]')
    })
  })

  describe('objects', () => {
    it('handles empty object', async () => {
      const result = await jsonToTypeDefinition({}, { typeName: 'EmptyObject' })
      expect(result).toContain('[k: string]: unknown')
    })

    it('handles nested objects', async () => {
      const result = await jsonToTypeDefinition({ a: { b: { c: 1 } } }, { typeName: 'Nested' })
      expect(result).toMatchInlineSnapshot(`
        "/* eslint-disable */
        export interface Nested {
          a?: {
            b?: {
              c?: number
            }
          }
        }

        "
      `)
    })

    it('quotes special property names', async () => {
      const result = await jsonToTypeDefinition({ 'kebab-case': 1, '123': 2 }, { typeName: 'Special' })
      expect(result).toContain('"kebab-case"?: number')
      expect(result).toContain('"123"?: number')
    })

    it('excludes undefined properties', async () => {
      const result = await jsonToTypeDefinition({ a: 1, undef: undefined } as unknown as JsonValue, { typeName: 'NoUndef' })
      expect(result).toContain('a?: number')
      expect(result).not.toContain('undef')
    })

    it('handles null property values', async () => {
      const result = await jsonToTypeDefinition({ nullable: null, name: 'test' }, { typeName: 'WithNull' })
      expect(result).toContain('nullable?: null')
      expect(result).toContain('name?: string')
    })
  })

  describe('options', () => {
    it('defaults typeName to "Root"', async () => {
      const result = await jsonToTypeDefinition({ value: 1 })
      expect(result).toContain('export interface Root')
    })

    it('makes properties optional by default', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T' })
      expect(result).toContain('a?: number')
    })

    it('makes properties required with strictProperties', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T', strictProperties: true })
      expect(result).toContain('a: number')
      expect(result).not.toMatch(/a\?:/)
    })

    it('propagates strictProperties into nested objects', async () => {
      const result = await jsonToTypeDefinition({ a: { b: 1 } }, { typeName: 'Strict', strictProperties: true })
      expect(result).toMatchInlineSnapshot(`
        "/* eslint-disable */
        export interface Strict {
          a: {
            b: number
          }
        }

        "
      `)
    })

    it('uses intersection for required properties in merged objects', async () => {
      const input = [
        { shared: 1, onlyFirst: 'a' },
        { shared: 2, onlySecond: true },
      ]
      const result = await jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Merged', strictProperties: true })
      // `shared` appears in both objects, so it should be required.
      expect(result).toMatch(/shared:\s*number/)
      // `onlyFirst` and `onlySecond` only appear in one object each, so they should be optional.
      expect(result).toContain('onlyFirst?:')
      expect(result).toContain('onlySecond?:')
    })
  })

  describe('output format', () => {
    it('includes eslint-disable header', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T' })
      expect(result).toMatch(/^\/\* eslint-disable \*\//)
    })
  })

  describe('invalid input', () => {
    it.each([
      ['bigint at root', 10n],
      ['function nested in object', { fn: () => 1 }],
      ['symbol nested in array', [Symbol('x')]],
    ])('throws TypeError for %s', async (_label, input) => {
      await expect(jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Bad' }))
        .rejects
        .toThrow(TypeError)
    })
  })
})
