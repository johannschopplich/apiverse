import type { OpenAPISchemaRepository, PetStore, PetStoreApiMethods, PetStoreApiPaths, PetStoreModel, TestEcho } from 'apiful/schema'
import type { components as Components, paths as PetStorePaths } from 'apiful/schema/petStore'
import type { components as TestEchoComponents } from 'apiful/schema/testEcho'
import type { SchemaPaths } from '../../src/openapi/client'
import type { FetchResponseData, FetchResponseError } from '../../src/openapi/types'
import { describe, expectTypeOf, it } from 'vitest'

describe('FetchResponseError', () => {
  it('types the thrown data from the error responses the schema declares', () => {
    expectTypeOf<FetchResponseError<TestEcho<'/echo/request', 'post'>['operation']>['data']>()
      .toEqualTypeOf<TestEchoComponents['schemas']['Error'] | undefined>()
  })

  it('types the thrown data as undefined for error responses that carry no content', () => {
    expectTypeOf<FetchResponseError<PetStore<'/pet/{petId}', 'get'>['operation']>['data']>()
      .toEqualTypeOf<undefined>()
  })
})

describe('SchemaPaths', () => {
  it('resolves existing schema keys to their types', () => {
    expectTypeOf<SchemaPaths<'petStore'>>().toEqualTypeOf<OpenAPISchemaRepository['petStore']>()
    expectTypeOf<SchemaPaths<'testEcho'>>().toEqualTypeOf<OpenAPISchemaRepository['testEcho']>()
  })

  it('resolves an unknown schema key to Record<string, never>', () => {
    expectTypeOf<SchemaPaths<'nonExistent'>>().toEqualTypeOf<Record<string, never>>()
  })
})

describe('PetStore', () => {
  it('extracts the path parameter types of a templated path', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['path']>().toEqualTypeOf<{ username: string }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['path']>().toEqualTypeOf<{ orderId: number }>()
  })

  it('extracts the query parameter types', () => {
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['query']>().toEqualTypeOf<{ status?: 'available' | 'pending' | 'sold' }>()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['query']>().toEqualTypeOf<{ tags?: string[] }>()
    expectTypeOf<PetStore<'/user/login', 'get'>['query']>().toEqualTypeOf<{ username?: string, password?: string }>()
  })

  it('types the parameters as never for an operation that declares none', () => {
    expectTypeOf<PetStore<'/pet', 'post'>['path']>().toBeNever()
    expectTypeOf<PetStore<'/pet', 'post'>['query']>().toBeNever()
  })

  it('extracts the request body types from the generated components', () => {
    expectTypeOf<PetStore<'/pet', 'put'>['request']>().toEqualTypeOf<Components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/pet', 'post'>['request']>().toEqualTypeOf<Components['schemas']['Pet']>()
  })

  it('widens an optional request body with undefined', () => {
    expectTypeOf<PetStore<'/store/order', 'post'>['request']>().toEqualTypeOf<Components['schemas']['Order'] | undefined>()
    expectTypeOf<PetStore<'/user', 'post'>['request']>().toEqualTypeOf<Components['schemas']['User'] | undefined>()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['request']>().toEqualTypeOf<Components['schemas']['User'][] | undefined>()
  })

  it('extracts a request body sent as a media type other than JSON', () => {
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['request']>().toEqualTypeOf<string | undefined>()
  })

  it('types the request body as undefined for an operation that declares none', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['request']>().toEqualTypeOf<undefined>()
  })

  it('extracts the 200 response types from the generated components', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Pet'][]>()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['response']>().toEqualTypeOf<{ [key: string]: number }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Order']>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['User']>()
  })

  it('extracts a success response returned as a media type other than JSON', () => {
    expectTypeOf<PetStore<'/user/login', 'get'>['response']>().toEqualTypeOf<string>()
  })

  it('types the success response as never for an operation that declares no 2xx body', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['response']>().toBeNever()
  })

  it('resolves the response the same way a request through the client does', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>()
      .toEqualTypeOf<FetchResponseData<PetStore<'/pet/{petId}', 'get'>['operation']>>()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['response']>()
      .toEqualTypeOf<FetchResponseData<PetStore<'/pet/{petId}', 'delete'>['operation']>>()
  })

  it('keys the responses by status code', () => {
    expectTypeOf<TestEcho<'/echo/request', 'post'>['responses']>().toEqualTypeOf<{
      200: TestEchoComponents['schemas']['EchoResponse']
      400: TestEchoComponents['schemas']['Error']
    }>()
  })

  it('types a status that carries no content as undefined', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['responses'][404]>().toEqualTypeOf<undefined>()
  })

  it('preserves the path and the method as literals', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['method']>().toEqualTypeOf<'get'>()
  })

  it('exposes the raw operation object', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('responses')
  })
})

describe('PetStoreApiPaths', () => {
  it('lists the paths the schema declares', () => {
    expectTypeOf<PetStoreApiPaths>().toEqualTypeOf<keyof PetStorePaths>()
    expectTypeOf<'/pet/{petId}'>().toExtend<PetStoreApiPaths>()
  })
})

describe('PetStoreApiMethods', () => {
  it('lists only the methods a path declares', () => {
    expectTypeOf<PetStoreApiMethods<'/pet'>>().toEqualTypeOf<'post' | 'put'>()
    expectTypeOf<PetStoreApiMethods<'/pet/{petId}'>>().toEqualTypeOf<'get' | 'post' | 'delete'>()
    expectTypeOf<PetStoreApiMethods<'/pet/findByStatus'>>().toEqualTypeOf<'get'>()
  })

  it('rejects a method the path leaves undeclared', () => {
    // @ts-expect-error: `/pet` declares `post` and `put`, and no `get`.
    expectTypeOf<PetStore<'/pet', 'get'>>().not.toBeNever()
  })
})

describe('PetStoreModel', () => {
  it('extracts a schema model by name', () => {
    expectTypeOf<PetStoreModel<'Pet'>>().toEqualTypeOf<Components['schemas']['Pet']>()
    expectTypeOf<PetStoreModel<'Tag'>>().toEqualTypeOf<Components['schemas']['Tag']>()
    expectTypeOf<PetStoreModel<'Order'>>().toEqualTypeOf<Components['schemas']['Order']>()
    expectTypeOf<PetStoreModel<'User'>>().toEqualTypeOf<Components['schemas']['User']>()
  })
})
