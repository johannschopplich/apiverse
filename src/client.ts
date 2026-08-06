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
    return addExtension<BaseURL, Extension>(client, client._extensions, undefined, createExtension(client))
  }

  return client
}

/**
 * Derives a client carrying one more extension. The extension record is copied rather than
 * written to, so the client `with` was called on keeps the extensions it already had.
 */
function addExtension<BaseURL extends string, Extension extends ApiExtension>(
  base: ApiClient<BaseURL>,
  extensions: Record<PropertyKey, unknown>,
  handler: Fn | undefined,
  extension: ApiExtension,
): ApiClient<BaseURL> & Extension {
  const nextExtensions: Record<PropertyKey, unknown> = Object.assign(Object.create(null), extensions)

  if (typeof extension === 'function')
    return createExtendedClient<BaseURL, Extension>(base, nextExtensions, extension)

  for (const key of Object.keys(extension)) {
    nextExtensions[key] = extension[key]
  }

  return createExtendedClient<BaseURL, Extension>(base, nextExtensions, handler)
}

/**
 * Wraps the client `createClient` returned, never another proxy, so a property resolves in
 * one hop however many extensions the client carries.
 */
function createExtendedClient<BaseURL extends string, Extension extends ApiExtension>(
  base: ApiClient<BaseURL>,
  extensions: Record<PropertyKey, unknown>,
  initialHandler: Fn | undefined,
): ApiClient<BaseURL> & Extension {
  let handler = initialHandler
  let client: ApiClient<BaseURL> & Extension

  function withExtension<Next extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Next,
  ) {
    return addExtension<BaseURL, Next>(base, extensions, handler, createExtension(client))
  }

  client = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'with')
        return withExtension

      if (prop === '_extensions')
        return extensions

      if (prop === '_handler')
        return handler

      if (prop in extensions)
        return extensions[prop]

      if (prop in target)
        return Reflect.get(target, prop, receiver)

      // Whatever the base client cannot answer is asked of the handler extension, which may
      // carry properties of its own or, as `apiRouterBuilder` does, answer a name it holds
      // no property for.
      return handler === undefined ? undefined : Reflect.get(handler, prop)
    },
    set(target, prop, value, receiver) {
      if (prop === '_handler') {
        handler = value
        return true
      }

      // A name the base client does not answer to belongs to this client alone, not to the
      // one it was extended from.
      if (prop in extensions || !(prop in target)) {
        extensions[prop] = value
        return true
      }

      return Reflect.set(target, prop, value, receiver)
    },
    apply(target, thisArg, args) {
      if (handler !== undefined)
        return handler(...args)

      return Reflect.apply(target, thisArg, args)
    },
  }) as ApiClient<BaseURL> & Extension

  return client
}
