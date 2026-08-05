import type { OpenAPISchemaRepository, PetStore } from 'apiful/schema'
import type { components } from 'apiful/schema/petStore'
import type { ApiClient } from '../../src/client'
import type { OpenAPIClient } from '../../src/extensions/openapi'
import type { SchemaPaths } from '../../src/openapi/client'
import { ofetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient, OpenAPIBuilder } from '../../src/index'

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(),
  },
}))

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPIBuilder adapter', () => {
  const mockFetch = vi.fn()
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.mocked(ofetch.create).mockImplementation(mockCreate)
    mockCreate.mockReturnValue(mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns function that extends ApiClient with OpenAPI types', () => {
    const builder = OpenAPIBuilder<'petStore'>()
    expectTypeOf(builder).toBeFunction()
    expectTypeOf(builder).parameter(0).toEqualTypeOf<ApiClient>()

    const client = {} as ApiClient
    const openApiClient = builder(client)
    expectTypeOf(openApiClient).toEqualTypeOf<OpenAPIClient<SchemaPaths<'petStore'>>>()
  })

  it('creates typed client for existing schemas', () => {
    const petStoreBuilder = OpenAPIBuilder<'petStore'>()
    const client = {} as ApiClient
    const petStoreClient = petStoreBuilder(client)

    expectTypeOf(petStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()

    const secondPetStoreBuilder = OpenAPIBuilder<'petStore'>()
    const secondPetStoreClient = secondPetStoreBuilder(client)

    expectTypeOf(secondPetStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()
  })

  it('handles non-existing schema with empty type', () => {
    const nonExistentBuilder = OpenAPIBuilder<'nonExistent'>()
    const client = {} as ApiClient
    const nonExistentClient = nonExistentBuilder(client)

    expectTypeOf(nonExistentClient).toEqualTypeOf<OpenAPIClient<Record<string, never>>>()
  })

  it('provides typed methods for API operations', () => {
    const client = {} as ApiClient
    const petStoreClient = OpenAPIBuilder<'petStore'>()(client)

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

  const samplePet: components['schemas']['Pet'] = {
    id: 1,
    name: 'Fluffy',
    status: 'available',
    photoUrls: [],
  }

  it.each([
    {
      name: 'no options (inventory)',
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
      name: 'path parameters (resolves template)',
      path: '/pet/{petId}',
      options: { path: { petId: 123 } },
      expectedUrl: '/pet/123',
      expectedOptions: {},
      mockResponse: { ...samplePet, id: 123 },
    },
    {
      name: 'method and body',
      path: '/pet',
      options: { method: 'POST' as const, body: samplePet },
      expectedUrl: '/pet',
      expectedOptions: { method: 'POST', body: samplePet },
      mockResponse: { ...samplePet, id: 456 },
    },
  ])('forwards $name to the underlying fetch and returns the response', async ({ path, options, expectedUrl, expectedOptions, mockResponse }) => {
    mockFetch.mockResolvedValue(mockResponse)
    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    const call = client as unknown as (path: string, options?: Record<string, unknown>) => Promise<unknown>
    const response = await call(path, options)

    expect(response).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions)
  })

  it('handles error responses', async () => {
    mockFetch.mockRejectedValue(new Error('404 Not Found'))

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    await expect(() => {
      return client(
        // @ts-expect-error: Path not defined in the OpenAPI schema.
        '/invalid/endpoint',
      )
    }).rejects.toThrow()
  })
})
