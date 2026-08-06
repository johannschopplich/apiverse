import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client.ts'

export interface OFetchClient extends $Fetch {}

export function ofetchBuilder() {
  return function (client: ApiClient): OFetchClient {
    return client.fetch
  }
}
