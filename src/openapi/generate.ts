import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ServiceOptions } from '../config.ts'
import * as path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { pascalCase } from 'scule'
import { defu } from 'utilful'

/** The `//` is required, so a Windows drive letter is not read as a scheme. */
const URL_SCHEME_RE = /^[a-z][\w+.-]*:\/\//i

export interface DTSFragmentOutput {
  /** The `apiful/schema` module, importing from every fragment and exporting the type helpers. */
  entry: string
  /** One `apiful/schema/<id>` module per service, keyed by service name. */
  fragments: Record<string, string>
}

export interface GenerateOptions {
  openAPITSOptions?: OpenAPITSOptions
  /** Directory a relative schema path resolves against. Defaults to the current working directory. */
  rootDir?: string
}

export class SchemaGenerationError extends Error {}

export async function generateDTS(
  services: Record<string, ServiceOptions>,
  options: GenerateOptions = {},
): Promise<string> {
  return joinDTSFragments(await generateDTSFragments(services, options))
}

/** Joins the entry and the per-service fragments into the single file `generateDTS` returns. */
export function joinDTSFragments({ entry, fragments }: DTSFragmentOutput): string {
  const fragmentContent = Object.values(fragments).join('\n\n')
  return fragmentContent ? `${entry}\n${fragmentContent}` : entry
}

export async function generateDTSFragments(
  services: Record<string, ServiceOptions>,
  options: GenerateOptions = {},
): Promise<DTSFragmentOutput> {
  const resolvedSchemaEntries = await Promise.all(
    Object.entries(services).map(async ([id, service]) => {
      const types = await generateSchemaTypes({ id, service, ...options })
      return [id, types] as const
    }),
  )

  const resolvedSchemas = Object.fromEntries(resolvedSchemaEntries)
  const serviceIds = Object.keys(resolvedSchemas)

  const servicePathImports = serviceIds
    .map(id => `  import { paths as ${pascalCase(id)}Paths, components as ${pascalCase(id)}Components } from 'apiful/schema/${id}'`)
    .join('\n')

  const schemaRepositoryEntries = serviceIds
    .map(id => `    '${id}': ${pascalCase(id)}Paths`)
    .join('\n')

  const typeExports = serviceIds
    .map(generateTypeHelpers)
    .join('\n\n')

  const fragments = Object.fromEntries(
    Object.entries(resolvedSchemas).map(([id, types]) => {
      const content = `
declare module 'apiful/schema/${id}' {
${normalizeIndentation(types).trimEnd()}
}
`.trimStart()
      return [id, content]
    }),
  )

  const entry = `
declare module 'apiful/schema' {
  import { OpenAPIEndpoint, OpenAPIPathMethods } from 'apiful/openapi'
${servicePathImports}

  interface OpenAPISchemaRepository {
${schemaRepositoryEntries}
  }

${applyLineIndent(typeExports)}
}
`.trimStart()

  return {
    entry,
    fragments,
  }
}

/**
 * Emits the type helpers for one service. The emitted code references `<Id>Paths` and
 * `<Id>Components` along with `OpenAPIEndpoint` and `OpenAPIPathMethods`, none of which it
 * imports – the module declaration it is placed in brings them into scope.
 */
export function generateTypeHelpers(id: string): string {
  return `
/**
 * OpenAPI endpoint type helper for the ${pascalCase(id)} API.
 *
 * @example
 * // Get path parameters for retrieving a user by ID:
 * type UserParams = ${pascalCase(id)}<'/users/{id}', 'get'>['path']
 *
 * // Get query parameters for listing users:
 * type UsersQuery = ${pascalCase(id)}<'/users', 'get'>['query']
 *
 * // Get request body type for creating a user:
 * type CreateUserBody = ${pascalCase(id)}<'/users', 'post'>['request']
 *
 * // Get success response for retrieving a user:
 * type UserResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['response']
 *
 * // Get a specific status code response:
 * type UserNotFoundResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['responses'][404]
 *
 * // Get complete endpoint type definition:
 * type UserEndpoint = ${pascalCase(id)}<'/users/{id}', 'get'>
 */
export type ${pascalCase(id)}<
  Path extends keyof ${pascalCase(id)}Paths,
  Method extends OpenAPIPathMethods<${pascalCase(id)}Paths, Path>
> = OpenAPIEndpoint<${pascalCase(id)}Paths, Path, Method>

/**
 * @example
 * type AvailablePaths = ${pascalCase(id)}ApiPaths // Returns literal union of all available paths
 */
export type ${pascalCase(id)}ApiPaths = keyof ${pascalCase(id)}Paths

/**
 * @example
 * type UserMethods = ${pascalCase(id)}ApiMethods<'/users/{id}'> // Returns 'get' | 'put' | 'delete' etc.
 */
export type ${pascalCase(id)}ApiMethods<Path extends keyof ${pascalCase(id)}Paths> = OpenAPIPathMethods<${pascalCase(id)}Paths, Path>

/**
 * @example
 * type Pet = ${pascalCase(id)}Model<'Pet'> // Get the Pet schema model
 * type User = ${pascalCase(id)}Model<'User'> // Get the User schema model
 */
export type ${pascalCase(id)}Model<T extends keyof ${pascalCase(id)}Components['schemas']> = ${pascalCase(id)}Components['schemas'][T]
`.trim()
}

/** Runs `openapi-typescript` for one service and returns its types, without a module declaration around them. */
export async function generateSchemaTypes(options: {
  id: string
  service: ServiceOptions
} & GenerateOptions): Promise<string> {
  const { default: openAPITS, astToString } = await import('openapi-typescript')
    .catch(() => {
      throw new Error('Missing dependency "openapi-typescript", please install it')
    })

  const schema = await resolveSchema(options.service, options.rootDir)
  const resolvedOpenAPITSOptions = defu(options.service.openAPITS || {}, options.openAPITSOptions || {})

  try {
    const ast = await openAPITS(schema, resolvedOpenAPITSOptions)
    return astToString(ast)
  }
  catch (error) {
    const reason = Error.isError(error) ? error.message : String(error)
    throw new SchemaGenerationError(
      `Failed to generate types for service \`${options.id}\` – ${reason}`,
      { cause: error },
    )
  }
}

async function resolveSchema(
  { schema }: ServiceOptions,
  rootDir = process.cwd(),
): Promise<string | URL | OpenAPI3> {
  if (typeof schema === 'function')
    return await schema()

  if (typeof schema === 'string') {
    if (URL_SCHEME_RE.test(schema)) {
      // openapi-typescript reads a `file:` URL from disk and fetches every other one.
      return schema.startsWith('file://') ? new URL(schema) : schema
    }

    const resolvedPath = path.isAbsolute(schema)
      ? schema
      : path.resolve(rootDir, schema)

    // openapi-typescript expects file URLs for local files.
    return pathToFileURL(resolvedPath)
  }

  return schema
}

function applyLineIndent(code: string, indent = 2): string {
  return code.replace(/^/gm, ' '.repeat(indent))
}

function normalizeIndentation(code: string) {
  // Replace each cluster of four spaces with two spaces.
  const replacedCode = code.replace(/^( {4})+/gm, match => '  '.repeat(match.length / 4))

  // Ensure each line starts with exactly two spaces.
  const normalizedCode = replacedCode.replace(/^/gm, '  ')

  return normalizedCode
}
