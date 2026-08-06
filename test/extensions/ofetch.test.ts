import type { Listener } from 'listhen'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../../src/client'
import { afterAll, assertType, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient, ofetchBuilder } from '../../src/index'
import { createListener } from '../utils'

describe('ofetchBuilder', () => {
  it('issues requests through the fetch the client was created with', async () => {
    const fetch = vi.fn().mockResolvedValue({ value: 'foo' })
    const client = createClient({}, { fetch: fetch as unknown as $Fetch })
      .with(ofetchBuilder())

    await expect(client('echo/static/constant', { method: 'POST' })).resolves.toEqual({ value: 'foo' })
    expect(fetch).toHaveBeenCalledWith('echo/static/constant', { method: 'POST' })
  })
})

// The one place the whole stack runs against a real server: ofetch builds the request from
// the client's default options, sends it, and parses what comes back.
describe('ofetchBuilder against a server', () => {
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

  it('returns the parsed body of a GET request', async () => {
    const client = _client.with(ofetchBuilder())
    const response = await client<{ foo: string }>('echo/static/constant')
    expect(response).toEqual({ value: 'foo' })
    assertType<{ foo: string }>(response)
  })

  it('sends the method, body and default headers given as fetch options', async () => {
    const client = _client.with(ofetchBuilder())
    const response = await client('echo/request', {
      method: 'POST',
      body: { foo: 'bar' },
    })
    expect(response.method).toBe('POST')
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.headers).to.include({ 'x-foo': 'bar' })
  })
})
