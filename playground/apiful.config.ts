import type { ApifulConfig } from '../src/config.ts'
import { defineApifulConfig } from '../src/config.ts'

const config: ApifulConfig = defineApifulConfig({
  services: {
    testEcho: {
      schema: '../test/fixtures/test-echo-api-schema.yml',
    },
    petStore: {
      schema: '../test/fixtures/pet-store-api-schema.json',
    },
  },
})

export default config
