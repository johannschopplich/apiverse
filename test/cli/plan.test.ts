import type { DTSFragmentOutput } from '../../src/openapi/generate.ts'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findDrift, planGeneration } from '../../src/cli/plan.ts'
import { GENERATED_FILE_HEADER } from '../../src/constants.ts'

const ROOT = path.resolve('/projects/app')

const DTS: DTSFragmentOutput = {
  entry: `declare module 'apiful/schema' {}\n`,
  fragments: {
    petStore: `declare module 'apiful/schema/petStore' {}\n`,
    testEcho: `declare module 'apiful/schema/testEcho' {}\n`,
  },
}

const SINGLE_SERVICE_DTS: DTSFragmentOutput = {
  entry: DTS.entry,
  fragments: { petStore: DTS.fragments.petStore! },
}

describe('planGeneration', () => {
  it('writes the entry and every fragment to apiful.d.ts under the root', () => {
    const { files } = planGeneration(DTS, { rootDir: ROOT })

    expect([...files.keys()]).toEqual([path.join(ROOT, 'apiful.d.ts')])
    expect(files.get(path.join(ROOT, 'apiful.d.ts'))).toBe(
      `${GENERATED_FILE_HEADER}${DTS.entry}\n${DTS.fragments.petStore}\n\n${DTS.fragments.testEcho}`,
    )
  })

  it('resolves --outfile against the root and names its parent as a directory to create', () => {
    const { files, directories } = planGeneration(DTS, { rootDir: ROOT, outfile: 'types/nested/api.d.ts' })

    expect([...files.keys()]).toEqual([path.join(ROOT, 'types/nested/api.d.ts')])
    expect(directories).toEqual([path.join(ROOT, 'types/nested')])
  })

  it('summarizes the outfile path with the service count pluralized', () => {
    expect(planGeneration(DTS, { rootDir: ROOT }).summary)
      .toBe('OpenAPI types generated in `apiful.d.ts` (2 services)')
    expect(planGeneration(SINGLE_SERVICE_DTS, { rootDir: ROOT }).summary)
      .toBe('OpenAPI types generated in `apiful.d.ts` (1 service)')
  })

  it('writes one fragment per service with --outdir', () => {
    const { files } = planGeneration(DTS, { rootDir: ROOT, outdir: 'generated' })

    expect(files.get(path.join(ROOT, 'generated/schema/petStore.d.ts')))
      .toBe(`${GENERATED_FILE_HEADER}${DTS.fragments.petStore}`)
    expect(files.get(path.join(ROOT, 'generated/schema/testEcho.d.ts')))
      .toBe(`${GENERATED_FILE_HEADER}${DTS.fragments.testEcho}`)
  })

  it('points the --outdir entry at each fragment with a forward-slash reference path', () => {
    const { files } = planGeneration(DTS, { rootDir: ROOT, outdir: 'generated' })

    expect(files.get(path.join(ROOT, 'generated/apiful.d.ts'))).toBe(
      `${GENERATED_FILE_HEADER}`
      + `/// <reference path="schema/petStore.d.ts" />\n`
      + `/// <reference path="schema/testEcho.d.ts" />\n\n`
      + `${DTS.entry}`,
    )
  })

  it('names the fragment directory as the one to create with --outdir', () => {
    expect(planGeneration(DTS, { rootDir: ROOT, outdir: 'generated' }).directories)
      .toEqual([path.join(ROOT, 'generated/schema')])
  })

  it('names the output directory rather than the fragment directory when no service is listed', () => {
    const empty: DTSFragmentOutput = { entry: DTS.entry, fragments: {} }
    const { files, directories, summary } = planGeneration(empty, { rootDir: ROOT, outdir: 'generated' })

    expect(directories).toEqual([path.join(ROOT, 'generated')])
    expect(files.get(path.join(ROOT, 'generated/apiful.d.ts'))).toBe(`${GENERATED_FILE_HEADER}${DTS.entry}`)
    expect(summary).toBe('OpenAPI types generated in `generated/` (entry + 0 services)')
  })

  it('removes a fragment carrying the generated header that no service claims', () => {
    const { removals } = planGeneration(DTS, {
      rootDir: ROOT,
      outdir: 'generated',
      existingFragments: new Map([
        ['petStore.d.ts', `${GENERATED_FILE_HEADER}stale but still configured`],
        ['removedService.d.ts', `${GENERATED_FILE_HEADER}declare module 'apiful/schema/removedService' {}`],
      ]),
    })

    expect(removals).toEqual([path.join(ROOT, 'generated/schema/removedService.d.ts')])
  })

  it('keeps a file in the fragment directory that carries no generated header', () => {
    const { removals } = planGeneration(DTS, {
      rootDir: ROOT,
      outdir: 'generated',
      existingFragments: new Map([
        ['handwritten.d.ts', `declare module 'my-own' {}`],
        ['notes.md', `${GENERATED_FILE_HEADER}not a declaration file`],
      ]),
    })

    expect(removals).toEqual([])
  })

  it('removes nothing with --outfile, whatever the fragment directory holds', () => {
    const { removals } = planGeneration(DTS, {
      rootDir: ROOT,
      existingFragments: new Map([['removedService.d.ts', `${GENERATED_FILE_HEADER}`]]),
    })

    expect(removals).toEqual([])
  })
})

describe('findDrift', () => {
  const plan = planGeneration(DTS, { rootDir: ROOT, outdir: 'generated' })

  it('returns no lines when every planned file is on disk unchanged', () => {
    expect(findDrift(plan, new Map(plan.files), ROOT)).toEqual([])
  })

  it('reports a planned file that is not on disk as missing', () => {
    const onDisk = new Map(plan.files)
    onDisk.delete(path.join(ROOT, 'generated/schema/testEcho.d.ts'))

    expect(findDrift(plan, onDisk, ROOT)).toEqual(['missing: generated/schema/testEcho.d.ts'])
  })

  it('reports a planned file whose contents differ as out of date', () => {
    const onDisk = new Map(plan.files)
    onDisk.set(path.join(ROOT, 'generated/apiful.d.ts'), 'written by hand')

    expect(findDrift(plan, onDisk, ROOT)).toEqual(['out of date: generated/apiful.d.ts'])
  })

  it('reports a removal as no longer configured', () => {
    const withRemoval = { ...plan, removals: [path.join(ROOT, 'generated/schema/removedService.d.ts')] }

    expect(findDrift(withRemoval, new Map(plan.files), ROOT))
      .toEqual(['no longer configured: generated/schema/removedService.d.ts'])
  })
})
