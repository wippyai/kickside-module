import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initialize } from './init-module.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = await mkdtemp(resolve(tmpdir(), 'kickside-module-init-'))

await cp(root, target, {
  recursive: true,
  filter: (source) => !['.git', '.wippy', '.local', 'node_modules'].some((name) => source.split(/[\\/]/).includes(name)),
})

const args = [
  '--organization', 'orbit', '--module', 'tasks', '--title', 'Orbit Tasks',
  '--namespace', 'orbit.work.tasks', '--tag', 'orbit-tasks', '--route', 'tasks',
  '--github-owner', 'orbit-dev']
await initialize(args, target)

const config = JSON.parse(await readFile(resolve(target, '.kickside-module.json'), 'utf8'))
if (!config.initialized || config.identity.namespace !== 'orbit.work.tasks') throw new Error('initializer did not record the requested identity')
await readFile(resolve(target, 'ui/src/app/tasks.vue'), 'utf8')
const manifest = await readFile(resolve(target, 'wippy.yaml'), 'utf8')
const index = await readFile(resolve(target, 'src/_index.yaml'), 'utf8')
if (!manifest.includes('organization: orbit') || !manifest.includes('module: tasks')) throw new Error('initializer did not update package identity')
if (!index.includes('namespace: orbit.work.tasks') || !index.includes('tag_name: orbit-tasks')) throw new Error('initializer did not update registry identity')
for (const token of ['acme/starter', 'acme.starter', 'acme-starter', 'acme_starter', 'ACME_STARTER', 'AcmeStarter']) {
  if (manifest.includes(token) || index.includes(token)) throw new Error(`initializer retained ${token}`)
}
const second = await initialize(args, target)
if (!second.alreadyInitialized || second.changedFiles !== 0) throw new Error('initializer is not idempotent')
await import(`${pathToFileURL(resolve(target, 'scripts/check-module.mjs')).href}?initialized-test=1`)

console.log('Initializer test passed')
await rm(target, { recursive: true, force: true })
