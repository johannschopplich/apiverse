import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ServiceOptions } from '../config.ts'
import * as path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { pascalCase } from 'scule'
import { defu } from 'utilful'

export class SchemaGenerationError extends Error {}

export interface DTSModuleOutput {
  entry: string
  modules: Record<string, string>
}

export interface GenerateOptions {
  openAPITSOptions?: OpenAPITSOptions
  /** Directory a relative schema path resolves against. Defaults to the current working directory. */
  rootDir?: string
}

export async function generateDTS(
  services: Record<string, ServiceOptions>,
  options: GenerateOptions = {},
): Promise<string> {
  const { entry, modules } = await generateDTSModules(services, options)
  const moduleContent = Object.values(modules).join('\n\n')
  return moduleContent ? `${entry}\n${moduleContent}` : entry
}

export async function generateDTSModules(
  services: Record<string, ServiceOptions>,
  options: GenerateOptions = {},
): Promise<DTSModuleOutput> {
  const resolvedSchemaEntries = await Promise.all(
    Object.entries(services)
      .filter(([, service]) => Boolean(service.schema))
      .map(async ([id, service]) => {
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
    .map((id) => {
      return [`
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
  Method extends PathMethods<${pascalCase(id)}Paths, Path> = PathMethods<${pascalCase(id)}Paths, Path> extends string ? PathMethods<${pascalCase(id)}Paths, Path> : never
> = {
  path: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { path?: infer P } } ? P : Record<string, never>

  query: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { query?: infer Q } } ? Q : Record<string, never>

  request: ${pascalCase(id)}Paths[Path][Method] extends { requestBody?: { content: { 'application/json': infer R } } } ? R : Record<string, never>

  /** Response body for status 200. */
  response: ${pascalCase(id)}Paths[Path][Method] extends { responses: infer R }
    ? 200 extends keyof R
      ? R[200] extends { content: { 'application/json': infer S } } ? S : Record<string, never>
      : Record<string, never>
    : Record<string, never>

  /** Response bodies keyed by status code. */
  responses: ${pascalCase(id)}Paths[Path][Method] extends { responses: infer T }
    ? {
        [Status in keyof T]:
          T[Status] extends { content: { 'application/json': infer R } }
            ? R
            : Record<string, never>
      }
    : Record<string, never>

  /** Path literal including its parameter placeholders, for route builders to consume. */
  fullPath: Path

  method: Method

  /** Raw operation object, carrying metadata such as tags and security requirements. */
  operation: ${pascalCase(id)}Paths[Path][Method]
}

/**
 * @example
 * type AvailablePaths = ${pascalCase(id)}ApiPaths // Returns literal union of all available paths
 */
export type ${pascalCase(id)}ApiPaths = keyof ${pascalCase(id)}Paths

/**
 * @example
 * type UserMethods = ${pascalCase(id)}ApiMethods<'/users/{id}'> // Returns 'get' | 'put' | 'delete' etc.
 */
export type ${pascalCase(id)}ApiMethods<P extends keyof ${pascalCase(id)}Paths> = PathMethods<${pascalCase(id)}Paths, P>

/**
 * @example
 * type Pet = ${pascalCase(id)}Model<'Pet'> // Get the Pet schema model
 * type User = ${pascalCase(id)}Model<'User'> // Get the User schema model
 */
export type ${pascalCase(id)}Model<T extends keyof ${pascalCase(id)}Components['schemas']> = ${pascalCase(id)}Components['schemas'][T]
`.trim()].join('\n')
    })
    .join('\n\n')

  const modules = Object.fromEntries(
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
${servicePathImports}

  interface OpenAPISchemaRepository {
${schemaRepositoryEntries}
  }

  type NonNeverKeys<T> = { [K in keyof T]: T[K] extends never ? never : K }[keyof T]
  type PathMethods<T, P extends keyof T> = Exclude<NonNeverKeys<T[P]>, 'parameters'>

${applyLineIndent(typeExports)}
}
`.trimStart()

  return {
    entry,
    modules,
  }
}

async function generateSchemaTypes(options: {
  id: string
  service: ServiceOptions
} & GenerateOptions) {
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
    if (/^https?:\/\//i.test(schema))
      return schema

    if (schema.startsWith('file://'))
      return new URL(schema)

    const resolvedPath = path.isAbsolute(schema)
      ? schema
      : path.resolve(rootDir, schema)

    // openapi-typescript expects file URLs for local files.
    return pathToFileURL(resolvedPath)
  }

  return schema!
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
