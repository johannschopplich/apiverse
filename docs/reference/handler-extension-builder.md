# `HandlerExtensionBuilder`

Extensions that add a callable signature to the client.

> [!IMPORTANT]
> Always use the `satisfies` operator to validate your extension, which preserves the resulting extension type.

## Type Definition

```ts
type Fn<T = any> = (...args: any[]) => T

type HandlerExtension = Fn
type HandlerExtensionBuilder = (client: ApiClient) => HandlerExtension
```

## Example

```ts
import type { HandlerExtensionBuilder } from 'apiful'
import { createClient } from 'apiful'
import { ofetch } from 'ofetch'

const callableExtension = (
  client => ofetch.create(client.defaultOptions)
) satisfies HandlerExtensionBuilder

const client = createClient()
  .with(callableExtension)
```
