import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { $Fetch, FetchOptions } from 'ofetch'
import type { OpenAPIClient } from './types.ts'
import { ofetch } from 'ofetch'

export type SchemaPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

interface OpenAPIRequestOptions extends FetchOptions {
  path?: Record<string, string>
}

export function createOpenAPIClient<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>(
  defaultOptions: FetchOptions = {},
): OpenAPIClient<Paths> {
  return createOpenAPIHandler<Paths>(ofetch.create(defaultOptions))
}

/**
 * Wraps a fetch function as an OpenAPI client, interpolating the `path`
 * parameters into the URL rather than passing them on as fetch options.
 */
export function createOpenAPIHandler<Paths>(fetchFn: $Fetch): OpenAPIClient<Paths> {
  return ((url: string, options?: OpenAPIRequestOptions) => {
    const { path: pathParams, ...fetchOptions } = options ?? {}
    return fetchFn(resolvePathParams(url, pathParams), fetchOptions)
  }) as OpenAPIClient<Paths>
}

export function resolvePathParams(path: string, params?: Record<string, string>): string {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replaceAll(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}
