import type { OpenAPISchemaRepository, PetStore } from 'apiful/schema'
import type { components } from 'apiful/schema/petStore'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../../src/client'
import type { OpenAPIClient } from '../../src/extensions/openapi'
import type { SchemaPaths } from '../../src/openapi/client'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient, OpenAPIBuilder } from '../../src/index'

function createRecordedClient() {
  const fetch = vi.fn()
  const client = createClient(
    { baseURL: 'https://petstore3.swagger.io/api/v3' },
    { fetch: fetch as unknown as $Fetch },
  )

  return { client, fetch }
}

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPIBuilder', () => {
  it('takes an ApiClient and returns an OpenAPIClient', () => {
    const builder = OpenAPIBuilder<'petStore'>()
    expectTypeOf(builder).toBeFunction()
    expectTypeOf(builder).parameter(0).toEqualTypeOf<ApiClient>()

    const client = {} as ApiClient
    const openApiClient = builder(client)
    expectTypeOf(openApiClient).toEqualTypeOf<OpenAPIClient<SchemaPaths<'petStore'>>>()
  })

  it('types the client from the schema name it was given', () => {
    const petStoreBuilder = OpenAPIBuilder<'petStore'>()
    const client = {} as ApiClient
    const petStoreClient = petStoreBuilder(client)

    expectTypeOf(petStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()

    const secondPetStoreBuilder = OpenAPIBuilder<'petStore'>()
    const secondPetStoreClient = secondPetStoreBuilder(client)

    expectTypeOf(secondPetStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()
  })

  it('types an unknown schema name as an empty paths record', () => {
    const nonExistentBuilder = OpenAPIBuilder<'nonExistent'>()
    const client = {} as ApiClient
    const nonExistentClient = nonExistentBuilder(client)

    expectTypeOf(nonExistentClient).toEqualTypeOf<OpenAPIClient<Record<string, never>>>()
  })

  it('types the response by path and method', () => {
    const petStoreClient = OpenAPIBuilder<'petStore'>()(createRecordedClient().client)

    const getResponse = petStoreClient('/pet/{petId}', {
      method: 'GET',
      path: { petId: 1 },
    })

    expectTypeOf(getResponse).toEqualTypeOf<Promise<PetStore<'/pet/{petId}', 'get'>['response']>>()

    const deleteResponse = petStoreClient('/pet/{petId}', {
      method: 'DELETE',
      path: { petId: 1 },
      headers: {
        api_key: 'test',
      },
    })

    expectTypeOf(deleteResponse).toEqualTypeOf<Promise<never>>()
  })

  it('passes the typed call signature to the next extension builder', () => {
    const client = createRecordedClient().client.with(OpenAPIBuilder<'petStore'>()).with(openAPIClient => ({
      pet: (petId: number) => openAPIClient('/pet/{petId}', { method: 'GET', path: { petId } }),
    }))

    expectTypeOf(client.pet).toEqualTypeOf<(petId: number) => Promise<PetStore<'/pet/{petId}', 'get'>['response']>>()
  })

  const samplePet: components['schemas']['Pet'] = {
    id: 1,
    name: 'Fluffy',
    status: 'available',
    photoUrls: [],
  }

  it.each([
    {
      name: 'a request without options',
      path: '/store/inventory',
      options: undefined,
      expectedUrl: '/store/inventory',
      expectedOptions: {},
      mockResponse: { available: 5, pending: 2, sold: 10 },
    },
    {
      name: 'query parameters',
      path: '/pet/findByStatus',
      options: { query: { status: 'available' } },
      expectedUrl: '/pet/findByStatus',
      expectedOptions: { query: { status: 'available' } },
      mockResponse: [samplePet],
    },
    {
      name: 'path parameters as a resolved template',
      path: '/pet/{petId}',
      options: { path: { petId: 123 } },
      expectedUrl: '/pet/123',
      expectedOptions: {},
      mockResponse: { ...samplePet, id: 123 },
    },
    {
      name: 'a method and body',
      path: '/pet',
      options: { method: 'POST' as const, body: samplePet },
      expectedUrl: '/pet',
      expectedOptions: { method: 'POST', body: samplePet },
      mockResponse: { ...samplePet, id: 456 },
    },
  ])('forwards $name to the underlying fetch and returns the response', async ({ path, options, expectedUrl, expectedOptions, mockResponse }) => {
    const { client: baseClient, fetch } = createRecordedClient()
    fetch.mockResolvedValue(mockResponse)
    const client = baseClient.with(OpenAPIBuilder<'petStore'>())

    const call = client as unknown as (path: string, options?: Record<string, unknown>) => Promise<unknown>
    const response = await call(path, options)

    expect(response).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedOptions)
  })

  it('rejects when the underlying fetch rejects', async () => {
    const { client: baseClient, fetch } = createRecordedClient()
    fetch.mockRejectedValue(new Error('404 Not Found'))
    const client = baseClient.with(OpenAPIBuilder<'petStore'>())

    await expect(() => {
      return client(
        // @ts-expect-error: Path not defined in the OpenAPI schema.
        '/invalid/endpoint',
      )
    }).rejects.toThrow()
  })
})
