# Custom Extensions

When none of the [built-in extensions](/extensions/) fits, write your own. An extension builder is a function that takes the [`ApiClient`](/reference/api-client) and returns one of two kinds of extension:

- A [handler extension](#handler-extension) returns a function, which becomes the client's call signature.
- A [methods extension](#methods-extension) returns an object, whose entries become methods on the client.

Both are added with `with`, and the rules for combining them are in [how extensions work](/guide/using-extensions#how-extensions-work).

> [!IMPORTANT]
> Use `satisfies HandlerExtensionBuilder` or `satisfies MethodsExtensionBuilder` rather than annotating the variable with the type directly. `satisfies` checks the shape while preserving the exact return type, which is what lets the next `.with()` in the chain see your methods.

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

The builder receives the client, so a method can reach its default options and any extension added before it. That is how you layer behavior on top of a handler extension.

See [`MethodsExtensionBuilder`](/reference/methods-extension-builder) for the type definition.
