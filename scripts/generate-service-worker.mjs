import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : '/'

async function collectFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'service-worker.js') continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await collectFiles(path.join(directory, entry.name), relative))
    else files.push(relative)
  }
  return files
}

const files = (await collectFiles(dist)).sort()
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(path.join(dist, ...file.split('/'))))
const version = hash.digest('hex').slice(0, 12)
const urls = [...new Set([basePath, ...files.map((file) => `${basePath}${file}`)])]
const indexUrl = `${basePath}index.html`

const source = `const CACHE_PREFIX = 'six-string-practice-'
const CACHE_NAME = CACHE_PREFIX + '${version}'
const INDEX_URL = ${JSON.stringify(indexUrl)}
const PRECACHE_URLS = ${JSON.stringify(urls, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response.ok ? response : Promise.reject(new Error('Navigation failed')))
        .catch(() => caches.match(INDEX_URL)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })),
  )
})
`

await writeFile(path.join(dist, 'service-worker.js'), source)
console.log(`Generated service worker ${version} with ${urls.length} precached URLs for ${basePath}`)
