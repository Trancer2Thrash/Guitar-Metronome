import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

const assetsDir = path.resolve('dist/assets')
const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js'))
const measurements = await Promise.all(files.map(async (file) => ({
  file,
  gzipBytes: gzipSync(await readFile(path.join(assetsDir, file))).byteLength,
})))

const kib = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`
const errors = []
const drumFiles = ['kick.wav', 'snare.wav', 'closed-hat.wav', 'open-hat.wav']
const drumSizes = await Promise.all(drumFiles.map(async (file) => (await readFile(path.resolve('dist/audio', file))).byteLength))
const drumTotal = drumSizes.reduce((total, size) => total + size, 0)
console.log(`${'drum audio'.padEnd(11)} ${`${drumFiles.length} local mono samples`.padEnd(34)} ${kib(drumTotal)}`)
if (drumTotal > 200 * 1024) errors.push(`drum samples: ${kib(drumTotal)} exceeds 200.00 KiB`)

for (const measurement of measurements) {
  const isEntry = measurement.file.startsWith('index-')
  const budget = (isEntry ? 150 : 70) * 1024
  const label = isEntry ? 'entry' : 'lazy/worker'
  console.log(`${label.padEnd(11)} ${measurement.file.padEnd(34)} ${kib(measurement.gzipBytes)}`)
  if (measurement.gzipBytes > budget) {
    errors.push(`${measurement.file}: ${kib(measurement.gzipBytes)} exceeds ${kib(budget)}`)
  }
}

if (!measurements.some(({ file }) => file.startsWith('index-'))) {
  errors.push('No index JavaScript entry was found in dist/assets')
}
if (errors.length) {
  console.error(`\nBundle budget failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('\nBundle budget passed (entry <= 150 KiB gzip; split chunks <= 70 KiB gzip; drum audio <= 200 KiB).')
}