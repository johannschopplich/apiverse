import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { exec } from 'tinyexec'

const rootDir = path.join(import.meta.dirname, '..')
const snippetDir = path.join(rootDir, 'docs/snippets')
const cliEntry = path.join(rootDir, 'src/cli/entry.ts')

const fixtureDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'apiful-cli-snippets-'))
await fsp.copyFile(
  path.join(rootDir, 'test/fixtures/test-echo-api-schema.yml'),
  path.join(fixtureDir, 'schema.yml'),
)
await fsp.writeFile(
  path.join(fixtureDir, 'apiful.config.ts'),
  `export default { services: { testEcho: { schema: 'schema.yml' } } }\n`,
)

await capture('help.ansi', ['--help'])
await capture('generate-help.ansi', ['generate', '--help'])
await capture('generate.ansi', ['generate', `--root=${fixtureDir}`])

await fsp.rm(fixtureDir, { recursive: true, force: true })
consola.success('Generated the CLI snippets in `docs/snippets`')

/**
 * Runs the CLI once and writes everything it printed to a snippet file. Both
 * streams are kept, since citty writes help to stdout while a command reports
 * its result on stderr.
 */
async function capture(fileName: string, argv: string[]): Promise<void> {
  const { stdout, stderr } = await exec('node', [cliEntry, ...argv], {
    nodeOptions: { env: { ...process.env, FORCE_COLOR: '1' } },
  })

  const transcript = [stdout, stderr].filter(Boolean).join('').trimEnd()
  await fsp.writeFile(path.join(snippetDir, fileName), `${withoutVersionSuffix(transcript)}\n`)
}

/**
 * Drops the parenthetical from the description line, where citty prints the
 * package version – it would otherwise rewrite every snippet on release. The
 * line cannot be matched to its end, since the color reset follows the bracket.
 */
function withoutVersionSuffix(transcript: string): string {
  const [description = '', ...rest] = transcript.split('\n')
  return [description.replace(/ \([^()]*\)/, ''), ...rest].join('\n')
}
