import type { DTSModuleOutput } from '../openapi/generate.ts'
import * as path from 'node:path'
import { DEFAULT_OUTFILE, GENERATED_FILE_HEADER } from '../constants.ts'
import { joinDTSModules } from '../openapi/generate.ts'

export interface GenerationPlan {
  /** Full contents keyed by absolute path, for every file the run would write. */
  files: Map<string, string>
  /** Absolute paths of generated files the run would delete. */
  removals: string[]
  /** Absolute paths the run would create before writing. */
  directories: string[]
  /** Line reported once the plan is applied. */
  summary: string
}

export interface PlanOptions {
  /** Directory the output paths resolve against. */
  rootDir: string
  /** Single-file output path. Defaults to `apiful.d.ts` when neither this nor `outdir` is set. */
  outfile?: string
  /** Fragmented output directory, taking an entry file and one fragment per service. */
  outdir?: string
  /**
   * Contents of the files already in the fragment directory, keyed by file name. Read by
   * the caller so planning stays off the disk, and only consulted for `outdir`, where a
   * fragment of a service the configuration no longer lists has to be found to be removed.
   */
  existingFragments?: Map<string, string>
}

/** Directory the per-service fragments of an `outdir` run live in. */
export function fragmentDirectoryFor(rootDir: string, outdir: string): string {
  return path.join(path.resolve(rootDir, outdir), 'schema')
}

/** Decides everything a run would change on disk, without touching any of it. */
export function planGeneration(dts: DTSModuleOutput, options: PlanOptions): GenerationPlan {
  const { outdir } = options

  return outdir
    ? planFragmentedOutput(dts, { ...options, outdir })
    : planSingleFileOutput(dts, options)
}

/**
 * Compares a plan against the contents already on disk, keyed by the same absolute paths
 * the plan uses, and describes each way they disagree. A path missing from `currentContents`
 * is a file that is not there. An empty list is what `--check` is looking for.
 */
export function findDrift(
  { files, removals }: GenerationPlan,
  currentContents: Map<string, string>,
  rootDir: string,
): string[] {
  const drift: string[] = []

  for (const [filePath, contents] of files) {
    const current = currentContents.get(filePath)

    if (current === undefined)
      drift.push(`missing: ${path.relative(rootDir, filePath)}`)
    else if (current !== contents)
      drift.push(`out of date: ${path.relative(rootDir, filePath)}`)
  }

  for (const filePath of removals)
    drift.push(`no longer configured: ${path.relative(rootDir, filePath)}`)

  return drift
}

function planSingleFileOutput(dts: DTSModuleOutput, { rootDir, outfile }: PlanOptions): GenerationPlan {
  const outfilePath = path.resolve(rootDir, outfile || DEFAULT_OUTFILE)
  const serviceCount = Object.keys(dts.modules).length

  return {
    files: new Map([[outfilePath, `${GENERATED_FILE_HEADER}${joinDTSModules(dts)}`]]),
    removals: [],
    directories: [path.dirname(outfilePath)],
    summary: `OpenAPI types generated in \`${path.relative(rootDir, outfilePath)}\` (${serviceCount} ${pluralizeServices(serviceCount)})`,
  }
}

function planFragmentedOutput(
  { entry, modules }: DTSModuleOutput,
  { rootDir, outdir, existingFragments }: PlanOptions & { outdir: string },
): GenerationPlan {
  const outputDir = path.resolve(rootDir, outdir)
  const entryFilePath = path.join(outputDir, DEFAULT_OUTFILE)
  const fragmentDir = fragmentDirectoryFor(rootDir, outdir)

  const files = new Map<string, string>()
  const references: string[] = []
  const fragmentFileNames: string[] = []

  for (const [id, contents] of Object.entries(modules)) {
    const fileName = `${id}.d.ts`
    const fragmentPath = path.join(fragmentDir, fileName)

    fragmentFileNames.push(fileName)
    files.set(fragmentPath, `${GENERATED_FILE_HEADER}${contents}`)
    references.push(`/// <reference path="${toReferencePath(path.dirname(entryFilePath), fragmentPath)}" />`)
  }

  files.set(entryFilePath, references.length > 0
    ? `${GENERATED_FILE_HEADER}${references.join('\n')}\n\n${entry}`
    : `${GENERATED_FILE_HEADER}${entry}`)

  const relativeOutdir = path.relative(rootDir, outputDir) || '.'
  const fragmentCount = fragmentFileNames.length

  return {
    files,
    removals: findStaleFragments(fragmentDir, existingFragments, fragmentFileNames),
    directories: fragmentCount > 0 ? [fragmentDir] : [outputDir],
    summary: `OpenAPI types generated in \`${relativeOutdir}/\` (entry + ${fragmentCount} ${pluralizeServices(fragmentCount)})`,
  }
}

/**
 * Finds the fragments of services the configuration no longer lists. Only a declaration
 * file carrying the generated header counts, since `--outdir` may point at a directory
 * whose other contents belong to the project.
 */
function findStaleFragments(
  fragmentDir: string,
  existingFragments: Map<string, string> | undefined,
  currentFileNames: string[],
): string[] {
  const current = new Set(currentFileNames)
  const stale: string[] = []

  for (const [fileName, contents] of existingFragments ?? []) {
    if (!fileName.endsWith('.d.ts') || current.has(fileName))
      continue

    if (contents.startsWith(GENERATED_FILE_HEADER))
      stale.push(path.join(fragmentDir, fileName))
  }

  return stale
}

function toReferencePath(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/')
}

function pluralizeServices(count: number): string {
  return count === 1 ? 'service' : 'services'
}
