import type { ArgsDef, CommandDef } from 'citty'
import type { ServiceOptions } from '../../config.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { DEFAULT_OUTFILE, GENERATED_FILE_HEADER } from '../../constants.ts'
import { generateDTS, generateDTSModules } from '../../openapi/generate.ts'
import { CliError, commonArgs, withCleanErrors } from '../errors.ts'
import * as log from '../log.ts'
import { loadConfig } from '../utils.ts'

/**
 * Everything a run would change on disk, decided before it touches any of it, so
 * `--check` can compare the plan against what is already there.
 */
interface GenerationPlan {
  /** Full contents keyed by absolute path, for every file the run would write. */
  files: Map<string, string>
  /** Absolute paths of generated files the run would delete. */
  removals: string[]
  /** Absolute paths the run would create before writing. */
  directories: string[]
  /** Line reported once the plan is applied. */
  summary: string
}

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

    const resolvedOpenAPIServices = Object.fromEntries(servicesWithSchema)

    const plan = args.outdir
      ? await planFragmentedOutput(resolvedOpenAPIServices, rootDir, args.outdir)
      : await planSingleFileOutput(resolvedOpenAPIServices, rootDir, args.outfile)

    if (args.check) {
      const drift = await findDrift(plan, rootDir)

      if (drift.length > 0) {
        throw new CliError(
          `OpenAPI types are out of date – run \`apiful generate\` to update them:\n${drift.map(line => `  ${line}`).join('\n')}`,
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

async function planSingleFileOutput(
  services: Record<string, ServiceOptions>,
  rootDir: string,
  outfile: string | undefined,
): Promise<GenerationPlan> {
  const outfilePath = path.resolve(rootDir, outfile || DEFAULT_OUTFILE)
  const types = await generateDTS(services, { rootDir })
  const serviceCount = Object.keys(services).length

  return {
    files: new Map([[outfilePath, `${GENERATED_FILE_HEADER}${types}`]]),
    removals: [],
    directories: [path.dirname(outfilePath)],
    summary: `OpenAPI types generated in \`${path.relative(rootDir, outfilePath)}\` (${serviceCount} ${pluralizeServices(serviceCount)})`,
  }
}

async function planFragmentedOutput(
  services: Record<string, ServiceOptions>,
  rootDir: string,
  outdir: string,
): Promise<GenerationPlan> {
  const { entry, modules } = await generateDTSModules(services, { rootDir })
  const fragments = Object.entries(modules)

  const outputDir = path.resolve(rootDir, outdir)
  const entryFilePath = path.join(outputDir, DEFAULT_OUTFILE)
  const fragmentDir = path.join(outputDir, 'schema')

  const files = new Map<string, string>()
  const references: string[] = []

  for (const [id, contents] of fragments) {
    const fragmentPath = path.join(fragmentDir, `${id}.d.ts`)
    files.set(fragmentPath, `${GENERATED_FILE_HEADER}${contents}`)
    references.push(`/// <reference path="${toReferencePath(path.dirname(entryFilePath), fragmentPath)}" />`)
  }

  files.set(entryFilePath, references.length > 0
    ? `${GENERATED_FILE_HEADER}${references.join('\n')}\n\n${entry}`
    : `${GENERATED_FILE_HEADER}${entry}`)

  const relativeOutdir = path.relative(rootDir, outputDir) || '.'

  return {
    files,
    removals: await findStaleFragments(fragmentDir, fragments.map(([id]) => `${id}.d.ts`)),
    directories: fragments.length > 0 ? [fragmentDir] : [outputDir],
    summary: `OpenAPI types generated in \`${relativeOutdir}/\` (entry + ${fragments.length} ${pluralizeServices(fragments.length)})`,
  }
}

async function applyPlan({ files, removals, directories }: GenerationPlan): Promise<void> {
  for (const directory of directories)
    await fsp.mkdir(directory, { recursive: true })

  await Promise.all(removals.map(filePath => fsp.rm(filePath, { force: true })))
  await Promise.all([...files].map(([filePath, contents]) => fsp.writeFile(filePath, contents)))
}

/**
 * Compares a plan against the files already on disk, and describes each way they
 * disagree. An empty list is what `--check` is looking for.
 */
async function findDrift({ files, removals }: GenerationPlan, rootDir: string): Promise<string[]> {
  const drift: string[] = []

  for (const [filePath, contents] of files) {
    const current = await fsp.readFile(filePath, 'utf-8').catch(() => undefined)

    if (current === undefined)
      drift.push(`missing: ${path.relative(rootDir, filePath)}`)
    else if (current !== contents)
      drift.push(`out of date: ${path.relative(rootDir, filePath)}`)
  }

  for (const filePath of removals)
    drift.push(`no longer configured: ${path.relative(rootDir, filePath)}`)

  return drift
}

function toReferencePath(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/')
}

/**
 * Finds the fragments of services the configuration no longer lists. Only a file
 * carrying the generated header counts, since `--outdir` may point at a directory
 * whose other contents belong to the project.
 */
async function findStaleFragments(fragmentDir: string, currentFileNames: string[]): Promise<string[]> {
  const entries = await fsp.readdir(fragmentDir).catch(() => [])
  const current = new Set(currentFileNames)

  const candidates = await Promise.all(
    entries
      .filter(name => name.endsWith('.d.ts') && !current.has(name))
      .map(async (name) => {
        const filePath = path.join(fragmentDir, name)
        const contents = await fsp.readFile(filePath, 'utf-8').catch(() => '')
        return contents.startsWith(GENERATED_FILE_HEADER) ? filePath : undefined
      }),
  )

  return candidates.filter(filePath => filePath !== undefined)
}

function pluralizeServices(count: number): string {
  return count === 1 ? 'service' : 'services'
}
