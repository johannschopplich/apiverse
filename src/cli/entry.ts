import process from 'node:process'
import { runMain } from './errors.ts'
import { mainCommand } from './index.ts'

void runMain(mainCommand, process.argv.slice(2))
