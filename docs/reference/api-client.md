# `ApiClient`

The client returned by [`createClient`](/reference/create-client): a callable object that carries the default fetch options and the extensions added to it.

## Type Definition

```ts
type Fn<T = any> = (...args: any[]) => T

type ClientOptions<BaseURL extends string = string> = Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL }

interface ApiClient<BaseURL extends string = string> extends Function {
  _handler?: Fn
  _extensions: Record<PropertyKey, unknown>
  defaultOptions: ClientOptions<BaseURL>
  fetch: $Fetch
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) => this & Extension
}
```

`ApiExtension` is either a [`HandlerExtension`](/reference/handler-extension-builder), which becomes the client's call signature, or a [`MethodsExtension`](/reference/methods-extension-builder), whose entries become methods on the client. `FetchOptions` and `$Fetch` come from [ofetch](https://github.com/unjs/ofetch).

`fetch` is what every extension makes its requests through. It defaults to an ofetch instance built from `defaultOptions`, and [`createClient`](/reference/create-client#supplying-your-own-fetch) takes one of your own.

Calling a client that has no handler extension throws a `TypeError` – add one with `with`, such as [`ofetchBuilder()`](/extensions/ofetch).

`_handler` and `_extensions` are the bookkeeping behind [`with`](/guide/using-extensions#how-extensions-work): the current call signature and the properties resolved through the proxy. They are visible on the type, but reading or assigning them is not part of the API.
