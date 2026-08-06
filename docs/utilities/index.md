# Utilities

APIful not only allows you to build powerful clients, it also provides a set of utilities that you can use in your server-side code. Use them in the web framework of your choice, such as [Hono](https://hono.dev), [Elysia](https://elysiajs.com), or [Nitro](https://nitro.unjs.io), to make your life easier.

## HTTP Status Codes

List of all [common HTTP status codes](/utilities/http-status-codes) as individually exported constants.

## HTTP Status Reason Phrases

List of all [common HTTP status reason phrases](/utilities/http-status-phrases) as individually exported constants.

## JSON to Type Definition

Create TypeScript interfaces from JSON data using the [`jsonToTypeDefinition`](/utilities/json-to-type-definition) function. Useful for defining API response types or working with dynamic JSON structures.

## Generic Schema & Validation

Create and validate JSON schemas using the [`jsonSchema`](/utilities/schema) and [`validateTypes`](/utilities/schema) functions. They stand on their own – the API client never validates a response against a schema for you.

## Examples

### Nitro

For the [Nitro](https://nitro.unjs.io) server toolkit, use HTTP status codes and phrases in your event handlers like this:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'
import * as HttpStatusPhrases from 'apiful/http-status-phrases'

export default defineEventHandler(async (event) => {
  throw createError({
    statusCode: HttpStatusCodes.NOT_FOUND,
    statusMessage: HttpStatusPhrases.NOT_FOUND,
  })
})
```

### Hono

For web frameworks like [Hono](https://hono.dev), use the status codes and phrases in your route handlers like this:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'
import * as HttpStatusPhrases from 'apiful/http-status-phrases'

app.get('/not-found', (c) => {
  c.status(HttpStatusCodes.NOT_FOUND)
  c.json({ message: HttpStatusPhrases.NOT_FOUND })
})
```
