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

The `url` option is gone from the same type. Nothing ever read it, so delete the key if you have one.

### Behavior That Changed

#### A Client Without a Handler Throws

Calling a client that has no handler extension used to return `undefined`, which looked like a request that came back empty. It now throws:

```
TypeError: This client cannot make requests. Add a handler extension, such as `createClient().with(ofetchBuilder())`.
```

Add one of the [built-in extensions](/extensions/), or [write your own](/guide/custom-extensions).

#### An Unreadable Schema Fails the Run

A schema the generator could not read or parse used to be logged, after which the run carried on and emitted an empty stub for that service – leaving you with a client that compiled and was silently untyped. The run now stops:

```
Failed to generate types for service `petStore` – …
```

[`apiful generate`](/guide/cli) exits with code `1` and writes no types. Add `--verbose` for the underlying cause. Calling the generator from your own code, the same failure arrives as a `SchemaGenerationError`.

### Types That Are Now Stricter

These changes touch no runtime behavior. They reach you as compile errors in code that was already asking for something the schema does not offer, and as narrower types where the old ones guessed.

#### An Extension Builder Sees the Extensions Before It

`with` has always handed the builder the client as it stands, but typed that client as the one `createClient` returned. Reaching for a method or a call signature an earlier extension added was a compile error, and where the client happened to be callable the call resolved to `any`. The builder now receives the client it is actually given:

```ts
const api = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(OpenAPIBuilder<'petStore'>())
  .with(client => ({
    pet: (petId: number) => client('/pet/{petId}', { method: 'GET', path: { petId } }),
  }))

const pet = await api.pet(1)
//    ^? v4: any
//    ^? v5: { id?: number, name: string, … }
```

Nothing to change unless the old `any` was flowing somewhere that now disagrees with the real type. A builder declared outside the chain still describes its client itself – [reaching the client](/guide/custom-extensions#reaching-the-client) covers the shape that keeps the types.

#### Only the Methods a Path Declares

A path used to offer all eight HTTP verbs. Only the ones it declares are listed now:

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

`request` and `response` used to be hardcoded to `application/json` and to status `200`. They now resolve through the same helpers a call resolves through, so what the type says and what a request hands back cannot drift apart. Three things follow from that:

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

Parameters follow the same rule: `path` and `query` are `never` for an operation that declares none, where v4 offered an empty object you could pass around. See [OpenAPI Type Helpers](/reference/openapi-type-helpers) for the full set.

### Renamed Exports

Only relevant if you call the generator from your own code instead of through the CLI:

| v4 | v5 |
| --- | --- |
| `generateDTSModules` | `generateDTSFragments` |
| `joinDTSModules` | `joinDTSFragments` |
| `DTSModuleOutput` | `DTSFragmentOutput` |
| `DTSModuleOutput['modules']` | `DTSFragmentOutput['fragments']` |
