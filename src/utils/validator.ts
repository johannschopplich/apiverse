// Inspired from Vercel's `provider-utils` package:
// https://github.com/vercel/ai/blob/b113999e8667417b042b9e1c2401402adb0ed9f3/packages/provider-utils/src/validate-types.ts
// License: Apache-2.0

/* eslint-disable jsdoc/check-param-names */
export const validatorSymbol: unique symbol = Symbol.for('apiful.validator')

export type ValidationResult<T, E = Error>
  = | { success: true, value: T }
    | { success: false, error: E }

export interface Validator<T = unknown> {
  [validatorSymbol]: true

  /**
   * Validates that the structure of a value matches this schema,
   * and returns a typed version of the value if it does.
   */
  readonly validate?: (value: unknown) => ValidationResult<T>
}

export class TypeValidationError extends Error {
  readonly value: unknown
  readonly cause?: unknown

  constructor({
    value,
    cause,
  }: {
    value: unknown
    cause?: unknown
  }) {
    let serializedValue: string
    try {
      serializedValue = JSON.stringify(value)
    }
    catch {
      serializedValue = String(value)
    }

    super(
      `Type validation failed with value: ${serializedValue}\nError message: ${getErrorMessage(cause)}`,
    )

    this.value = value
    this.cause = cause
  }
}

/**
 * Wraps a validation function as a `Validator`.
 *
 * @param validate A validation function for the schema
 */
export function validator<T>(
  validate?: ((value: unknown) => ValidationResult<T>),
): Validator<T> {
  return { [validatorSymbol]: true, validate }
}

/**
 * Validates an unknown value against a schema and returns it strongly typed.
 *
 * @template T The type the value is validated against
 * @param value The value to validate
 * @param schema The schema to validate against
 */
export function validateTypes<T>({
  value,
  schema: inputSchema,
}: {
  value: unknown
  schema: Validator<T>
}): T {
  const result = safeValidateTypes({ value, schema: inputSchema })

  if (!result.success) {
    throw new TypeValidationError({ value, cause: result.error })
  }

  return result.value
}

/**
 * Validates an unknown value against a schema, reporting failure as a result
 * rather than as a thrown error.
 *
 * @template T The type the value is validated against
 * @param value The value to validate
 * @param schema The schema to validate against
 * @returns Either the typed value under a `success` flag, or the error that rejected it
 */
export function safeValidateTypes<T>({
  value,
  schema,
}: {
  value: unknown
  schema: Validator<T>
}): ValidationResult<T, TypeValidationError> {
  try {
    if (schema.validate == null) {
      return { success: true, value: value as T }
    }

    const result = schema.validate(value)

    if (result.success) {
      return result
    }

    return {
      success: false,
      error: new TypeValidationError({ value, cause: result.error }),
    }
  }
  catch (error) {
    return {
      success: false,
      error: new TypeValidationError({ value, cause: error }),
    }
  }
}

export function isValidator(value: unknown): value is Validator {
  return (
    typeof value === 'object'
    && value !== null
    && validatorSymbol in value
    && value[validatorSymbol] === true
    && 'validate' in value
  )
}

function getErrorMessage(error?: unknown) {
  if (error == null) {
    return 'Unknown error'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error)
}
