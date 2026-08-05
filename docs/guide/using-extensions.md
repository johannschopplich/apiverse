# Using Extensions

## Prerequisite: Create a Client

Before you can use extensions, you must create a client. Once a client is initialized, you can add extensions to it:

```ts
import { createClient } from 'apiful'

const client = createClient({
  // Defaults to `/` if not set
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
```

> [!IMPORTANT]
> The client by itself can't make requests – you need at least one handler extension to provide the actual HTTP functionality.

> [!TIP]
> Default options are automatically passed to all extensions, ensuring consistent configuration across your entire client.

## How Extensions Work

Every `.with()` call wraps the client in a proxy that routes property access to the extension that provides it, so a chain of extensions stays a single callable client and TypeScript keeps the types of each one.

Extensions come in two kinds: [handler extensions](/guide/custom-extensions#handler-extension) provide the call signature that makes requests, and [methods extensions](/guide/custom-extensions#methods-extension) add methods to the client. Where two extensions provide the same name, the later one wins.

> [!IMPORTANT]
> You can only have one active handler extension (callable extension) per client. If you add multiple handler extensions, the last one will replace the previous ones. Methods extensions, however, can be combined freely.

## Built-in Extensions

APIful includes several pre-built extensions that provide different API interaction patterns. You can add multiple extensions to a client by chaining the `with` method.

Choose the extension that best fits your use case and personal preference:

- **[ofetch](/extensions/ofetch)** - Direct fetch-style requests with `client('/path', options)`
- **[OpenAPI](/extensions/openapi)** - Type-safe requests based on OpenAPI schemas
- **[API Router](/extensions/api-router)** - jQuery/Axios-style chaining with `client.users.get()`

> [!TIP]
> Start with the ofetch extension if you're new to APIful – it provides the most familiar API for developers coming from fetch or Axios.

## Custom Extensions

Need something specific? Follow the [Custom Extensions](/guide/custom-extensions) guide to learn how to create your own extensions that perfectly match your requirements.
