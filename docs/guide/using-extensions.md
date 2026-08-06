# Using Extensions

A client on its own holds nothing but default fetch options – calling it throws. Extensions give it behavior, and `with` adds them:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({ baseURL: 'https://api.example.com' })
  .with(ofetchBuilder())
```

If you have not created a client yet, start with [Getting Started](/guide/getting-started).

## How Extensions Work

Every `.with()` call wraps the client in a proxy that routes property access to the extension that provides it, so a chain of extensions stays a single callable client and TypeScript keeps the types of each one.

Extensions come in two kinds:

- A **[handler extension](/guide/custom-extensions#handler-extension)** provides the call signature that makes requests. A client takes one – adding a second replaces the first. The [built-in extensions](/extensions/) are all handler extensions.
- A **[methods extension](/guide/custom-extensions#methods-extension)** adds named methods to the client. Add as many as you like.

Every extension is handed the client, so all of them read the same `defaultOptions`. Where two provide the same name, the later one wins:

```ts
import type { MethodsExtensionBuilder } from 'apiful'
import { createClient } from 'apiful'

const firstExtension = (() => ({
  greet: () => 'Hello from first!',
})) satisfies MethodsExtensionBuilder

const secondExtension = (() => ({
  greet: () => 'Hello from second!',
})) satisfies MethodsExtensionBuilder

const client = createClient({ baseURL: 'https://api.example.com' })
  .with(firstExtension)
  .with(secondExtension)

console.log(client.greet()) // "Hello from second!"
```

The three [built-in extensions](/extensions/) differ only in how you write a request; that page compares the call signatures side by side. To write your own, see [Custom Extensions](/guide/custom-extensions).
