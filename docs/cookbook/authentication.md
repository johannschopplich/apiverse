# Authenticating Requests

Where the credential goes depends on how often it changes. A key that is fixed for the life of the process belongs in the client's default options; anything that expires has to be read per request.

Every example here uses [`createClient`](/reference/create-client) with [`ofetchBuilder`](/extensions/ofetch), but nothing about them is specific to that extension – all three built-in extensions wrap ofetch, so the same options and hooks apply.

## A Credential That Does Not Change

Set it once as a default header:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
}).with(ofetchBuilder())
```

## A Token That Expires

Default options are read once, when the client is created. A token interpolated into them is the token that was valid at startup, and it will still be sent an hour later.

Use ofetch's `onRequest` hook instead, which runs before every request and may be async:

```ts
const client = createClient({
  baseURL: 'https://api.example.com',
  async onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${await getAccessToken()}`)
  },
}).with(ofetchBuilder())
```

`options.headers` is a `Headers` instance, so `set` replaces any value already there and `append` adds to it.

## Refreshing After a 401

A hook cannot answer a request – `onResponseError` returns nothing, so it has no way to hand back a second response. What it can do is invalidate the token and let ofetch's retry make the second attempt, because a retried request runs `onRequest` again:

```ts
const client = createClient({
  baseURL: 'https://api.example.com',
  retry: 1,
  retryStatusCodes: [401, 408, 409, 425, 429, 500, 502, 503, 504],
  async onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${await getAccessToken()}`)
  },
  onResponseError({ response }) {
    if (response.status === 401)
      forgetAccessToken()
  },
}).with(ofetchBuilder())
```

Two details decide whether this works:

- `retryStatusCodes` **replaces** the default list rather than extending it. Passing `[401]` alone would switch off retries for `429` and `503`, so repeat the defaults – `408, 409, 425, 429, 500, 502, 503, 504` – alongside it.
- `retry` defaults to `1` for `GET`, but to `0` for `POST`, `PUT`, `PATCH`, and `DELETE`, since replaying a write is not always safe. Setting it explicitly, as above, opts those methods in. Leave it unset if your writes are not idempotent, and accept that they fail on an expired token.

## One Refresh for Concurrent Requests

Ten requests that all reach an expired token will each call the refresh endpoint. Hold the in-flight refresh in a promise and hand the same one to every caller:

```ts
let accessToken: string | undefined
let refreshing: Promise<string> | undefined

async function getAccessToken(): Promise<string> {
  if (accessToken)
    return accessToken

  refreshing ??= requestNewToken().finally(() => {
    refreshing = undefined
  })

  accessToken = await refreshing
  return accessToken
}

function forgetAccessToken(): void {
  accessToken = undefined
}
```

Clearing `refreshing` in `finally` rather than after the `await` matters: a refresh that rejects would otherwise leave the failed promise cached, and every later request would be handed the same error.

> [!WARNING]
> Module-level state is per process. On a server this cache is shared by every user the process handles, so it fits a machine-to-machine credential and not a per-user session token – for that, key the token by user and keep it wherever the rest of the session lives.
