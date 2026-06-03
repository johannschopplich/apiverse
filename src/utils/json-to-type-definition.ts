// `JSONSchema4` matches `json-schema-to-typescript-lite`'s `compile(schema: JSONSchema4)` input contract
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
  const { compile } = await import('json-schema-to-typescript-lite')
    .catch(() => {
      throw new Error('Missing dependency "json-schema-to-typescript-lite", please install it')
    })

  const resolvedOptions = resolveOptions(options)
  const schema = createJsonSchema(data, resolvedOptions)
  const output = await compile(schema, resolvedOptions.typeName)

  return `
${CODE_HEADER_DIRECTIVES}
${output}
`.trimStart()
}

function createJsonSchema(data: unknown, options: ResolvedTypeDefinitionOptions): JSONSchema4 {
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

  const primitiveType = typeof data

  if (primitiveType === 'string' || primitiveType === 'number' || primitiveType === 'boolean') {
    return { type: primitiveType }
  }

  // Fallback for unsupported types
  return {}
}

function mergeSchemas(schemas: JSONSchema4[], options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  if (schemas.length === 0)
    return {}

  if (schemas.length === 1)
    return schemas[0]!

  // Filter out empty schemas (representing unknown/any types from unsupported values)
  const definedSchemas = schemas.filter(schema => schema.type !== undefined || Object.keys(schema).length > 0)
  const hasEmptySchemas = schemas.length > definedSchemas.length

  if (definedSchemas.length === 0) {
    return {}
  }

  if (definedSchemas.length === 1 && !hasEmptySchemas) {
    return definedSchemas[0]!
  }

  const types = new Set(definedSchemas.map(schema => schema.type).filter(Boolean))

  // Create a union for mixed types or if there are empty schemas (unknown types)
  if (types.size !== 1 || hasEmptySchemas) {
    return createUnionSchema(definedSchemas, hasEmptySchemas)
  }

  const type = definedSchemas[0]!.type

  if (type === 'object') {
    return mergeObjectSchemas(definedSchemas, options)
  }

  if (type === 'array') {
    return mergeArraySchemas(definedSchemas, options)
  }

  return definedSchemas[0]!
}

/**
 * Deduplicates schemas by type and creates an anyOf union.
 *
 * @remarks
 * Primitives are deduplicated by type, objects/arrays are kept separate.
 */
function createUnionSchema(schemas: JSONSchema4[], hasEmptySchemas: boolean): JSONSchema4 {
  const schemasByType = new Map<string, JSONSchema4>()

  for (const schema of schemas) {
    const typeKey = schema.type as string | undefined

    // For primitive types, deduplicate by type
    // For objects/arrays, keep all (use unique key)
    if (typeKey && typeKey !== 'object' && typeKey !== 'array') {
      if (!schemasByType.has(typeKey)) {
        schemasByType.set(typeKey, schema)
      }
    }
    else {
      schemasByType.set(`${typeKey}-${schemasByType.size}`, schema)
    }
  }

  const unionSchemas = Array.from(schemasByType.values())

  if (hasEmptySchemas) {
    unionSchemas.push({}) // Add empty schema for unknown/any types
  }

  // If after deduplication we only have one schema, return it directly
  if (unionSchemas.length === 1 && !hasEmptySchemas) {
    return unionSchemas[0]!
  }

  return {
    anyOf: unionSchemas.map(schema => ({
      ...schema,
      additionalProperties: schema.type === 'object'
        ? schema.additionalProperties
        : undefined,
    })),
  }
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
      if (!propertySchemas.has(key))
        propertySchemas.set(key, [])

      propertySchemas.get(key)!.push(value)
    }
  }

  // Use intersection for required properties: only require properties that are required in **all** schemas
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
