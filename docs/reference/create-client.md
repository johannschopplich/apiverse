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
  defaultOptions?: ClientOptions<BaseURL>
): ApiClient<BaseURL>
```

`ClientOptions` is defined with the [`ApiClient`](/reference/api-client) type.

> [!NOTE]
> `FetchOptions` are imported from [ofetch](https://github.com/unjs/ofetch).
