import type { CommandDef, RunMainOptions } from 'utilful/cli'
import { defineCommand } from 'utilful/cli'
import pkg from '../../package.json' with { type: 'json' }
import { SchemaGenerationError } from '../openapi/generate.ts'
import generateCommand from './commands/generate.ts'

const { name, version } = pkg

export const cliOptions: RunMainOptions = { expectedErrors: [SchemaGenerationError] }

export const mainCommand: CommandDef = defineCommand({
  meta: {
    name,
    version,
    description: 'APIful CLI: Extensible & Type-Safe API Tooling',
  },
  subCommands: {
    generate: generateCommand,
  },
})
