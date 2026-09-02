import { describe, expect, it } from 'vitest'
import { version } from '../../package.json' with { type: 'json' }
import { runCliProcess, useTemporaryDirectories } from './utils.ts'

const createDirectory = useTemporaryDirectories()

describe('apiful CLI as a child process', () => {
  it('prints its version', async () => {
    const { stdout, exitCode } = await runCliProcess(['--version'])

    expect(stdout).toBe(`${version}\n`)
    expect(exitCode).toBe(0)
  })

  it('exits with a failure status when no configuration file exists', async () => {
    const directory = createDirectory()

    const { stderr, exitCode } = await runCliProcess(['generate', `--root=${directory}`])

    expect(exitCode).toBe(1)
    expect(stderr).toContain('apiful.config')
  })
})
