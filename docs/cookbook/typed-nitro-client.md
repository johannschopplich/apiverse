# Typed Client for Nitro Servers

[Nitro](https://nitro.build) is excellent for building web servers with everything you need and deploying them wherever you want. This guide shows you how to set up a fully typed client for your Nitro server quickly.

We will use the [APIful CLI](/guide/cli) to transform the OpenAPI schema into type definitions and [`createClient`](/reference/create-client) with [`OpenAPIBuilder`](/extensions/openapi) to instantiate a typed client.

> [!NOTE]
> This guide targets **Nitro v3**, which ships as the `nitro` package and is currently in beta. Its OpenAPI support is behind an experimental flag. If you are starting from scratch, follow Nitro's [quick start](https://nitro.build/docs/quick-start) first – everything below assumes a working Nitro app.

## 1️⃣ Enable OpenAPI Schema in Nitro

Nitro serves the OpenAPI schema at `/_openapi.json`. The route is behind an experimental flag, so enable it in your `nitro.config.ts`:

```ts
import { defineConfig } from 'nitro'

export default defineConfig({
  experimental: {
    openAPI: true,
  },

  openAPI: {
    meta: {
      title: 'My API',
      version: '1.0.0',
    },
  },
})
```

Start your dev server and open `/_scalar` or `/_swagger` in the browser. Both UIs are served automatically and are the quickest way to confirm the schema exists before you generate anything from it.

## 2️⃣ Describe Your Routes

Nitro derives the schema from your route handlers. Paths and path parameters are picked up automatically, but request and response shapes are not – a handler without metadata contributes a bare `200: { description: 'OK' }` to the schema, which generates a client whose responses are `unknown`.

Use the `defineRouteMeta` macro to describe what a route accepts and returns. Its `openAPI` property takes a standard OpenAPI [Operation Object](https://spec.openapis.org/oas/v3.1.0#operation-object):

```ts
// server/api/users/index.get.ts
import { defineHandler, defineRouteMeta } from 'nitro'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    description: 'List all users',
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
    },
    $global: {
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'name', 'email'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
    },
  },
})

export default defineHandler(() => {
  return [{ id: '1', name: 'Alice', email: 'alice@example.com' }]
})
```

Schemas declared under `$global` are hoisted into the top-level `components` section, so every other route can reference them with `$ref` instead of repeating them:

```ts
// server/api/users/[id].get.ts
import { defineHandler, defineRouteMeta } from 'nitro'
import { getRouterParam } from 'nitro/h3'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    description: 'Get a user by ID',
    responses: {
      200: {
        description: 'User found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      404: { description: 'User not found' },
    },
  },
})

export default defineHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { id, name: 'Alice', email: 'alice@example.com' }
})
```

## 3️⃣ Generate Type Definitions for the OpenAPI Schema

Create an `apiful.config.ts` file and point the service at your running dev server:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    myApi: {
      schema: 'http://localhost:3000/_openapi.json',
    },
  },
})
```

Next, run the following command to generate the type definitions, saved as `apiful.d.ts` by default:

```bash
npx apiful generate
```

Type definitions for the `myApi` service will augment the global `apiful/schema`, making them available to the `OpenAPIBuilder` extension.

> [!IMPORTANT]
> The `/_openapi.json` route is only served in development. Keep your Nitro dev server running while generating types from a URL.

> [!TIP]
> For CI, where booting the dev server is awkward, let Nitro write the schema to disk instead. Setting `openAPI.production` to `'prerender'` emits `.output/public/_openapi.json` during `vite build`, which you can then reference as `schema: '.output/public/_openapi.json'`. Note that this also serves the schema publicly in production – guard the route if that is not what you want.

## 4️⃣ Create the Typed Client

Finally, create an API client using the `OpenAPIBuilder` extension. Pass `myApi` as a generic type parameter to `OpenAPIBuilder` so that the client is typed with the definitions generated from the OpenAPI schema:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const client = createClient({ baseURL: 'http://localhost:3000' })
  .with(OpenAPIBuilder<'myApi'>())
```

## 5️⃣ Request Data With the Typed Client

Now you can use the typed client to make requests to your Nitro server. Return types and parameters are automatically inferred from the OpenAPI schema:

```ts
// Response is typed as `User[]`
const users = await client('/api/users', { method: 'GET' })

// POST request with typed body and response
const newUser = await client('/api/users', {
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})

// Path parameters are type-checked
const user = await client('/api/users/{id}', {
  method: 'GET',
  path: { id: '1' }
})
```

Nitro types every path parameter as `string`, so `path: { id: 1 }` is a type error even when the underlying value is numeric.

The schemas you hoisted with `$global` are available as named models, which saves you from re-deriving them from response types:

```ts
import type { MyApiModel } from 'apiful/schema'

type User = MyApiModel<'User'>
```

> [!TIP]
> Your editor will provide full IntelliSense support, including autocomplete for paths, methods, and request/response shapes. Nitro's own `/_openapi.json`, `/_scalar`, and `/_swagger` routes are part of the schema too, so they will show up in path autocomplete alongside your API routes.
