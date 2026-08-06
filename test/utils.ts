import type { Listener } from 'listhen'
import type { $Fetch, FetchOptions } from 'ofetch'
import { fileURLToPath } from 'node:url'
import { getRandomPort } from 'get-port-please'
import {
  defineHandler,
  getQuery,
  H3,
  HTTPError,
  readBody,
  toNodeHandler,
} from 'h3'
import { listen } from 'listhen'
import { ofetch } from 'ofetch'

export const currentDir: string = fileURLToPath(new URL('.', import.meta.url))

export interface RecordedRequest {
  /** Path and query of the request URL, without the origin the `baseURL` contributed. */
  path: string
  query: Record<string, string>
  method: string
  headers: Record<string, string>
  /** Parsed JSON body, or `undefined` where the request carried none. */
  body: unknown
}

export interface RecordingFetch {
  fetch: $Fetch
  requests: RecordedRequest[]
}

/**
 * Creates an `ofetch` instance that records the request instead of sending it. The instance
 * is a real one, so the default options reach the request the way they do in production,
 * and `respond` decides what comes back.
 */
export function createRecordingFetch(
  defaultOptions: FetchOptions = {},
  respond: (request: RecordedRequest) => Response = request => Response.json(request),
): RecordingFetch {
  const requests: RecordedRequest[] = []

  const fetch = ofetch.create(defaultOptions, {
    async fetch(input, init) {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const text = await request.text()

      const recorded: RecordedRequest = {
        path: `${url.pathname}${url.search}`,
        query: Object.fromEntries(url.searchParams.entries()),
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: text ? JSON.parse(text) : undefined,
      }

      requests.push(recorded)
      return respond(recorded)
    },
  })

  return { fetch, requests }
}

export async function createListener(): Promise<Listener> {
  const app = new H3()
    .use(
      '/echo/static/constant',
      defineHandler((event) => {
        if (event.req.method !== 'GET') {
          throw new HTTPError({ statusCode: 405 })
        }

        return { value: 'foo' }
      }),
    )
    .use(
      '/echo/request',
      defineHandler(async (event) => {
        const allowedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

        if (!allowedMethods.includes(event.req.method)) {
          throw new HTTPError({ statusCode: 405 })
        }

        let body: unknown
        try {
          if (event.req.method !== 'DELETE') {
            body = await readBody(event).catch(() => ({}))
          }
        }
        catch {
          throw new HTTPError({ statusCode: 400 })
        }

        return {
          path: event.url,
          body,
          headers: Object.fromEntries(event.req.headers.entries()),
          method: event.req.method,
        }
      }),
    )
    .use(
      '/echo/query',
      defineHandler((event) => {
        if (event.req.method !== 'GET') {
          throw new HTTPError({ statusCode: 405 })
        }

        return getQuery(event)
      }),
    )
    .use(
      '/echo/path/**',
      defineHandler(async (event) => {
        let body: unknown
        if (event.req.method !== 'GET' && event.req.method !== 'DELETE') {
          body = await readBody(event).catch(() => ({}))
        }

        return {
          path: event.url,
          body,
          method: event.req.method,
        }
      }),
    )
    .use(
      defineHandler(() => {
        throw new HTTPError({ statusCode: 404 })
      }),
    )

  return await listen(toNodeHandler(app), {
    port: await getRandomPort(),
  })
}
