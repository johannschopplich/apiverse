import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GENERATED_FILE_HEADER } from '../../src/constants.ts'
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

    it('reads a schema given as a file URL', async () => {
      const directory = createDirectory({ 'schemas/pet-store.json': SCHEMA })
      const schemaUrl = pathToFileURL(path.join(directory, 'schemas/pet-store.json')).href
      await fsp.writeFile(
        path.join(directory, 'apiful.config.ts'),
        `export default { services: { petStore: { schema: ${JSON.stringify(schemaUrl)} } } }\n`,
      )

      const { exitCode } = await runCli(['generate', `--root=${directory}`])
      const types = await fsp.readFile(path.join(directory, 'apiful.d.ts'), 'utf-8')

      expect(exitCode).toBeUndefined()
      expect(types).toContain('/pets/{id}')
    })

    it('exits with code 1 for a schema it cannot read', async () => {
      const directory = createDirectory({
        'apiful.config.ts': `export default { services: { petStore: { schema: 'schemas/missing.json' } } }\n`,
      })

      const { exitCode, stderr } = await runCli(['generate', `--root=${directory}`])

      expect(exitCode).toBe(1)
      expect(stderr).toContain('petStore')
      await expect(fsp.readFile(path.join(directory, 'apiful.d.ts'), 'utf-8')).rejects.toThrow()
    })

    it('warns about a service configured without a schema', async () => {
      const directory = createDirectory({
        'apiful.config.ts': `export default { services: { petStore: { schema: 'schemas/pet-store.json' }, forgotten: {} } }\n`,
        'schemas/pet-store.json': SCHEMA,
      })

      const { exitCode, stderr } = await runCli(['generate', `--root=${directory}`])

      expect(exitCode).toBeUndefined()
      expect(stderr).toContain('forgotten')
      expect(stderr).toContain('schema')
    })

    it('--check exits with code 1 for type definitions that were never generated', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
      })

      const { exitCode, stderr } = await runCli(['generate', `--root=${directory}`, '--check'])

      expect(exitCode).toBe(1)
      expect(stderr).toContain('apiful.d.ts')
      await expect(fsp.readFile(path.join(directory, 'apiful.d.ts'), 'utf-8')).rejects.toThrow()
    })

    it('--check leaves an outdated type definition file unchanged', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
        'apiful.d.ts': `${GENERATED_FILE_HEADER}declare module 'apiful/schema/stale' {}\n`,
      })

      const { exitCode } = await runCli(['generate', `--root=${directory}`, '--check'])

      expect(exitCode).toBe(1)
      await expect(fsp.readFile(path.join(directory, 'apiful.d.ts'), 'utf-8'))
        .resolves
        .toContain('apiful/schema/stale')
    })

    it('--check passes for type definitions that are already current', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
      })

      await runCli(['generate', `--root=${directory}`])
      const { exitCode } = await runCli(['generate', `--root=${directory}`, '--check'])

      expect(exitCode).toBeUndefined()
    })

    it('--check reports a fragment the configuration no longer lists', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
      })

      await runCli(['generate', `--root=${directory}`, '--outdir=generated'])
      const stalePath = path.join(directory, 'generated/schema/removedService.d.ts')
      await fsp.writeFile(stalePath, `${GENERATED_FILE_HEADER}declare module 'apiful/schema/removedService' {}\n`)

      const { exitCode, stderr } = await runCli(['generate', `--root=${directory}`, '--outdir=generated', '--check'])

      expect(exitCode).toBe(1)
      expect(stderr).toContain('removedService.d.ts')
      await expect(fsp.readFile(stalePath, 'utf-8')).resolves.toContain('removedService')
    })

    it('writes an entry file referencing one fragment per service with --outdir', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
      })

      const { exitCode } = await runCli(['generate', `--root=${directory}`, '--outdir=generated'])
      const entry = await fsp.readFile(path.join(directory, 'generated/apiful.d.ts'), 'utf-8')
      const fragment = await fsp.readFile(path.join(directory, 'generated/schema/petStore.d.ts'), 'utf-8')

      expect(exitCode).toBeUndefined()
      expect(entry).toContain('/// <reference path="schema/petStore.d.ts" />')
      expect(fragment).toContain(`declare module 'apiful/schema/petStore'`)
    })

    it('keeps the files it did not write in the --outdir directory', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
        'types/handwritten.ts': 'export const keep = true\n',
      })

      await runCli(['generate', `--root=${directory}`, '--outdir=types'])

      await expect(fsp.readFile(path.join(directory, 'types/handwritten.ts'), 'utf-8'))
        .resolves
        .toContain('keep')
    })

    it('deletes the fragment of a service the configuration no longer lists', async () => {
      const directory = createDirectory({
        'apiful.config.ts': CONFIG,
        'schemas/pet-store.json': SCHEMA,
        'generated/schema/removedService.d.ts': `${GENERATED_FILE_HEADER}declare module 'apiful/schema/removedService' {}\n`,
        'generated/schema/handwritten.d.ts': `declare module 'my-own' {}\n`,
      })

      await runCli(['generate', `--root=${directory}`, '--outdir=generated'])

      await expect(fsp.readFile(path.join(directory, 'generated/schema/removedService.d.ts'), 'utf-8'))
        .rejects
        .toThrow()
      await expect(fsp.readFile(path.join(directory, 'generated/schema/handwritten.d.ts'), 'utf-8'))
        .resolves
        .toContain('my-own')
    })
  })
})
