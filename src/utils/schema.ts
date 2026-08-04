import type { JSONSchema7 } from 'json-schema'
import type { ValidationResult, Validator } from './validator.ts'
import { validatorSymbol } from './validator.ts'

const schemaSymbol: unique symbol = Symbol.for('apiful.schema')

export interface Schema<T = unknown> extends Validator<T> {
  [schemaSymbol]: true

  /** Schema type for inference. */
  _type: T

  readonly jsonSchema: JSONSchema7
}

export function jsonSchema<T = unknown>(
  jsonSchema: JSONSchema7,
  { validate }: {
    validate?: (value: unknown) => ValidationResult<T>
  } = {},
): Schema<T> {
  return {
    [schemaSymbol]: true,
    _type: undefined as T, // Carries the inferred type only, and is never read.
    [validatorSymbol]: true,
    jsonSchema,
    validate,
  }
}

export function isSchema(value: unknown): value is Schema {
  return (
    typeof value === 'object'
    && value !== null
    && schemaSymbol in value
    && value[schemaSymbol] === true
    && 'jsonSchema' in value
    && 'validate' in value
  )
}
