# Custom Extensions

APIful's true power lies in its extensibility. You can chain multiple extensions using the `with` method to build exactly the API client you need.

## Extension Types

An extension builder is a function that takes the [`ApiClient`](/reference/api-client) and returns one of two kinds of extension:

- A [handler extension](#handler-extension) returns a function, which becomes the client's call signature. One per client – see [how extensions work](/guide/using-extensions#how-extensions-work).
- A [methods extension](#methods-extension) returns an object, whose entries become methods on the client. As many as you like.

> [!IMPORTANT]
> Use `satisfies HandlerExtensionBuilder` or `satisfies MethodsExtensionBuilder` instead of declaring extension variables directly with these types. The `satisfies` operator is crucial here – it validates that your extension conforms to the expected interface while preserving the exact return type for downstream type inference, ensuring seamless integration with other extensions.

> [!WARNING]
> Only use one handler extension per client. Multiple handler extensions will override each other, with the last one taking precedence.

## Handler Extension

Handler extensions form the foundation of any [`ApiClient`](/reference/api-client) by providing the callable interface. While you can technically add multiple handler extensions, you should use only one per client.

[ofetch](https://github.com/unjs/ofetch) works perfectly as a handler extension. The built-in [`ofetchBuilder`](/extensions/ofetch) is essentially just an ofetch instance configured with your client's default options:

```ts
import type { HandlerExtensionBuilder } from 'apiful'
import { ofetch } from 'ofetch'

const callableExtension = (
  client => ofetch.create(client.defaultOptions)
) satisfies HandlerExtensionBuilder
```

Use your custom handler extension by adding it to a client:

```ts
import { createClient } from 'apiful'

const client = createClient({ baseURL: 'https://api.example.com' })
  .with(callableExtension)

// Now you can make requests
const response = await client('/users')
```

> [!TIP]
> Use the [`HandlerExtensionBuilder`](/reference/handler-extension-builder) type for better type checking and IntelliSense support.

## Methods Extension

While handler extensions are recommended to be used only once, you can add as many method extensions as you need. They allow you to add your own methods to the client and provide full type safety.

For example, let's add a `logDefaults` function to the client that logs the default fetch options:

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

> [!TIP]
> Use the [`MethodsExtensionBuilder`](/reference/methods-extension-builder) type for better type checking and IntelliSense support.

> [!NOTE]
> Method extensions can access the client's `defaultOptions`, `_handler`, and any previously added extensions, making them powerful for building layered functionality.

## Extension Priority and Resolution

When you chain multiple extensions, later extensions override earlier ones. This allows you to compose functionality in a predictable way:

```ts
import type { MethodsExtensionBuilder } from 'apiful'
import { createClient } from 'apiful'

const firstExtension = (client => ({
  greet: () => 'Hello from first!'
})) satisfies MethodsExtensionBuilder

const secondExtension = (client => ({
  greet: () => 'Hello from second!'
})) satisfies MethodsExtensionBuilder

const api = createClient({ baseURL: 'https://api.example.com' })
  .with(firstExtension)
  .with(secondExtension)

console.log(api.greet()) // "Hello from second!"
```

## Best Practices

1. **Keep it Simple**: Start with basic extensions and add complexity only when needed
2. **Use TypeScript**: Always use `satisfies` to ensure type safety
3. **Single Purpose**: Each extension should have one clear responsibility

These patterns help you build maintainable API clients that grow with your needs while keeping the code clean and understandable.
