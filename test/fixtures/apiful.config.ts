import type { ApifulConfig } from '../../src/config.ts'
import { defineApifulConfig } from '../../src/config.ts'

/** Services behind `apiful.d.ts`, the declaration file the type tests resolve `apiful/schema` to. */
const config: ApifulConfig = defineApifulConfig({
  services: {
    testEcho: {
      schema: 'test-echo-api-schema.yml',
    },
    petStore: {
      schema: 'pet-store-api-schema.json',
    },
  },
})

export default config
