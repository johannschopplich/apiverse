# `OpenAPIBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) that wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This extension types your requests from an OpenAPI schema: the paths your API declares, the methods each one allows, request bodies, query parameters, headers, and the response you get back. The checking is entirely compile time – the generated types add nothing to your bundle, and nothing validates a request once it leaves your code.

To use this extension, APIful must first generate TypeScript definitions from your OpenAPI schema files.

> [!TIP]
> Reach for this extension when the client also carries other extensions. For a client that only talks to one OpenAPI service, [`createOpenAPIClient`](/reference/create-openapi-client) is the shorter road to the same types.

## Prerequisites

To keep the package size small, APIful doesn't include `openapi-typescript` as a dependency. Install the package using your preferred package manager:

::: code-group
  ```bash [pnpm]
  pnpm add -D openapi-typescript
  ```
  ```bash [yarn]
  yarn add -D openapi-typescript
  ```
  ```bash [npm]
  npm install -D openapi-typescript
  ```
:::

> [!NOTE]
> `openapi-typescript` is only needed during development for type generation. It won't be included in your production bundle.

## TypeScript Definitions Generation

Before creating your type-safe API client, generate TypeScript definitions from your OpenAPI schema files. This involves creating an `apiful.config.ts` file with your API services and running the APIful CLI.

Create an `apiful.config.ts` file and define your API services. Here is an example using the [Swagger Petstore](https://petstore3.swagger.io) API:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    petStore: {
      schema: 'https://petstore3.swagger.io/api/v3/openapi.json',
    },
  },
})
```

Then, run the [`generate`](/guide/cli) command in your terminal to generate the TypeScript definitions, saved as `apiful.d.ts`.

```sh
npx apiful generate
```

`openapi-typescript` parses the schema, and APIful declares the result as a module that merges into `apiful/schema`. The output is a declaration file, so nothing of it reaches your bundle.

You can now create a type-safe client with the `OpenAPIBuilder` extension, passing the **service name** as a generic parameter – `OpenAPIBuilder<'petStore'>()`. The [next section](#using-the-openapibuilder-extension) shows it in full.

> [!IMPORTANT]
> Make sure the generated `apiful.d.ts` file isn't excluded by your `tsconfig.json` configuration. TypeScript needs to find this file to provide typed definitions for your OpenAPI schema.

> [!TIP]
> Run the generate command whenever your OpenAPI schema changes to keep your types up-to-date. Consider adding it to your build process or a pre-commit hook.

## Using the `OpenAPIBuilder` Extension

Once you have generated the TypeScript definitions, create a type-safe API client using the `OpenAPIBuilder` extension:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const baseURL = 'https://petstore3.swagger.io/api/v3'
const adapter = OpenAPIBuilder<'petStore'>()
const petStore = createClient({ baseURL }).with(adapter)
```

Your client now provides full type safety based on the OpenAPI specification. Here is how to fetch a user by username:

```ts
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

The response is typed from the schema:

```ts
declare const userResponse: {
  id?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  userStatus?: number
}
```

## OpenAPI Path Parameters

OpenAPI can define path parameters on given endpoints. They are typically declared as `/foo/{id}`. Unfortunately, the endpoint type isn't defined as `/foo/10`. Thus, using the latter as the path will break type inference.

Instead, use the property `path` to pass an object of the parameters. You can then use the declared path for type inference, and the type checker will ensure you provide all required path parameters. The parameters will be interpolated into the path before the request is made.

```ts
const response = await petStore('/foo/{id}', {
  path: {
    id: 10,
  },
})
```

> [!WARNING]
> Incorrect parameters won't be reported at runtime. An incomplete path will be sent to the backend _as-is_.

## Request Headers

Add headers to the request using the `headers` field. All headers defined in the OpenAPI schema will be type checked. You can still add additional headers that aren't defined in the schema, which won't be type checked.

```ts
const response = await petStore('/some/endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
  }
})
```
