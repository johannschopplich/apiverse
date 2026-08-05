# `apiRouterBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) and wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

The route builder extension gives you a jQuery-like and Axios-style API to construct your API calls. Each property access adds a path segment, and the HTTP method at the end of the chain sends the request – which reads well for REST APIs with deep, predictable paths such as `/api/v1/organizations/123/projects/456/tasks`:

```ts
// GET request to <baseURL>/users
const users = await api.users.get<UserResponse>()
```

Get started by using the `apiRouterBuilder` extension:

```ts
import { apiRouterBuilder, createClient } from 'apiful'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const api = createClient({ baseURL }).with(apiRouterBuilder())
```

## Path Building Strategies

The API Router extension offers four different ways to build API paths, giving you flexibility to choose the style that fits your needs:

### 1. Dot Notation (Recommended)

Chain path segments using dot notation for static paths:

```ts
// GET request to <baseURL>/users/profile/settings
const settings = await api.users.profile.settings.get<SettingsResponse>()

// POST request to <baseURL>/posts/comments
const comment = await api.posts.comments.post({ text: 'Hello!' })
```

### 2. Chain Syntax with Dynamic Segments

Use function calls to insert dynamic path parameters:

```ts
const userId = 123
const postId = 456

// GET request to <baseURL>/users/123/posts/456
const post = await api.users(userId).posts(postId).get<PostResponse>()

// Multiple dynamic segments
const response = await api.categories('tech').posts(postId).comments.get()
```

### 3. Bracket Notation

Use bracket notation for dynamic paths or paths with special characters:

```ts
const userId = 123

// GET request to <baseURL>/users/123
const user = await api.users[`${userId}`].get<UserResponse>()

// Useful for paths with special characters or spaces
const data = await api['api-v2']['special-endpoint'].get()
```

### 4. Multiple Arguments

Pass all path segments as separate arguments:

```ts
// GET request to <baseURL>/users/123/posts/456/comments
const comments = await api('users', 123, 'posts', 456, 'comments').get<CommentResponse[]>()

// Mix static and dynamic segments
const result = await api('api', 'v1', 'users', userId, 'profile').get()
```

## When to Use Each Style

| Style | Best For | Example |
|-------|----------|---------|
| **Dot notation** | Static paths, simple APIs | `api.users.profile.get()` |
| **Chain syntax** | RESTful APIs with IDs | `api.users(123).posts(456).get()` |
| **Bracket notation** | Special characters, variables | `api['api-v2'][endpoint].get()` |
| **Multiple arguments** | Dynamic path construction | `api('users', id, 'posts').get()` |

> [!NOTE]
> `then`, `toString` and `valueOf` are not path segments. `then` stays undefined so that a chain missing its final `.get()` is not mistaken for a promise, and the other two report the URL built so far, which is what appears when you log a route. Pass such a segment as an argument instead: `api('then').get()`.

## Request Parameters and Payloads

How parameters are handled depends on the HTTP method:

### GET Requests

The first parameter becomes query parameters:

```ts
// GET <baseURL>/users?page=1&limit=10
const users = await api.users.get({ page: 1, limit: 10 })

// Works with all path building strategies
const user = await api.users(123).get({ include: 'profile' })
```

### POST, PUT, PATCH, DELETE

The first parameter becomes the request body:

```ts
// POST <baseURL>/users with JSON body
const newUser = await api.users.post({
  name: 'John Doe',
  email: 'john@example.com'
})

// PUT <baseURL>/users/123 with JSON body
const updatedUser = await api.users(123).put({
  name: 'Jane Doe'
})
```

## HTTP Request Methods

The following methods are supported as the last method in the chain:

- `get(<query>, <fetchOptions>)`
- `post(<payload>, <fetchOptions>)`
- `put(<payload>, <fetchOptions>)`
- `delete(<payload>, <fetchOptions>)`
- `patch(<payload>, <fetchOptions>)`

## Error Handling

API Router automatically throws errors for non-2xx HTTP status codes. Handle them using try-catch:

```ts
try {
  const user = await api.users(999).get<UserResponse>()
}
catch (error) {
  // Handle 404, 500, etc.
  if (error.status === 404) {
    console.log('User not found')
  }
  else {
    console.log('API error:', error.message)
  }
}
```

## Headers Management

### Default Headers

Headers from `createClient` are automatically included:

```ts
const api = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  }
}).with(apiRouterBuilder())

// All requests include the default headers
const users = await api.users.get()
```

### Override Headers

Pass additional headers or override defaults in method calls:

```ts
// Override default headers for this request
const response = await api.users.get(null, {
  headers: {
    'Authorization': 'Bearer different-token',
    'Cache-Control': 'no-cache'
  }
})

// Add headers to POST requests
const newUser = await api.users.post(userData, {
  headers: {
    'X-Request-ID': 'abc123'
  }
})
```

## Override Default Options

Pass custom fetch options to any method call to override defaults:

```ts
const response = await api.users.get(queryParams, {
  headers: {
    Authorization: 'Bearer <token>',
  },
  timeout: 5000,
  retry: 3
})
```
