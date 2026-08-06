# Built-in Extensions

APIful ships three handler extensions. Each one gives the client a different call signature, so the choice comes down to how you want to write a request:

| Extension | A request looks like | Reach for it when |
|---|---|---|
| [ofetch](/extensions/ofetch) | `client('users/1', { method: 'GET' })` | You want `fetch` with less ceremony, or you are just starting out |
| [OpenAPI](/extensions/openapi) | `client('/user/{username}', { path: { username: 'ada' } })` | Your API publishes an OpenAPI schema and you want paths, bodies and responses typed |
| [API Router](/extensions/api-router) | `client.users(1).posts.get()` | Your API has deep, predictable REST paths |

All three wrap [ofetch](https://github.com/unjs/ofetch), so they share its options, its error behavior and its hooks.

A client takes one handler extension. To combine one of these with methods of your own, chain a [methods extension](/guide/custom-extensions#methods-extension) after it – see [how extensions work](/guide/using-extensions#how-extensions-work).
