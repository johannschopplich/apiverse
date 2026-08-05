import type { Listener } from 'listhen'
import type { ApiClient } from '../../src/client'
import type { ApiRouter } from '../../src/extensions/api-router'
import { joinURL } from 'utilful/path'
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { apiRouterBuilder, createClient } from '../../src/index'
import { createListener } from '../utils'

describe('apiRouterBuilder adapter', () => {
  let _listener: Listener
  let _client: ApiClient

  beforeAll(async () => {
    _listener = await createListener()
    _client = createClient({
      baseURL: _listener.url,
      headers: {
        'X-Foo': 'bar',
      },
    })
  })

  afterAll(async () => {
    await _listener.close()
  })

  it('handles GET request for static constant endpoint', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.static!.constant!.get<{ value: string }>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it.each([
    ['post', { foo: 'bar' }],
    ['put', { foo: 'bar' }],
    ['patch', { foo: 'bar' }],
    ['delete', undefined],
  ] as const)('routes %s requests to the echo endpoint', async (method, body) => {
    const client = _client.with(apiRouterBuilder())
    const response = body === undefined
      ? await client.echo!.request![method]()
      : await client.echo!.request![method](body)
    expect(response.method).toEqual(method.toUpperCase())
    if (body !== undefined)
      expect(response.body).toEqual(body)
  })

  it('handles GET request with query parameters', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.query!.get({ value: 'bar' })
    expect(response).toEqual({ value: 'bar' })
  })

  it('includes default headers in requests', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post(undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(response.headers).to.include({
      'x-foo': 'bar',
      'content-type': 'application/json',
    })
  })

  it('overrides default headers with request-specific headers', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })
    expect(response.headers).to.include({ 'x-foo': 'baz' })
  })

  it.each([
    // eslint-disable-next-line dot-notation
    ['bracket notation', (c: ApiRouter) => c.echo!.static!['constant']!.get<{ value: string }>()],
    ['function call syntax', (c: ApiRouter) => c.echo!.static!('constant').get<{ value: string }>()],
    ['multiple segments in single call', (c: ApiRouter) => c('echo', 'static', 'constant').get<{ value: string }>()],
  ])('supports %s for path segments', async (_name, call) => {
    const client = _client.with(apiRouterBuilder())
    const response = await call(client)
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('throws error for non-existent endpoints', async () => {
    const client = _client.with(apiRouterBuilder())
    await expect(async () => {
      await client.baz!.get<{ value: string }>()
    }).rejects.toThrow(/404/)
  })

  it('coerces numeric path segments to strings', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client('echo', 'path', 42).post({ foo: 'bar' })
    expect(response.method).toBe('POST')
    expect(response.path).toContain('/echo/path/42')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('omits query string when GET called without data', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.query!.get()
    expect(response).toEqual({})
  })

  it('reports the request URL as its string value', () => {
    const client = _client.with(apiRouterBuilder())
    const route = client.echo!.static!
    expect(String(route)).toBe(joinURL(_listener.url, 'echo/static'))
    expect(`${route}`).toBe(joinURL(_listener.url, 'echo/static'))
  })

  it('leaves an unfinished chain non-thenable', async () => {
    const client = _client.with(apiRouterBuilder())
    const route = client.echo!.static!
    expect((route as unknown as { then?: unknown }).then).toBeUndefined()
    await expect(Promise.resolve(route)).resolves.toBe(route)
  })

  it('treats uppercase method access identically to lowercase', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await (client.echo!.request! as any).POST({ foo: 'bar' })
    expect(response.method).toBe('POST')
    expect(response.body).toEqual({ foo: 'bar' })
  })
})
