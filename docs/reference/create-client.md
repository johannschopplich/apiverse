# `createClient`

Creates an [`ApiClient`](/reference/api-client) from a set of default fetch options. Every APIful client starts here; the extensions you chain onto it decide how you write a request.

## Example

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
  .with(ofetchBuilder())

// GET request to https://api.example.com/users/1
const user = await client('users/1', { method: 'GET' })

// POST request with JSON body
const newUser = await client('users', {
  method: 'POST',
  body: { name: 'John Doe', email: 'john@example.com' }
})
```

## Type Definition

```ts
declare function createClient<const BaseURL extends string = '/'>(
  defaultOptions?: ClientOptions<BaseURL>,
  factoryOptions?: ClientFactoryOptions
): ApiClient<BaseURL>

interface ClientFactoryOptions {
  fetch?: $Fetch
}
```

`ClientOptions` is defined with the [`ApiClient`](/reference/api-client) type.

## Supplying Your Own Fetch

Every extension makes its requests through `client.fetch`. By default that is an ofetch instance built from `defaultOptions`, and building it is also what applies them. Pass your own to put a test double, an instrumented fetch, or an entirely different client underneath all of them at once:

```ts
import type { $Fetch } from 'ofetch'
import { apiRouterBuilder, createClient } from 'apiful'

const requests: string[] = []
const client = createClient({ baseURL: 'https://api.example.com' }, {
  fetch: (async (url: string) => {
    requests.push(url)
    return { id: 1 }
  }) as unknown as $Fetch,
})
  .with(apiRouterBuilder())
```

A fetch you supply is handed the request as it stands and owns its own options, so `defaultOptions` no longer reaches it – the exception is `baseURL`, which [`apiRouterBuilder`](/extensions/api-router) reads directly to build its routes. To keep ofetch's option handling while swapping only the transport, create the instance yourself with `ofetch.create(defaultOptions, { fetch })`.

> [!NOTE]
> `FetchOptions` and `$Fetch` are imported from [ofetch](https://github.com/unjs/ofetch).
