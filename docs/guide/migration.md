---
outline: deep
---

# Migration

What each breaking change asks of you, grouped by how it reaches you: code that no longer does what it did, behavior that changed underneath it, and types that now catch what they let through before.

## From v4 to v5

### Code You Have to Change

#### Extending a Client Returns a New One

`with` used to write the extension into the client you called it on, so throwing its return value away still worked. Each call now leaves its receiver as it was and hands you the extended client, which is the one you have to keep:

```ts
import { createClient, ofetchBuilder } from 'apiful'

// Before – the extension landed on `client`, the return value was optional
const client = createClient({ baseURL: 'https://api.example.com' })
client.with(ofetchBuilder())

// After – the client that can make requests is the one `with` returns
const client = createClient({ baseURL: 'https://api.example.com' })
  .with(ofetchBuilder())
```

Written as one chain, which is how the documentation has always shown it, nothing changes. Written as separate statements, the client you kept has no handler, and calling it throws.

The same rule is what makes two clients derived from one base independent. In v4 they shared a single set of extensions, so the second one reached back and replaced the handler of the first:

```ts
import { createClient, ofetchBuilder, OpenAPIBuilder } from 'apiful'

const base = createClient({ baseURL: 'https://api.example.com' })

const restClient = base.with(ofetchBuilder())
const petStoreClient = base.with(OpenAPIBuilder<'petStore'>())

// v4: `restClient` had quietly become an OpenAPI client
// v5: both keep the extension they were given
```

#### Every Service Needs a `schema`

`schema` is now required. A service without one has nothing to generate from, so it was never more than a placeholder:

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

Give every service a schema, or drop it from the configuration. In a TypeScript configuration file this is a type error. In a JavaScript or JSON one it surfaces when you run [`apiful generate`](/guide/cli), which names the services it skips and generates the rest.

#### The `url` Service Option Is Gone

`url` never reached anything – no command read it, and no generated type came out of it. Remove the key; the base URL of a client is the `baseURL` you pass to [`createClient`](/reference/create-client).

```ts
export default defineApifulConfig({
  services: {
    petStore: {
      url: 'https://petstore3.swagger.io/api/v3', // Remove this
      schema: 'https://petstore3.swagger.io/api/v3/openapi.json',
    },
  },
})
```

### Behavior That Changed

#### A Client Without a Handler Throws

Calling a client that has no handler extension used to return `undefined`, which looked like a request that came back empty. It now throws:

```
TypeError: This client cannot make requests. Add a handler extension, such as `createClient().with(ofetchBuilder())`.
```

Add one of the [built-in extensions](/extensions/), or [write your own](/guide/custom-extensions).

#### An Unreadable Schema Fails the Run

A schema the generator could not read or parse used to be reported on the console, after which generation carried on and emitted an empty stub for that service. The types compiled, so the failure only showed up as a client that had quietly lost its typing.

The run now stops:

```
Failed to generate types for service `petStore` – …
```

[`apiful generate`](/guide/cli) exits with code `1` and writes no types. Add `--verbose` for the underlying cause. Calling the generator from your own code, the same failure arrives as a `SchemaGenerationError`.

#### Extensions Share One Fetch

Each built-in extension used to build its own `ofetch` instance from `defaultOptions`. The client now holds one instance as `client.fetch`, and every extension issues its requests through it. Nothing changes for a client you create the usual way.

What is new is that you can substitute it – for a transport of your own, or for a recording one in a test:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient(
  { baseURL: 'https://api.example.com' },
  { fetch: myFetch },
).with(ofetchBuilder())
```

> [!NOTE]
> Building that instance is also what applies `defaultOptions`, so a fetch you pass in is handed the request as it stands and owns its own options. `baseURL` is the exception: the [API Router](/extensions/api-router) extension reads it off the client to build its routes.

### Types That Are Now Stricter

These changes touch no runtime behavior. They reach you as compile errors in code that was already asking for something the schema does not offer, and as narrower types where the old ones guessed.

#### Only the Methods a Path Declares

A path used to offer all eight HTTP verbs, because `openapi-typescript` gives every path item a key for each of them. Only the declared ones are listed now:

```ts
import type { PetStore, PetStoreApiMethods } from 'apiful/schema'

type PetMethods = PetStoreApiMethods<'/pet'>
//   ^? v4: 'get' | 'post' | 'put'
//   ^? v5: 'post' | 'put'

type Endpoint = PetStore<'/pet', 'get'>
//              ^^^^^^^^^^^^^^^^^^^^^^ v5: does not compile, the Petstore declares no `get` on `/pet`
```

Where this bites, the schema is the place to look: the method you were reaching for is not in it.

#### Request and Response Resolve the Way the Client Does

`request` and `response` used to be read straight off the schema, hardcoded to `application/json` and to status `200`. They now go through the same helpers a request goes through, so what the type says and what a call hands back cannot drift apart.

Three things follow from that:

**A status with no body is `undefined`, not an empty object.**

```ts
type PetNotFound = PetStore<'/pet/{petId}', 'get'>['responses'][404]
//   ^? v4: Record<string, never>
//   ^? v5: undefined
```

**`response` is whichever 2xx status and media type the operation declares**, rather than always `200` and always JSON. An operation whose success carries no body resolves to `never`.

**An optional request body comes back widened with `undefined`**, matching what the client accepts:

```ts
type PlaceOrderBody = PetStore<'/store/order', 'post'>['request']
//   ^? v4: Order
//   ^? v5: Order | undefined
```

The same honesty applies to parameters: `path` and `query` are `never` for an operation that declares none, where v4 offered an empty object you could pass around. See [OpenAPI Type Helpers](/reference/openapi-type-helpers) for the full set.

### Renamed Exports

Only relevant if you call the generator from your own code instead of through the CLI:

| v4 | v5 |
| --- | --- |
| `generateDTSModules` | `generateDTSFragments` |
| `joinDTSModules` | `joinDTSFragments` |
| `DTSModuleOutput` | `DTSFragmentOutput` |
| `DTSModuleOutput['modules']` | `DTSFragmentOutput['fragments']` |
