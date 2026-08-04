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
    // Static constant endpoint - GET only.
    .use(
      '/echo/static/constant',
      defineHandler((event) => {
        if (event.req.method !== 'GET') {
          throw new HTTPError({ statusCode: 405 })
        }

        return { value: 'foo' }
      }),
    )
    // Request echo endpoints - specific HTTP methods.
    .use(
      '/echo/request',
      defineHandler(async (event) => {
        const allowedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

        if (!allowedMethods.includes(event.req.method)) {
          throw new HTTPError({ statusCode: 405 })
        }

        // Handle request body based on method.
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
    // Query parameters endpoint - GET only.
    .use(
      '/echo/query',
      defineHandler((event) => {
        if (event.req.method !== 'GET') {
          throw new HTTPError({ statusCode: 405 })
        }

        return getQuery(event)
      }),
    )
    // Catch-all path echo endpoint - returns full request info for any method on /echo/path/**.
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
    // 404 handler for non-existent routes.
    .use(
      defineHandler(() => {
        throw new HTTPError({ statusCode: 404 })
      }),
    )

  return await listen(toNodeHandler(app), {
    port: await getRandomPort(),
  })
}
