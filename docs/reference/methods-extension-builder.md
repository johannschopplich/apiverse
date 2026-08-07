# `MethodsExtensionBuilder`

Extensions that add additional methods to the client.

> [!IMPORTANT]
> Use the `satisfies` operator rather than annotating the variable, which preserves the resulting extension type. It types the client as a bare `ApiClient`, so a builder that needs to reach the extensions before it takes the client as a type parameter instead – see [reaching the client](/guide/custom-extensions#reaching-the-client).

## Type Definition

```ts
type MethodsExtension = Record<string, unknown>
type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension
```

## Example

```ts
import type { MethodsExtensionBuilder } from 'apiful'
import { createClient, ofetchBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const client = createClient()
  .with(ofetchBuilder())
  .with(logExtension)
```
