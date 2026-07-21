import { execFileSync } from 'node:child_process'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let failed = false

function report(message) {
  console.error(`check-module: ${message}`)
  failed = true
}

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

async function walk(directory) {
  const out = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory() && ['.git', '.wippy', '.local', 'node_modules'].includes(item.name)) continue
    const full = resolve(directory, item.name)
    if (item.isDirectory()) out.push(...await walk(full))
    else if (item.isFile()) out.push(full)
  }
  return out
}

const config = JSON.parse(await readFile(resolve(root, '.kickside-module.json'), 'utf8'))
const identity = config.identity
const moduleManifest = await readFile(resolve(root, 'wippy.yaml'), 'utf8')
const rootIndex = await readFile(resolve(root, 'src/_index.yaml'), 'utf8')
const packageJson = JSON.parse(await readFile(resolve(root, 'ui/package.json'), 'utf8'))
const viteConfig = await readFile(resolve(root, 'ui/vite.config.ts'), 'utf8')
const styles = await readFile(resolve(root, 'ui/src/styles.css'), 'utf8')

if (!moduleManifest.includes(`organization: ${identity.organization}`)) report('wippy.yaml organization differs from template identity')
if (!moduleManifest.includes(`module: ${identity.module}`)) report('wippy.yaml module differs from template identity')
if (/^version:/m.test(moduleManifest)) report('wippy.yaml must not pin a release version; the publisher selects it')
if (!rootIndex.includes(`namespace: ${identity.namespace}`)) report('root ns.definition namespace differs from template identity')
if (!rootIndex.includes('announced: true') || !rootIndex.includes('auto_register: true')) report('view.component must be announced and auto-registered')
if (!rootIndex.includes(`tag_name: ${identity.tag}`)) report('registry web-component tag differs from template identity')
if (packageJson.wippy?.tagName !== identity.tag) report('package.json web-component tag differs from template identity')
if (typeof packageJson.wippy?.description !== 'string' || packageJson.wippy.description.length < 120) report('wippy.description must explain the module behavior and usage')
if (!viteConfig.includes('preserveEntrySignatures: false')) report('web-component build must preserve the entry ownership contract')
if (viteConfig.includes('process.env')) report('vite.config.ts must not override process.env/NODE_ENV')
if (/--p-(red|green|blue|orange|yellow|purple|pink|sky|emerald)-\d+/i.test(styles)) report('frontend uses a nonexistent color-named --p-* token')

const staticMetaPath = resolve(root, 'static/wippy-meta.json')
if (!await exists(staticMetaPath)) {
  report('static/wippy-meta.json is missing; run make build')
} else {
  const staticMeta = JSON.parse(await readFile(staticMetaPath, 'utf8'))
  if (staticMeta.name !== packageJson.name || staticMeta.wippy?.tagName !== identity.tag
      || staticMeta.wippy?.description !== packageJson.wippy.description) {
    report('static/wippy-meta.json is stale; rebuild and commit static/')
  }
}
if (!await exists(resolve(root, 'static/index.js'))) report('static/index.js is missing; run make build')

const yamlFiles = (await walk(resolve(root, 'src'))).filter((path) => /\.ya?ml$/.test(path))
for (const file of yamlFiles) {
  const lines = (await readFile(file, 'utf8')).split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*kind:\s*ns\.dependency\s*$/.test(lines[index])) continue
    const nearby = lines.slice(Math.max(0, index - 8), index + 1)
    const versionLine = [...nearby].reverse().find((line) => /^\s*(?:-\s*)?version:\s*/.test(line))
    const version = versionLine?.replace(/^\s*(?:-\s*)?version:\s*/, '').replace(/^['"]|['"]$/g, '')
    if (!version || !(version === '*' || /^(>=|<=|>|<|\^|~)/.test(version))) {
      report(`${relative(root, file)}:${index + 1} ns.dependency must declare a compatibility range, never an exact version`)
    }
  }
}

const markdownFiles = (await walk(root)).filter((path) => extname(path) === '.md')
for (const page of markdownFiles) {
  const markdown = await readFile(page, 'utf8')
  const sourceRelative = relative(root, page).split(sep).join('/')
  const lines = markdown.split('\n')
  let fenced = false
  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (/^\s*(```|~~~)/.test(lines[index])) { fenced = !fenced; continue }
    if (!fenced && /^\s*\|.*\|\s*$/.test(lines[index])
        && /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1])) {
      report(`${sourceRelative}:${index + 1} uses a pipe table unsupported by the Hub renderer`)
    }
  }
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '')
    if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    const fileTarget = target.split('#', 1)[0]
    if (!fileTarget) continue
    const resolved = resolve(dirname(page), decodeURIComponent(fileTarget))
    if (!resolved.startsWith(`${root}${sep}`) || !await exists(resolved)) report(`${sourceRelative} has a broken local link: ${target}`)
  }
}

const allFiles = await walk(root)
const secretPatterns = [
  /\b(?:gh[oprsu]_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|wpy_[A-Za-z0-9_-]{20,})\b/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
]
for (const file of allFiles) {
  const info = await stat(file)
  if (info.size > 4 * 1024 * 1024) continue
  const buffer = await readFile(file)
  if (buffer.includes(0)) continue
  const content = buffer.toString('utf8')
  if (secretPatterns.some((pattern) => pattern.test(content))) report(`${relative(root, file)} contains credential-like material`)
}

if (config.initialized) {
  const customizable = allFiles.filter((path) => !path.includes(`${sep}docs${sep}kickside-development${sep}`)
    && !path.includes(`${sep}scripts${sep}`))
  const leftovers = ['acme/starter', 'acme.starter', 'acme-starter', 'acme_starter', 'ACME_STARTER', 'AcmeStarter']
  for (const file of customizable) {
    const buffer = await readFile(file)
    if (buffer.includes(0)) continue
    const content = buffer.toString('utf8')
    for (const token of leftovers) if (content.includes(token)) report(`${relative(root, file)} retains template token ${token}`)
  }
}

try {
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim().split('\n').filter(Boolean)
  for (const path of tracked) {
    if (path === 'wippy.lock' || path.startsWith('.wippy/') || path.includes('/node_modules/')
        || path.endsWith('.wapp') || path.endsWith('.env') || path.endsWith('.map')) {
      report(`generated or sensitive file is tracked: ${path}`)
    }
  }
} catch {
  // The repository may be checked before its first git init. All other checks still run.
}

if (failed) process.exit(1)
console.log(`Module checks passed for ${identity.organization}/${identity.module}`)
