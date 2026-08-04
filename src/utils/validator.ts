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
   * Optional. Validates that the structure of a value matches this schema,
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
 * Create a validator.
 *
 * @param validate A validation function for the schema
 */
export function validator<T>(
  validate?: ((value: unknown) => ValidationResult<T>),
): Validator<T> {
  return { [validatorSymbol]: true, validate }
}

/**
 * Validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T The type of the object to validate
 * @param {string} options.value The object to validate
 * @param {Validator<T>} options.schema The schema to use for validating the JSON
 * @returns {T} The typed object
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
 * Safely validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T The type of the object to validate
 * @param {string} options.value The JSON object to validate
 * @param {Validator<T>} options.schema The schema to use for validating the JSON
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object
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
