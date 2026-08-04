import type { ArgsDef, CommandDef } from 'citty'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { CODE_HEADER_DIRECTIVES, DEFAULT_OUTFILE } from '../../constants.ts'
import { generateDTS, generateDTSModules } from '../../openapi/generate.ts'
import * as log from '../log.ts'
import { loadConfig } from '../utils.ts'

const args: ArgsDef = {
  outfile: {
    type: 'string',
    description: 'Path to the output file',
    required: false,
  },
  outdir: {
    type: 'string',
    description: 'Directory for fragmented output (entry + per-service files)',
    required: false,
  },
  root: {
    type: 'string',
    description: 'Path to the project root',
    required: false,
  },
}

const command: CommandDef<ArgsDef> = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generates TypeScript definitions from OpenAPI schemas',
  },
  args,
  async run({ args }) {
    const rootDir = args.root || process.cwd()

    // Validate mutually exclusive options.
    if (args.outfile && args.outdir) {
      log.error('Cannot use both --outfile and --outdir. Use --outfile for single-file output or --outdir for fragmented output.')
      process.exitCode = 1
      return
    }

    const { config } = await loadConfig(rootDir)

    if (Object.keys(config).length === 0) {
      log.error('Configuration file `apiful.config.{js,ts,mjs,cjs,json}` is empty or does not exist')
      process.exitCode = 1
      return
    }

    const resolvedOpenAPIServices = Object.fromEntries(
      Object.entries(config?.services ?? {})
        .filter(([, service]) => Boolean(service.schema)),
    )

    if (Object.keys(resolvedOpenAPIServices).length === 0) {
      log.info('No OpenAPI schemas found, skipping generation')
      return
    }

    for (const service of Object.values(resolvedOpenAPIServices)) {
      if (typeof service.schema === 'string' && !service.schema.startsWith('http')) {
        service.schema = path.resolve(rootDir, service.schema)
      }
    }

    const serviceCount = Object.keys(resolvedOpenAPIServices).length
    const servicesLabel = serviceCount === 1 ? 'service' : 'services'

    // Single-file mode (default).
    if (!args.outdir) {
      const outfilePath = path.resolve(rootDir, args.outfile || DEFAULT_OUTFILE)
      const types = await generateDTS(resolvedOpenAPIServices)
      await fsp.writeFile(outfilePath, `${CODE_HEADER_DIRECTIVES}${types}`)

      const relativePath = path.relative(rootDir, outfilePath)
      log.success(`OpenAPI types generated in \`${relativePath}\` (${serviceCount} ${servicesLabel})`)
      return
    }

    // Directory mode (fragmented output).
    const { entry, modules } = await generateDTSModules(resolvedOpenAPIServices)
    const fragments = Object.entries(modules)

    const outputDir = path.resolve(rootDir, args.outdir)
    const entryFilePath = path.join(outputDir, DEFAULT_OUTFILE)
    const fragmentDir = path.join(outputDir, 'schema')

    // Clean up the entire output directory.
    await fsp.rm(outputDir, { recursive: true, force: true })

    // Create directory structure.
    await fsp.mkdir(outputDir, { recursive: true })
    if (fragments.length > 0)
      await fsp.mkdir(fragmentDir, { recursive: true })

    // Generate triple-slash references for fragments.
    const references = fragments
      .map(([id]) => {
        const fragmentPath = path.join(fragmentDir, `${id}.d.ts`)
        const relative = toReferencePath(path.dirname(entryFilePath), fragmentPath)
        return `/// <reference path="${relative}" />`
      })
      .join('\n')

    const entryContent = references
      ? `${CODE_HEADER_DIRECTIVES}${references}\n\n${entry}`
      : `${CODE_HEADER_DIRECTIVES}${entry}`

    // Write entry file.
    await fsp.writeFile(entryFilePath, entryContent)

    // Write fragment files.
    await Promise.all(
      fragments.map(async ([id, content]) => {
        const fragmentPath = path.join(fragmentDir, `${id}.d.ts`)
        await fsp.writeFile(fragmentPath, `${CODE_HEADER_DIRECTIVES}${content}`)
      }),
    )

    const relativeOutdir = path.relative(rootDir, outputDir)
    log.success(`OpenAPI types generated in \`${relativeOutdir}/\` (entry + ${fragments.length} ${servicesLabel})`)
  },
})

export default command

function toReferencePath(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/')
}
