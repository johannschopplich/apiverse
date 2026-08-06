# Getting Started

An APIful client is a set of default fetch options – a base URL, headers, retries – plus the extensions you add to it. The extensions decide how you write a request and how much of it TypeScript knows: plain `fetch`-style calls, a chain of path segments, or paths and responses typed from an OpenAPI schema.

Start with one of the [built-in extensions](/extensions/), or [write your own](/guide/custom-extensions). Either way the client stays one callable object, which is [how extensions work](/guide/using-extensions#how-extensions-work).

## Installation

Get started by installing `apiful` in your project:

::: code-group
  ```bash [pnpm]
  pnpm add apiful
  ```
  ```bash [yarn]
  yarn add apiful
  ```
  ```bash [npm]
  npm install apiful
  ```
:::

> [!TIP]
> Your API client ships with your application, so `apiful` belongs in `dependencies`. Only the schema tooling it calls during type generation – [`openapi-typescript`](/extensions/openapi#prerequisites) and [`json-schema-to-typescript-lite`](/utilities/json-to-type-definition) – is a development dependency.

## Your First API Client

Start by creating your first API client with a base URL and authorization headers:

```ts
import { createClient } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
```

> [!NOTE]
> `createClient` returns an [`ApiClient`](/reference/api-client) that cannot make requests yet – calling it throws a `TypeError` until you add a handler extension.

## Add a Handler Extension

`ofetchBuilder` wraps [ofetch](https://github.com/unjs/ofetch) and is the shortest way to a working client. It is one of three [built-in extensions](/extensions/), which differ in how you write a request – pick another one later if it suits your API better.

Add it to your client with the `with` method:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
  .with(ofetchBuilder())
```

Your client can now make HTTP requests:

```ts
// GET request to https://api.example.com/users/1
const user = await client('users/1', { method: 'GET' })

// POST request with JSON body
const newUser = await client('users', {
  method: 'POST',
  body: { name: 'John Doe', email: 'john@example.com' }
})
```

Each request inherits the client's default options and can override them individually. JSON serialization, response parsing, and thrown errors for non-2xx responses come from ofetch.

> [!TIP]
> If your API publishes an OpenAPI schema, the [OpenAPI extension](/extensions/openapi) types paths, bodies, and responses for you from that schema.

## Chaining Extensions

A client can carry more than one extension. Chain `with` calls to add them:

```ts
const client = createClient({ baseURL: 'https://api.example.com' })
  // Handler extension: makes the client callable
  .with(ofetchBuilder())
  // Methods extension: adds `logDefaults()`
  .with(logExtension)
```

See [Custom Extensions](/guide/custom-extensions) for how `logExtension` is written, and [how extensions work](/guide/using-extensions#how-extensions-work) for what happens when two of them collide.
