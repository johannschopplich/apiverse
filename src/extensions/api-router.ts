import type { FetchOptions, MappedResponseType, ResponseType } from 'ofetch'
import type { ApiClient } from '../client.ts'
import { ofetch } from 'ofetch'
import { joinURL } from 'utilful/path'

const PAYLOAD_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'] as const
const SUPPORTED_METHODS = new Set(['GET', ...PAYLOAD_METHODS])

type ApiMethodHandler<Data = unknown> = <
  T = any,
  R extends ResponseType = 'json',
>(
  data?: Data,
  opts?: Omit<FetchOptions<R>, 'baseURL' | 'method'>,
) => Promise<MappedResponseType<R, T>>

export type ApiRouter = {
  (...args: (string | number)[]): ApiRouter
  [key: string]: ApiRouter
} & {
  get: ApiMethodHandler<FetchOptions['query']>
  post: ApiMethodHandler<FetchOptions['body']>
  put: ApiMethodHandler<FetchOptions['body']>
  delete: ApiMethodHandler<FetchOptions['body']>
  patch: ApiMethodHandler<FetchOptions['body']>
}

export function apiRouterBuilder() {
  return function (client: ApiClient): ApiRouter {
    // Callable internal target required to use `apply` on it.
    const internalTarget = (() => {}) as ApiRouter
    const fetchFn = ofetch.create(client.defaultOptions)

    function p(url: string): ApiRouter {
      return new Proxy(internalTarget, {
        get(_target, key: string) {
          const method = key.toUpperCase()

          if (!SUPPORTED_METHODS.has(method))
            return p(joinURL(url, key))

          const handler: ApiMethodHandler = <
            T = any,
            R extends ResponseType = 'json',
          >(
            data?: any,
            opts: FetchOptions<R> = {},
          ) => {
            if (method === 'GET' && data)
              opts.query = data
            else if (data)
              opts.body = data

            opts.method = method
            return fetchFn<T, R>(url, opts)
          }

          return handler
        },
        apply(_target, _thisArg, args: (string | number)[] = []) {
          return p(joinURL(url, ...args.map(String)))
        },
      })
    }

    return p(client.defaultOptions.baseURL ?? '/')
  }
}
