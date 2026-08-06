# `MethodsExtensionBuilder`

Extensions that add additional methods to the client.

> [!IMPORTANT]
> Always use the `satisfies` operator to validate your extension, which preserves the resulting extension type.

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
