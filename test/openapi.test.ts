import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config'
import { generateDTS, generateDTSModules } from '../src/openapi/index'
import { currentDir } from './utils'

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPI types generation', () => {
  const config = defineApifulConfig({
    services: {
      testEcho: {
        schema: path.join(currentDir, 'fixtures/test-echo-api-schema.yml'),
      },
    },
  })

  it('generates DTS modules for directory output', async () => {
    const { entry, modules } = await generateDTSModules(config.services)

    expect(entry).toMatchSnapshot()
    expect(modules).toMatchSnapshot()
  })

  it('joins the entry and the modules into a single declaration file', async () => {
    const { entry, modules } = await generateDTSModules(config.services)
    const types = await generateDTS(config.services)

    expect(types).toBe(`${entry}\n${Object.values(modules).join('\n\n')}`)
  })

  it('generates the entry alone for a configuration listing no service', async () => {
    expect(await generateDTS({})).toBe((await generateDTSModules({})).entry)
  })
})
