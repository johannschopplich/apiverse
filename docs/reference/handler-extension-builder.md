# `HandlerExtensionBuilder`

Extensions that add a callable signature to the client.

> [!IMPORTANT]
> Use the `satisfies` operator rather than annotating the variable, which preserves the resulting extension type. It types the client as a bare `ApiClient`, so a builder that needs to reach the extensions before it takes the client as a type parameter instead – see [reaching the client](/guide/custom-extensions#reaching-the-client).

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
