import type { ArgsDef, CommandDef } from 'citty'
import { defineCommand } from 'citty'
import pkg from '../../package.json' with { type: 'json' }

const { name, version } = pkg

export const mainCommand: CommandDef<ArgsDef> = defineCommand({
  meta: {
    name,
    version,
    description: 'APIful CLI: Extensible & Type-Safe API Tooling',
  },
  subCommands: {
    generate: () => import('./commands/generate.ts').then(command => command.default),
  },
})
