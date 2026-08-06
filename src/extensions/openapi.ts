import type { ApiClient } from '../client.ts'
import type { SchemaPaths } from '../openapi/index.ts'
import type { OpenAPIClient } from '../openapi/types.ts'
import { createOpenAPIHandler } from '../openapi/index.ts'

export type * from '../openapi/types.ts'

export function OpenAPIBuilder<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    return createOpenAPIHandler<Paths>(client.fetch)
  }
}
