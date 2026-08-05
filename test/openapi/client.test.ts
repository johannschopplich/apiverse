import type { components } from 'apiful/schema/petStore'
import { ofetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenAPIClient, resolvePathParams } from '../../src/openapi/client'

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(),
  },
}))

describe('resolvePathParams', () => {
  it.each<{ path: string, params?: Record<string, string>, out?: string }>([
    // Nothing to replace
    { path: '/users', params: undefined },
    { path: '/users/{id}', params: undefined },
    { path: '/users/{id}', params: {} },
    // Replacement
    { path: '/users/{id}', params: { id: '123' }, out: '/users/123' },
    { path: '/users/{userId}/posts/{postId}', params: { userId: '123', postId: '456' }, out: '/users/123/posts/456' },
    { path: '/api/{version}/users/{version}', params: { version: 'v1' }, out: '/api/v1/users/v1' },
    { path: '/users/{id}', params: { id: '123', extra: 'ignored' }, out: '/users/123' },
    { path: '/users/{id}', params: { id: '' }, out: '/users/' },
    // Percent-encoding
    { path: '/users/{id}', params: { id: 'user@example.com' }, out: '/users/user%40example.com' },
    { path: '/search/{query}', params: { query: 'hello world' }, out: '/search/hello%20world' },
    { path: '/files/{path}', params: { path: 'folder/file.txt' }, out: '/files/folder%2Ffile.txt' },
    { path: '/items/{id}', params: { id: '!@#$%^&*()' }, out: '/items/!%40%23%24%25%5E%26*()' },
    // Coercion of a value the OpenAPI types allow but the URL cannot carry
    { path: '/users/{id}', params: { id: 123 as unknown as string }, out: '/users/123' },
    { path: '/items/{active}', params: { active: true as unknown as string }, out: '/items/true' },
    { path: '/data/{value}', params: { value: null as unknown as string }, out: '/data/null' },
  ])('resolves $path with $params', ({ path, params, out = path }) => {
    expect(resolvePathParams(path, params)).toBe(out)
  })
})

describe('createOpenAPIClient', () => {
  const mockFetch = vi.fn()
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.mocked(ofetch.create).mockImplementation(mockCreate)
    mockCreate.mockReturnValue(mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates the ofetch instance with the default options', () => {
    const options = { baseURL: 'https://petstore3.swagger.io/api/v3' }
    createOpenAPIClient<'petStore'>(options)
    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('creates the ofetch instance once, not per request', () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://api.example.com' })

    void client('/store/inventory')
    void client('/store/inventory')

    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('resolves path parameters and forwards options to the underlying fetch', async () => {
    const mockPet: components['schemas']['Pet'] = {
      id: 123,
      name: 'Fluffy',
      status: 'available',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(mockPet)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/pet/{petId}', { path: { petId: 123 }, method: 'GET' })

    expect(mockFetch).toHaveBeenCalledWith('/pet/123', { method: 'GET' })
  })

  it('forwards body and query options unchanged', async () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })

    const newPet = { name: 'Buddy', photoUrls: [] }
    await client('/pet', { method: 'POST', body: newPet })
    expect(mockFetch).toHaveBeenCalledWith('/pet', { method: 'POST', body: newPet })

    await client('/pet/findByStatus', { query: { status: 'available' } })
    expect(mockFetch).toHaveBeenCalledWith('/pet/findByStatus', { query: { status: 'available' } })
  })

  it('invokes fetch without options when the caller provides none', async () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/store/inventory')
    expect(mockFetch).toHaveBeenCalledWith('/store/inventory', {})
  })

  it('returns the fetch result unchanged', async () => {
    const expected: components['schemas']['Pet'] = {
      id: 456,
      name: 'Max',
      status: 'sold',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(expected)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    const result = await client('/pet/{petId}', { path: { petId: 456 } })

    expect(result).toBe(expected)
  })
})
