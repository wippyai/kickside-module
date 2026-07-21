import { readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const defaultRoot = resolve(dirname(scriptPath), '..')

function usage() {
  return `Usage:
  node scripts/init-module.mjs \\
    --organization <hub-org> --module <module-name> --title <display-name> \\
    [--namespace <root.namespace>] [--tag <custom-element>] \\
    [--route <route-segment>] [--github-owner <owner>]

The initializer is idempotent for the same identity and refuses to rewrite an
already-initialized checkout to a different identity.`
}

function parseArgs(argv) {
  const out = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--help' || token === '-h') return { help: true }
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`)
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${token}`)
    if (Object.hasOwn(out, key)) throw new Error(`duplicate option: ${token}`)
    out[key] = value
    index += 1
  }
  return out
}

function namespacePart(value) {
  return value.toLowerCase().replace(/-/g, '_')
}

function snake(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function pascal(value) {
  return value.split(/[^A-Za-z0-9]+/).filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1)).join('')
}

function sameIdentity(left, right) {
  return ['organization', 'module', 'namespace', 'tag', 'route', 'title', 'githubOwner']
    .every((key) => left?.[key] === right[key])
}

export async function initialize(argv, root = defaultRoot) {
  const args = parseArgs(argv)
  if (args.help) {
    console.log(usage())
    return { help: true }
  }

  const organization = args.organization
  const moduleName = args.module
  const title = args.title
  if (!organization) throw new Error('--organization is required')
  if (!moduleName) throw new Error('--module is required')
  if (!title) throw new Error('--title is required')
  if (!/^[a-z][a-z0-9-]{1,38}$/.test(organization)) throw new Error('--organization must be a lowercase Hub/GitHub slug')
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(moduleName)) throw new Error('--module must be a lowercase module slug')
  if (title.length > 80 || /[\r\n]/.test(title)) throw new Error('--title must be one line and at most 80 characters')

  const namespace = args.namespace ?? `${namespacePart(organization)}.${namespacePart(moduleName)}`
  const tag = args.tag ?? `${organization}-${moduleName}`
  const route = args.route ?? moduleName
  const githubOwner = args['github-owner'] ?? organization
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(namespace)) throw new Error('--namespace must contain at least two lowercase dot-separated segments')
  if (!/^[a-z][a-z0-9.-]*-[a-z0-9.-]+$/.test(tag)) throw new Error('--tag must be a valid lowercase custom-element name containing a hyphen')
  if (!/^[a-z][a-z0-9-]*$/.test(route)) throw new Error('--route must be one lowercase URL segment')
  if (!/^[A-Za-z0-9_.-]+$/.test(githubOwner)) throw new Error('--github-owner is not a valid GitHub owner')

  const identity = { organization, module: moduleName, namespace, tag, route, title, githubOwner }
  const configPath = resolve(root, '.kickside-module.json')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  if (config.initialized) {
    if (sameIdentity(config.identity, identity)) {
      console.log(`Already initialized as ${organization}/${moduleName}; nothing to change.`)
      return { identity, changedFiles: 0, alreadyInitialized: true }
    }
    throw new Error(`checkout is already initialized as ${config.identity.organization}/${config.identity.module}; clone a fresh template to create another module`)
  }

  const moduleSnake = snake(moduleName)
  const sqlPrefix = namespace.replace(/\./g, '_')
  const envPrefix = sqlPrefix.toUpperCase()
  const className = `${pascal(organization)}${pascal(moduleName)}`
  const repository = `https://github.com/${githubOwner}/${moduleName}`
  const replacements = [
    ['https://github.com/acme/starter', repository],
    ['./app/starter.vue', `./app/${moduleName}.vue`],
    ['AcmeStarter', className],
    ['Acme Starter', title],
    ['ACME_STARTER', envPrefix],
    ['acme/starter', `${organization}/${moduleName}`],
    ['acme.starter', namespace],
    ['acme-starter', tag],
    ['acme_starter', sqlPrefix],
    ['starter_endpoint_access', `${moduleSnake}_endpoint_access`],
    ['starter_harness', `${moduleSnake}_harness`],
    ['starter_view', `${moduleSnake}_view`],
    ['starter-harness', `${moduleName}-harness`],
    ['starter-test-user', `${moduleName}-test-user`],
    ['starter-t-', `${moduleName}-t-`],
    ['Starter Log', `${title} Log`],
    ['title: Starter', `title: ${title}`],
    ['route_name: starter', `route_name: ${moduleName}`],
    ['organization: acme', `organization: ${organization}`],
    ['MODULE := starter', `MODULE := ${moduleName}`],
    ['module: starter', `module: ${moduleName}`],
    ['"starter.log"', `"${moduleName}.log"`],
    ['/starter', `/${route}`],
  ]
  const excludedDirectories = new Set(['.git', '.wippy', '.local', 'node_modules', 'kickside-development', 'scripts'])

  async function walk(directory) {
    const files = []
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.isDirectory() && excludedDirectories.has(item.name)) continue
      const full = resolve(directory, item.name)
      if (item.isDirectory()) files.push(...await walk(full))
      else if (item.isFile()) files.push(full)
    }
    return files
  }

  let changedFiles = 0
  for (const file of await walk(root)) {
    const info = await stat(file)
    if (info.size > 4 * 1024 * 1024) continue
    const buffer = await readFile(file)
    if (buffer.includes(0)) continue
    let content = buffer.toString('utf8')
    const before = content
    for (const [from, to] of replacements) content = content.split(from).join(to)
    if (content !== before) {
      await writeFile(file, content)
      changedFiles += 1
    }
  }

  const oldComponent = resolve(root, 'ui/src/app/starter.vue')
  const newComponent = resolve(root, `ui/src/app/${moduleName}.vue`)
  if (oldComponent !== newComponent) await rename(oldComponent, newComponent)

  config.initialized = true
  config.identity = identity
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)

  console.log(`Initialized ${organization}/${moduleName}`)
  console.log(`  namespace: ${namespace}`)
  console.log(`  web component: ${tag}`)
  console.log(`  route: /${route}`)
  console.log(`  repository: ${repository}`)
  console.log(`Updated ${changedFiles} files. Next: make verify`)
  return { identity, changedFiles, alreadyInitialized: false }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    await initialize(process.argv.slice(2))
  } catch (error) {
    console.error(`init-module: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
