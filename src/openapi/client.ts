import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { FetchContext, FetchOptions } from 'ofetch'
import type { OpenAPIClient } from './types.ts'
import { ofetch } from 'ofetch'

export type SchemaPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

export function createOpenAPIClient<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>(
  defaultOptions: FetchOptions | (() => FetchOptions) = {},
): OpenAPIClient<Paths> {
  const client = ofetch.create(typeof defaultOptions === 'function' ? defaultOptions() : defaultOptions)

  return (url, options) => client(
    // @ts-expect-error: `path` is added by OpenAPI types, not part of ofetch's `FetchOptions`.
    resolvePathParams(url, options?.path),
    options as Record<string, any>,
  )
}

export function resolvePathParams(path: string, params?: Record<string, string>): string {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replaceAll(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}

export function fetchRequestInterceptor(ctx: FetchContext): void {
  ctx.request = resolvePathParams(
    ctx.request as string,
    // @ts-expect-error: `path` is added by OpenAPI types, not part of ofetch's `FetchOptions`.
    ctx.options.path,
  )
}
