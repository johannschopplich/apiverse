# `createOpenAPIClient`

Creates a type-safe OpenAPI client from a generated schema. This is the direct way to call an OpenAPI service, and the one to reach for by default.

Use [`createClient`](/reference/create-client) with [`OpenAPIBuilder`](/extensions/openapi) instead when the same client also has to carry other extensions. Both give you the same types from the same schema – the builder adds the `.with()` chain on top.

## Prerequisites

Same as the [`OpenAPIBuilder`](/extensions/openapi#prerequisites) extension – you need `openapi-typescript` installed and TypeScript definitions generated using the [`generate`](/guide/cli) command.

## Example

```ts
import { createOpenAPIClient } from 'apiful/openapi/client'

const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  headers: {
    Authorization: 'Bearer <token>',
  },
})

const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

## Type Definition

```ts
declare function createOpenAPIClient<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>(
  defaultOptions?: FetchOptions
): OpenAPIClient<Paths>
```

> [!NOTE]
> `Schema` is the service name from your `apiful.config.ts` file, same as with `OpenAPIBuilder`. `Paths` is derived from it and is not meant to be passed.

## Options Resolved per Request

The default options are read once, when the client is created. For a value that changes between requests – a rotating token, for example – use ofetch's `onRequest` hook, which runs on every call:

```ts
const client = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${getAuthToken()}`)
  },
})
```

## Bringing Your Own Fetch

`createOpenAPIClient` builds its fetch function with `ofetch.create`. To supply one yourself – an instance you already configured, or a stub in a test – wrap it with `createOpenAPIHandler`, which is what this function and `OpenAPIBuilder` both use underneath:

```ts
import type { SchemaPaths } from 'apiful/openapi'
import { createOpenAPIHandler } from 'apiful/openapi/client'

const petStore = createOpenAPIHandler<SchemaPaths<'petStore'>>(myFetch)
```

It resolves the `path` parameters into the URL and passes every other option on to the fetch function unchanged.
