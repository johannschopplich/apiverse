import type { FetchError, FetchOptions } from 'ofetch'
import type {
  ErrorResponse,
  IsOperationRequestBodyOptional,
  MediaType,
  OperationRequestBodyContent,
  ResponseObjectMap,
  SuccessResponse,
} from 'openapi-typescript-helpers'

export type FetchResponseData<T extends Record<PropertyKey, any>> = SuccessResponse<ResponseObjectMap<T>, MediaType>
export type FetchResponseError<T extends Record<PropertyKey, any>> = FetchError<ErrorResponse<ResponseObjectMap<T>, MediaType>>

export type MethodOption<M, P> = 'get' extends keyof P ? { method?: M } : { method: M }

export type ParamsOption<T> = T extends { parameters?: any, query?: any }
  ? Omit<T['parameters'], 'cookie' | 'header'> & {
    headers?: T['parameters']['header'] | HeadersInit
  }
  : Record<string, unknown>

export type RequestBodyOption<T> = OperationRequestBodyContent<T> extends never
  ? { body?: never }
  : IsOperationRequestBodyOptional<T> extends true
    ? { body?: OperationRequestBodyContent<T> }
    : { body: OperationRequestBodyContent<T> }

export type FilterMethods<T> = {
  [K in keyof Omit<T, 'parameters'> as T[K] extends never | undefined ? never : K]: T[K];
}

export type OpenAPIFetchOptions<
  Method,
  LowercasedMethod,
  Params,
  Operation = 'get' extends LowercasedMethod ? ('get' extends keyof Params ? Params['get'] : never) : LowercasedMethod extends keyof Params ? Params[LowercasedMethod] : never,
> = MethodOption<Method, Params>
  & ParamsOption<Operation>
  & RequestBodyOption<Operation>
  & Omit<FetchOptions, 'query' | 'body' | 'method'>

/**
 * Methods the path declares. `openapi-typescript` gives a path item a key for all
 * eight verbs and sets the ones the schema leaves out to an optional `never`, so
 * `keyof` alone would answer with every verb there is.
 */
export type OpenAPIPathMethods<Paths, Path extends keyof Paths> = Exclude<
  {
    [Method in keyof Paths[Path]]-?: [Paths[Path][Method]] extends [never] | [undefined] ? never : Method
  }[keyof Paths[Path]],
  'parameters'
> & keyof Paths[Path]

export type OpenAPIClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  Methods extends FilterMethods<Paths[ReqT]>,
  Method extends Extract<keyof Methods, string> | Uppercase<Extract<keyof Methods, string>>,
  LowercasedMethod extends Lowercase<Method> extends keyof Methods ? Lowercase<Method> : never,
  DefaultMethod extends 'get' extends LowercasedMethod ? 'get' : LowercasedMethod,
  ResT = Methods[DefaultMethod] extends Record<PropertyKey, any> ? FetchResponseData<Methods[DefaultMethod]> : never,
>(
  url: ReqT,
  options?: OpenAPIFetchOptions<Method, LowercasedMethod, Methods>,
) => Promise<ResT>
