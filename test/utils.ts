import type { Listener } from 'listhen'
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

export const currentDir: string = fileURLToPath(new URL('.', import.meta.url))

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
