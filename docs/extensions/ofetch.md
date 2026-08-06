# `ofetchBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) that wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This is the shortest way to make requests with APIful: an [ofetch](https://github.com/unjs/ofetch) instance created from your client's default options. If you know `fetch`, you know this extension – ofetch adds JSON serialization, response parsing, thrown errors for non-2xx responses, retries, and request hooks on top of it.

Import the `ofetchBuilder` extension and add it to your client:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .with(ofetchBuilder())
```

The `client` now has the same API as [ofetch](https://github.com/unjs/ofetch), accepting all options that ofetch provides:

```ts
// GET request with query parameters
const users = await client('users', {
  method: 'GET',
  query: { page: 1, limit: 10 }
})

// POST request with JSON body
const newUser = await client('users', {
  method: 'POST',
  body: { name: 'John Doe', email: 'john@example.com' }
})
```

> [!TIP]
> Every option ofetch accepts is documented in [its readme](https://github.com/unjs/ofetch#options), and each one can be set per request or as a client default.
