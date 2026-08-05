import type { FetchOptions } from 'ofetch'

type Fn<T = any> = (...args: any[]) => T

export type HandlerExtension = Fn
export type MethodsExtension = Record<string, unknown>
export type ApiExtension = HandlerExtension | MethodsExtension

export type HandlerExtensionBuilder = (client: ApiClient) => HandlerExtension
export type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension

/** Fetch options where `baseURL` keeps the literal type `createClient` inferred, rather than widening to `string`. */
export type ClientOptions<BaseURL extends string = string> = Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL }

export interface ApiClient<BaseURL extends string = string> extends Function {
  _handler?: Fn
  _extensions: Record<PropertyKey, unknown>
  defaultOptions: ClientOptions<BaseURL>
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) => this & Extension
}

export function createClient<const BaseURL extends string = '/'>(
  defaultOptions: ClientOptions<BaseURL> = {},
): ApiClient<BaseURL> {
  const client = (() => {
    throw new TypeError('This client cannot make requests. Add a handler extension, such as `createClient().with(ofetchBuilder())`.')
  }) as unknown as ApiClient<BaseURL>

  client.defaultOptions = defaultOptions
  client._extensions = Object.create(null)

  client.with = function <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) {
    const extension = createExtension(this)

    if (typeof extension === 'function') {
      this._handler = extension
    }
    else {
      for (const key of Object.keys(extension)) {
        this._extensions[key] = extension[key]
      }
    }

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target._extensions)
          return target._extensions[prop]

        if (prop in target)
          return Reflect.get(target, prop, receiver)

        return Reflect.get(extension, prop, receiver)
      },
      set(target, prop, value, receiver) {
        if (prop in target._extensions) {
          target._extensions[prop] = value
          return true
        }

        if (prop in target)
          return Reflect.set(target, prop, value, receiver)

        return Reflect.set(extension, prop, value, receiver)
      },
      apply(target, thisArg, args) {
        if (target._handler)
          return target._handler(...args)

        return Reflect.apply(target, thisArg, args)
      },
    }) as ApiClient<BaseURL> & Extension
  }

  return client
}
