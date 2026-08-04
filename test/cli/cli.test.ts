import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runCli, useTemporaryDirectories } from './utils.ts'

const SCHEMA = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Pet Store', version: '1.0.0' },
  paths: {
    '/pets/{id}': {
      get: {
        operationId: 'getPet',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'A pet',
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } },
          },
        },
      },
    },
  },
})

const CONFIG = `export default { services: { petStore: { schema: 'schemas/pet-store.json' } } }\n`

const createDirectory = useTemporaryDirectories()

describe('apiful CLI', () => {
  describe('generate', () => {
    it('writes type definitions for a local OpenAPI schema', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
      })

      const { exitCode } = await runCli(['generate', `--root=${directory}`])
      const types = await fsp.readFile(path.join(directory, 'apiful.d.ts'), 'utf-8')

      expect(exitCode).toBeUndefined()
      expect(types).toContain(`declare module 'apiful/schema/petStore'`)
      expect(types).toContain('/pets/{id}')
    })
  })
})
