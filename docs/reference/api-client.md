# `ApiClient`

Instances of `ApiClient` created using the [`createClient`](/reference/create-client) function.

## Type Definition

```ts
type ClientOptions<BaseURL extends string = string> = Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL }

interface ApiClient<BaseURL extends string = string> extends Function {
  _handler?: Fn
  _extensions: Record<PropertyKey, unknown>
  defaultOptions: ClientOptions<BaseURL>
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) => this & Extension
}
```

Calling a client that has no handler extension throws a `TypeError` – add one with [`with`](/guide/using-extensions), such as [`ofetchBuilder()`](/extensions/ofetch).
