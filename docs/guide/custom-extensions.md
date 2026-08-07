# Custom Extensions

When none of the [built-in extensions](/extensions/) fits, write your own. An extension builder is a function that takes the [`ApiClient`](/reference/api-client) and returns one of two kinds of extension:

- A [handler extension](#handler-extension) returns a function, which becomes the client's call signature.
- A [methods extension](#methods-extension) returns an object, whose entries become methods on the client.

Both are added with `with`, and the rules for combining them are in [how extensions work](/guide/using-extensions#how-extensions-work).

> [!IMPORTANT]
> Use `satisfies HandlerExtensionBuilder` or `satisfies MethodsExtensionBuilder` rather than annotating the variable with the type directly. `satisfies` checks the shape while preserving the exact return type, which is what lets the next `.with()` in the chain see your methods. Both type the client as a bare `ApiClient` – to reach the extensions added before yours, see [reaching the client](#reaching-the-client).

## Handler Extension

A handler extension returns the function that the client becomes. [ofetch](https://github.com/unjs/ofetch) already has the right shape, which is all the built-in [`ofetchBuilder`](/extensions/ofetch) makes use of:

```ts
import type { HandlerExtensionBuilder } from 'apiful'
import { ofetch } from 'ofetch'

const callableExtension = (
  client => ofetch.create(client.defaultOptions)
) satisfies HandlerExtensionBuilder
```

Add it to a client, and the client is callable:

```ts
import { createClient } from 'apiful'

const client = createClient({ baseURL: 'https://api.example.com' })
  .with(callableExtension)

const response = await client('/users')
```

See [`HandlerExtensionBuilder`](/reference/handler-extension-builder) for the type definition.

## Methods Extension

A methods extension returns an object, and every entry becomes a method on the client. This one logs the client's default options:

```ts
import type { MethodsExtensionBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const extendedClient = client
  .with(logExtension)

extendedClient.logDefaults() // { baseURL: 'https://api.example.com', headers: { Authorization: 'Bearer <your-bearer-token>' } }
```

See [`MethodsExtensionBuilder`](/reference/methods-extension-builder) for the type definition.

## Reaching the Client

`with` hands the builder the client as it stands, carrying every extension added before it. Written inline, the types follow along – this method calls through the [`OpenAPIBuilder`](/extensions/openapi) handler one line above it and is typed from the schema:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const api = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(OpenAPIBuilder<'petStore'>())
  .with(client => ({
    pet: (petId: number) => client('/pet/{petId}', { method: 'GET', path: { petId } }),
  }))

const pet = await api.pet(1)
//    ^? { id?: number, name: string, … }
```

A builder declared on its own has no chain to read from, and both builder types describe their client as a bare `ApiClient`. Annotate the parameter with what the builder actually needs instead, and `with` accepts it wherever the client offers at least that much:

```ts
import type { OpenAPIClient, SchemaPaths } from 'apiful/openapi'

function petMethods(client: OpenAPIClient<SchemaPaths<'petStore'>>) {
  return {
    pet: (petId: number) => client('/pet/{petId}', { method: 'GET', path: { petId } }),
  }
}

const api = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(OpenAPIBuilder<'petStore'>())
  .with(petMethods)
```

The same holds for the other extensions – take an [`ApiRouter`](/extensions/api-router) to reach the router's routes, or an `ApiClient` where `defaultOptions` and `fetch` are all you need. Drop `satisfies` when you do: the parameter is already narrower than the builder type allows, and `with` checks the return value against `ApiExtension` regardless.
