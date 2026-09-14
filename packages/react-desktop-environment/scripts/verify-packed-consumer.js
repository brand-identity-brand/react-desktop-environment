import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const consumer = await mkdtemp(path.join(tmpdir(), 'desktop-packed-consumer-'))
const [packed] = JSON.parse(execFileSync('npm', [
  'pack', '--json', '--pack-destination', consumer,
], { cwd: packageDirectory, encoding: 'utf8' }))
await writeFile(path.join(consumer, 'package.json'), JSON.stringify({
  name: 'independent-applet-consumer',
  private: true,
  type: 'module',
  dependencies: {
    'react-desktop-environment': `file:./${packed.filename}`,
    react: '^19.2.8',
    'react-dom': '^19.2.8',
    jsdom: '^30.0.1',
    'fake-indexeddb': '^6.2.4',
  },
}, null, 2))
execFileSync('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: consumer,
  stdio: 'inherit',
})
await writeFile(path.join(consumer, 'verify.mjs'), await readFile(
  new URL('./packed-consumer.mjs', import.meta.url), 'utf8',
))
execFileSync(process.execPath, ['verify.mjs'], { cwd: consumer, stdio: 'inherit' })
console.log(`Verified packed consumer: ${consumer}`)
