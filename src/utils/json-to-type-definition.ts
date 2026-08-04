// `JSONSchema4` matches `json-schema-to-typescript-lite`'s `compile(schema: JSONSchema4)` input contract.
import type { JSONSchema4 } from 'json-schema'
import type { JsonValue } from './types.ts'
import { CODE_HEADER_DIRECTIVES } from '../constants.ts'

export interface TypeDefinitionOptions {
  /** @default 'Root' */
  typeName?: string
  /** @default false */
  strictProperties?: boolean
}

export type ResolvedTypeDefinitionOptions = Required<TypeDefinitionOptions>

export async function jsonToTypeDefinition(
  data: JsonValue,
  options: TypeDefinitionOptions = {},
): Promise<string> {
  let compile: typeof import('json-schema-to-typescript-lite').compile
  try {
    ({ compile } = await import('json-schema-to-typescript-lite'))
  }
  catch (error) {
    if (
      error instanceof Error && 'code' in error
      && (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND')
    ) {
      throw new Error('Missing dependency "json-schema-to-typescript-lite", please install it', { cause: error })
    }

    throw error
  }

  const resolvedOptions = resolveOptions(options)
  const schema = createJsonSchema(data, resolvedOptions)
  const output = await compile(schema, resolvedOptions.typeName)

  return `${CODE_HEADER_DIRECTIVES}\n${output}\n`
}

function createJsonSchema(data: JsonValue, options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  if (data === null) {
    return { type: 'null' }
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: {} }
    }

    const itemSchemas = data
      .filter(item => item !== undefined)
      .map(item => createJsonSchema(item, options))

    return {
      type: 'array',
      items: mergeSchemas(itemSchemas, options),
    }
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined)

    if (entries.length === 0) {
      return {
        type: 'object',
        additionalProperties: {},
      }
    }

    const properties = Object.fromEntries(entries.map(
      ([key, value]) => [key, createJsonSchema(value, options)],
    ))
    const propertyKeys = Object.keys(properties)

    return {
      type: 'object',
      properties,
      required: options.strictProperties ? propertyKeys : undefined,
      additionalProperties: false,
    }
  }

  if (typeof data === 'number') {
    return { type: 'number' }
  }

  if (typeof data === 'boolean') {
    return { type: 'boolean' }
  }

  if (typeof data !== 'string') {
    throw new TypeError(`Cannot convert value of type "${typeof data}" to a type definition`)
  }

  return { type: 'string' }
}

/**
 * Merges sibling schemas by kind: object schemas merge into a single shape,
 * array schemas merge their items, and primitives are deduplicated by type.
 * Mixed kinds combine into an `anyOf` union.
 *
 * @remarks
 * Object and array merging is invariant to sibling kinds, so a primitive
 * alongside several objects does not stop those objects from merging.
 */
function mergeSchemas(schemas: JSONSchema4[], options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  if (schemas.length === 0) {
    return {}
  }

  if (schemas.length === 1) {
    return schemas[0]!
  }

  const objectSchemas = schemas.filter(schema => schema.type === 'object')
  const arraySchemas = schemas.filter(schema => schema.type === 'array')
  const primitiveSchemas = schemas.filter(
    schema => schema.type !== 'object' && schema.type !== 'array',
  )

  const variants: JSONSchema4[] = []

  if (objectSchemas.length > 0) {
    variants.push(objectSchemas.length === 1 ? objectSchemas[0]! : mergeObjectSchemas(objectSchemas, options))
  }

  if (arraySchemas.length > 0) {
    variants.push(arraySchemas.length === 1 ? arraySchemas[0]! : mergeArraySchemas(arraySchemas, options))
  }

  // Deduplicate primitives by type, preserving first-seen order.
  const seenPrimitiveTypes = new Set<unknown>()
  for (const schema of primitiveSchemas) {
    if (!seenPrimitiveTypes.has(schema.type)) {
      seenPrimitiveTypes.add(schema.type)
      variants.push(schema)
    }
  }

  return variants.length === 1 ? variants[0]! : { anyOf: variants }
}

/**
 * Merges multiple object schemas by combining their properties.
 *
 * @remarks
 * Required properties use intersection semantics (only properties required in **all** schemas).
 */
function mergeObjectSchemas(schemas: JSONSchema4[], options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  const propertySchemas = new Map<string, JSONSchema4[]>()
  const schemasWithProperties = schemas.filter(schema => schema.properties)

  for (const schema of schemasWithProperties) {
    for (const [key, value] of Object.entries(schema.properties!)) {
      if (!propertySchemas.has(key)) {
        propertySchemas.set(key, [])
      }

      propertySchemas.get(key)!.push(value)
    }
  }

  // Use intersection for required properties: only require properties that are required in **all** schemas.
  const requiredProperties = schemasWithProperties.length > 0
    ? Array.from(propertySchemas.keys()).filter((key) => {
        return schemasWithProperties.every(
          schema => Array.isArray(schema.required) && schema.required.includes(key),
        )
      })
    : []

  return {
    type: 'object',
    properties: Object.fromEntries(
      Array.from(propertySchemas.entries()).map(([key, schemas]) => [
        key,
        mergeSchemas(schemas, options),
      ]),
    ),
    required: requiredProperties.length > 0 ? requiredProperties : undefined,
    additionalProperties: propertySchemas.size === 0 ? {} : false,
  }
}

/**
 * Merges multiple array schemas by merging their item schemas.
 */
function mergeArraySchemas(schemas: JSONSchema4[], options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  const itemSchemas = schemas
    .map(schema => schema.items)
    .filter((items): items is JSONSchema4 => Boolean(items))

  return {
    type: 'array',
    items: mergeSchemas(itemSchemas, options),
  }
}

function resolveOptions(options: TypeDefinitionOptions): ResolvedTypeDefinitionOptions {
  return {
    typeName: options.typeName || 'Root',
    strictProperties: options.strictProperties ?? false,
  }
}
