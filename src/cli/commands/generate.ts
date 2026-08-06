import type { ArgsDef, CommandDef } from 'citty'
import type { GenerationPlan } from '../plan.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { generateDTSFragments } from '../../openapi/generate.ts'
import { CliError, commonArgs, withCleanErrors } from '../errors.ts'
import * as log from '../log.ts'
import { findDrift, fragmentDirectoryFor, planGeneration } from '../plan.ts'
import { loadConfig } from '../utils.ts'

const args: ArgsDef = {
  ...commonArgs,
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
  check: {
    type: 'boolean',
    description: 'Report whether the generated files are up to date, writing nothing',
    default: false,
  },
  root: {
    type: 'string',
    description: 'Path to the project root',
    required: false,
  },
}

const command: CommandDef<ArgsDef> = withCleanErrors(defineCommand({
  meta: {
    name: 'generate',
    description: 'Generates TypeScript definitions from OpenAPI schemas',
  },
  args,
  async run({ args }) {
    const rootDir = args.root || process.cwd()

    if (args.outfile && args.outdir) {
      throw new CliError('Cannot use both --outfile and --outdir. Use --outfile for single-file output or --outdir for fragmented output.')
    }

    const { config } = await loadConfig(rootDir)

    if (Object.keys(config).length === 0) {
      throw new CliError('Configuration file `apiful.config.{js,ts,mjs,cjs,json}` is empty or does not exist')
    }

    const services = Object.entries(config?.services ?? {})
    const servicesWithSchema = services.filter(([, service]) => Boolean(service.schema))
    const servicesWithoutSchema = services.filter(([, service]) => !service.schema)

    if (servicesWithoutSchema.length > 0) {
      const names = servicesWithoutSchema.map(([name]) => `\`${name}\``).join(', ')
      log.warn(`No \`schema\` set for ${names}, skipping`)
    }

    if (servicesWithSchema.length === 0) {
      log.info('No OpenAPI schemas found, skipping generation')
      return
    }

    const dtsOutput = await generateDTSFragments(Object.fromEntries(servicesWithSchema), { rootDir })

    const plan = planGeneration(dtsOutput, {
      rootDir,
      outfile: args.outfile,
      outdir: args.outdir,
      existingFragments: args.outdir
        ? await readDirectory(fragmentDirectoryFor(rootDir, args.outdir))
        : undefined,
    })

    if (args.check) {
      const drift = findDrift(plan, await readFiles([...plan.files.keys()]), rootDir)

      if (drift.length > 0) {
        throw new CliError(
          `OpenAPI types are stale – run \`apiful generate\` to update them:\n${drift.map(line => `  ${line}`).join('\n')}`,
        )
      }

      log.success('OpenAPI types are up to date')
      return
    }

    await applyPlan(plan)
    log.success(plan.summary)
  },
}))

export default command

async function applyPlan({ files, removals, directories }: GenerationPlan): Promise<void> {
  for (const directory of directories)
    await fsp.mkdir(directory, { recursive: true })

  await Promise.all(removals.map(filePath => fsp.rm(filePath, { force: true })))
  await Promise.all([...files].map(([filePath, contents]) => fsp.writeFile(filePath, contents)))
}

/** Reads each path into a map keyed by that path, leaving out the files that are not there. */
async function readFiles(filePaths: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(filePaths.map(async (filePath) => {
    const contents = await fsp.readFile(filePath, 'utf-8').catch(() => undefined)
    return [filePath, contents] as const
  }))

  return new Map(
    entries.filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

/** Reads every file in a directory into a map keyed by file name. Empty where the directory is absent. */
async function readDirectory(directory: string): Promise<Map<string, string>> {
  const fileNames = await fsp.readdir(directory).catch(() => [])
  const contents = await readFiles(fileNames.map(fileName => path.join(directory, fileName)))

  return new Map(
    [...contents].map(([filePath, text]) => [path.basename(filePath), text]),
  )
}
