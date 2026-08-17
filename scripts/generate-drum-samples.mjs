import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sampleRate = 16000
let randomState = 0x6d2b79f5
const random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
  return randomState / 0x100000000 * 2 - 1
}

function wav(duration, synth) {
  const frames = Math.round(duration * sampleRate)
  const buffer = Buffer.alloc(44 + frames * 2)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + frames * 2, 4); buffer.write('WAVE', 8)
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(frames * 2, 40)
  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame / sampleRate
    const value = Math.max(-1, Math.min(1, synth(t, duration)))
    buffer.writeInt16LE(Math.round(value * 32767), 44 + frame * 2)
  }
  return buffer
}

const samples = {
  'kick.wav': wav(0.26, (t) => Math.sin(2 * Math.PI * (130 * t - 165 * t * t)) * Math.exp(-18 * t)),
  'snare.wav': wav(0.18, (t) => (random() * 0.78 + Math.sin(2 * Math.PI * 185 * t) * 0.22) * Math.exp(-24 * t)),
  'closed-hat.wav': wav(0.07, (t) => random() * Math.sin(2 * Math.PI * 6200 * t) * Math.exp(-58 * t)),
  'open-hat.wav': wav(0.24, (t) => random() * Math.sin(2 * Math.PI * 5700 * t) * Math.exp(-15 * t)),
}
const output = path.resolve('public/audio')
await mkdir(output, { recursive: true })
await Promise.all(Object.entries(samples).map(([name, data]) => writeFile(path.join(output, name), data)))
console.log(`Generated ${Object.keys(samples).length} mono drum samples in ${output}`)