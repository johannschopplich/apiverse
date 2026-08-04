import type { UserConfig } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const { exports } = (await import('./package.json', { with: { type: 'json' } })).default

const config: UserConfig = defineConfig({
  entry: [
    ...([...inferExports(exports)]
      .filter(entry => !entry.endsWith('schema.ts'))),
    'src/cli/entry.ts',
  ],
  external: [
    'apiful/schema',
    'json-schema',
    'json-schema-to-typescript-lite',
    'openapi-typescript',
    '@types/json-schema',
  ],
  dts: true,
  unbundle: true,
})

export default config

function inferExports(exports: Record<string, unknown>): Set<string> {
  const entries = new Set<string>()

  for (const value of Object.values(exports)) {
    if (typeof value === 'string') {
      if (value.endsWith('.mjs')) {
        entries.add(value.replace('./dist', './src').replace('.mjs', '.ts'))
      }
    }
    else if (typeof value === 'object' && value !== null) {
      for (const entry of inferExports(value as Record<string, unknown>)) {
        entries.add(entry)
      }
    }
  }

  return entries
}
