# OpenAPI Type Helpers

When building clients with the [`OpenAPIBuilder` extension](/extensions/openapi), you may want to extract TypeScript types from your OpenAPI schema. APIful generates a comprehensive type system that lets you access request and response types for any endpoint without manually defining them.

## Why Use Type Helpers?

Instead of writing types manually for each API endpoint, you can extract them directly from your OpenAPI schema:

```ts
// ❌ Manual type definition (error-prone, out of sync)
interface CreateUserRequest {
  name: string
  email: string
}

// ✅ Extract from OpenAPI schema (always up-to-date)
type CreateUserRequest = PetStore<'/user', 'post'>['request']
```

## The Unified Type Interface

APIful generates a unified type interface for each service that provides comprehensive access to all endpoint information. This interface follows the pattern `Service<Path, Method>` and serves as your single source of truth for API type information:

```ts
import type { PetStore } from 'apiful/schema'

// The unified interface: Service<Path, Method>
type UserEndpoint = PetStore<'/user/{username}', 'get'>

// Extract any part of the endpoint
type PathParams = UserEndpoint['path'] // { username: string }
type QueryParams = UserEndpoint['query'] // Query parameters
type RequestBody = UserEndpoint['request'] // Request body type
type Response = UserEndpoint['response'] // Success response (200)
type ErrorResponse = UserEndpoint['responses'][404] // Specific status code
```

## Core Type Properties

Every endpoint type provides these essential properties that give you complete control over API interactions. These properties are automatically inferred from your OpenAPI schema:

| Property | Description | Example |
|----------|-------------|---------|
| `path` | Path parameters extracted from URL segments enclosed in braces | `{ petId: number }` |
| `query` | Query string parameters that can be appended to the URL | `{ status: 'available' \| 'pending' }` |
| `request` | Request body type for POST/PUT/PATCH operations | `{ name: string; category: Category }` |
| `response` | Success response type (typically 200 status code) | `{ id: number; name: string }` |
| `responses` | Map of all possible HTTP status codes to their response types | `{ 200: Pet; 404: Error; 400: ValidationError }` |
| `fullPath` | The complete path template as defined in the OpenAPI spec | `'/pet/{petId}'` |
| `method` | HTTP method verb for the operation | `'get'` |
| `operation` | Complete OpenAPI operation object with all metadata | Complete operation object |

## Practical Examples

The following sections showcase common patterns for extracting type information from your OpenAPI schema. These examples demonstrate how to leverage the unified type interface for different use cases:

### Basic Type Extraction

Extract individual type components for use in your application logic, form validation, or component props:

```ts
import type { PetStore } from 'apiful/schema'

// Extract path parameters
type PetParams = PetStore<'/pet/{petId}', 'get'>['path']
//   ^? { petId: number }

// Extract query parameters
type StatusQuery = PetStore<'/pet/findByStatus', 'get'>['query']
//   ^? { status?: "available" | "pending" | "sold" }

// Extract request body
type CreatePetBody = PetStore<'/pet', 'post'>['request']
//   ^? { id?: number; name: string; category: Category }

// Extract response type
type PetResponse = PetStore<'/pet/{petId}', 'get'>['response']
//   ^? { id?: number; name: string; status: string }
```

### Error Response Types

`responses` maps every status code the operation declares to the body it returns:

```ts
// All responses the endpoint declares
type AllPetResponses = PetStore<'/pet/{petId}', 'get'>['responses']
//   ^? { 200: Pet; 400: Record<string, never>; 404: Record<string, never> }

// A single status code
type PetNotFound = PetStore<'/pet/{petId}', 'get'>['responses'][404]
//   ^? Record<string, never>
```

Only the codes the operation itself declares are available, so `PetStore<'/pet', 'post'>['responses']` offers `200` and `405` and nothing else. A status declared without a response body – which is every error in the Petstore schema – resolves to `Record<string, never>`.

This is the body a status maps to. To type the error a failed request actually throws, use [`FetchResponseError`](/extensions/openapi#error-responses).

## Schema Discovery

APIful generates helper types for exploring your API structure programmatically. These types are useful for building dynamic UI components or API documentation:

```ts
import type { PetStoreApiMethods, PetStoreApiPaths } from 'apiful/schema'

// Get all available paths
type AllPaths = PetStoreApiPaths
//   ^? '/pet' | '/pet/{petId}' | '/pet/findByStatus' | /* ... */

// Get all available methods for a specific path
type PetMethods = PetStoreApiMethods<'/pet'>
//   ^? 'get' | 'post' | 'put'
```

## Schema Model Types

APIful also generates a dedicated helper for extracting OpenAPI schema models directly. This provides access to your data models without needing to reference specific endpoints:

```ts
import type { PetStoreModel } from 'apiful/schema'

// Extract schema models directly
type Pet = PetStoreModel<'Pet'>
//   ^? { id?: number; name: string; category: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' }

type Category = PetStoreModel<'Category'>
//   ^? { id?: number; name?: string }

type User = PetStoreModel<'User'>
//   ^? { id?: number; username?: string; firstName?: string; lastName?: string; email?: string; password?: string; phone?: string; userStatus?: number }
```

This is particularly useful when you need to work with schema models independently of specific endpoints, such as for creating reusable components, utility functions, or when the same model is used across multiple API operations.
