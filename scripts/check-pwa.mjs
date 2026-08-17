import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const requiredFiles = [
  'service-worker.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.svg',
]
const errors = []

for (const file of requiredFiles) {
  try { await access(path.join(dist, file)) }
  catch { errors.push(`Missing dist/${file}`) }
}

try {
  const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'))
  if (manifest.display !== 'standalone') errors.push('Manifest display must be standalone')
  if (!Array.isArray(manifest.icons) || !manifest.icons.some((icon) => icon.sizes === '192x192')) errors.push('Manifest is missing a 192x192 icon')
  if (!manifest.icons?.some((icon) => icon.sizes === '512x512')) errors.push('Manifest is missing a 512x512 icon')
} catch (error) {
  errors.push(`Manifest could not be parsed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const serviceWorker = await readFile(path.join(dist, 'service-worker.js'), 'utf8')
  if (!serviceWorker.includes("type === 'SKIP_WAITING'")) errors.push('Service worker does not support explicit updates')
  if (!serviceWorker.includes('caches.open')) errors.push('Service worker does not create an offline cache')
} catch { /* missing file already reported */ }

if (errors.length) {
  console.error(`PWA build check failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('PWA build check passed (manifest, icons, offline cache and update flow present).')
}
