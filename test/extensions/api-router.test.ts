import type { ApiRouter } from '../../src/extensions/api-router'
import type { RecordedRequest } from '../utils'
import { assertType, describe, expect, it } from 'vitest'
import { apiRouterBuilder, createClient } from '../../src/index'
import { createRecordingFetch } from '../utils'

const BASE_URL = 'https://api.test'

function createRouter(respond?: (request: RecordedRequest) => Response) {
  const defaultOptions = { baseURL: BASE_URL, headers: { 'X-Foo': 'bar' } }
  const { fetch, requests } = createRecordingFetch(defaultOptions, respond)
  const client = createClient(defaultOptions, { fetch }).with(apiRouterBuilder())

  return { client, requests }
}

describe('apiRouterBuilder', () => {
  it('sends a GET request to the path built by dot notation', async () => {
    const { client, requests } = createRouter(() => Response.json({ value: 'foo' }))
    const response = await client.echo!.static!.constant!.get<{ value: string }>()

    expect(requests[0]!.method).toBe('GET')
    expect(requests[0]!.path).toBe('/echo/static/constant')
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it.each([
    ['POST', { foo: 'bar' }],
    ['PUT', { foo: 'bar' }],
    ['PATCH', { foo: 'bar' }],
    ['DELETE', undefined],
  ] as const)('sends %s with the payload as the request body', async (method, body) => {
    const { client, requests } = createRouter()
    const route = client.echo!.request![method.toLowerCase() as Lowercase<typeof method>]!
    body === undefined ? await route() : await route(body)

    expect(requests[0]!.method).toBe(method)
    expect(requests[0]!.body).toEqual(body)
  })

  it('sends the first GET argument as the query string', async () => {
    const { client, requests } = createRouter()
    await client.echo!.query!.get({ value: 'bar' })

    expect(requests[0]!.query).toEqual({ value: 'bar' })
  })

  it('includes default headers in requests', async () => {
    const { client, requests } = createRouter()
    await client.echo!.request!.post(undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(requests[0]!.headers).to.include({
      'x-foo': 'bar',
      'content-type': 'application/json',
    })
  })

  it('overrides default headers with request-specific headers', async () => {
    const { client, requests } = createRouter()
    await client.echo!.request!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })

    expect(requests[0]!.headers).to.include({ 'x-foo': 'baz' })
  })

  it.each([
    // eslint-disable-next-line dot-notation
    ['bracket notation', (c: ApiRouter) => c.echo!.static!['constant']!.get<{ value: string }>()],
    ['function call syntax', (c: ApiRouter) => c.echo!.static!('constant').get<{ value: string }>()],
    ['multiple segments in single call', (c: ApiRouter) => c('echo', 'static', 'constant').get<{ value: string }>()],
  ])('builds the same path from %s', async (_name, call) => {
    const { client, requests } = createRouter(() => Response.json({ value: 'foo' }))
    const response = await call(client)

    expect(requests[0]!.path).toBe('/echo/static/constant')
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('rejects with the server error for an unknown endpoint', async () => {
    const { client } = createRouter(() => new Response('Not Found', { status: 404 }))

    await expect(async () => {
      await client.baz!.get<{ value: string }>()
    }).rejects.toThrow(/404/)
  })

  it('coerces numeric path segments to strings', async () => {
    const { client, requests } = createRouter()
    await client('echo', 'path', 42).post({ foo: 'bar' })

    expect(requests[0]!.method).toBe('POST')
    expect(requests[0]!.path).toBe('/echo/path/42')
    expect(requests[0]!.body).toEqual({ foo: 'bar' })
  })

  it('omits the query string for a GET without data', async () => {
    const { client, requests } = createRouter()
    await client.echo!.query!.get()

    expect(requests[0]!.path).toBe('/echo/query')
    expect(requests[0]!.query).toEqual({})
  })

  it('reports the request URL as its string value', () => {
    const { client } = createRouter()
    const route = client.echo!.static!

    expect(String(route)).toBe(`${BASE_URL}/echo/static`)
    expect(`${route}`).toBe(`${BASE_URL}/echo/static`)
  })

  it('leaves an unfinished chain non-thenable', async () => {
    const { client } = createRouter()
    const route = client.echo!.static!

    expect((route as unknown as { then?: unknown }).then).toBeUndefined()
    await expect(Promise.resolve(route)).resolves.toBe(route)
  })

  it('treats uppercase method access identically to lowercase', async () => {
    const { client, requests } = createRouter()
    await (client.echo!.request! as any).POST({ foo: 'bar' })

    expect(requests[0]!.method).toBe('POST')
    expect(requests[0]!.body).toEqual({ foo: 'bar' })
  })
})
