/* eslint-disable test/prefer-lowercase-title */
import { assertType, beforeAll, describe, expect, it } from 'vitest'
import type { Listener } from 'listhen'
import { OpenAPI, createClient } from '../../src'
import type { ApiClient } from '../../src'
import { createListener } from '../utils'

describe('OpenAPI adapter', () => {
  let listener: Listener
  let client: ApiClient

  beforeAll(async () => {
    listener = await createListener()
    client = createClient({
      baseURL: listener.url,
    })
  })

  it('extends client with "OpenAPI" adapter', async () => {
    const rest = client.with(OpenAPI<'sampleApi'>())
    const response = await rest('/foo')
    expect(response).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `)
    assertType<{ foo?: string }>(response)
  })

  it('supports typed HTTP method and fetch options', async () => {
    const rest = client.with(OpenAPI<'sampleApi'>())
    const response = await rest('/bar', {
      method: 'POST',
      body: {
        foo: 'bar',
      },
    })
    expect(response.body).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `)
  })
})
