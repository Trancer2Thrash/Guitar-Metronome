import { describe, expect, it, vi } from 'vitest'
import type { BeatEvent } from '../domain/metronome'
import { AudioEngine } from './AudioEngine'

class FakeBuffer {
  private readonly data: Float32Array

  constructor(length: number) {
    this.data = new Float32Array(length)
  }

  getChannelData(): Float32Array {
    return this.data
  }
}

class FakeSource {
  buffer: AudioBuffer | null = null
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class FakeGain {
  gain = { setValueAtTime: vi.fn() }
  connect = vi.fn()
}

class FakeAudioContext {
  currentTime = 1
  state: AudioContextState = 'suspended'
  sampleRate = 48_000
  destination = {} as AudioDestinationNode
  buffers: FakeBuffer[] = []
  sources: FakeSource[] = []
  gains: FakeGain[] = []
  resume = vi.fn(async () => { this.state = 'running' })
  suspend = vi.fn(async () => { this.state = 'suspended' })
  close = vi.fn(async () => { this.state = 'closed' })

  createBuffer(_channels: number, length: number): AudioBuffer {
    const buffer = new FakeBuffer(length)
    this.buffers.push(buffer)
    return buffer as unknown as AudioBuffer
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeSource()
    this.sources.push(source)
    return source as unknown as AudioBufferSourceNode
  }

  createGain(): GainNode {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain as unknown as GainNode
  }
}

const strongBeat: BeatEvent = {
  beatIndex: 0,
  subdivisionIndex: 0,
  accent: 'strong',
  isMainBeat: true,
  offsetBeats: 0,
}

describe('AudioEngine', () => {
  it('creates and resumes one context while reusing generated click buffers', async () => {
    const context = new FakeAudioContext()
    const createContext = vi.fn(() => context as unknown as AudioContext)
    const engine = new AudioEngine({ createContext })

    await engine.ensureReady()
    await engine.ensureReady()

    expect(createContext).toHaveBeenCalledTimes(1)
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(context.buffers).toHaveLength(9)
  })

  it('schedules the selected timbre at the exact audio time and can cancel it', async () => {
    const context = new FakeAudioContext()
    const engine = new AudioEngine({ createContext: () => context as unknown as AudioContext })
    await engine.ensureReady()
    engine.configure({ sound: 'woodblock', volume: 0.5 })

    const scheduled = engine.schedule(strongBeat, 2.5)

    expect(scheduled?.when).toBe(2.5)
    expect(context.sources[0]?.start).toHaveBeenCalledWith(2.5)
    expect(context.gains[0]?.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 2.5)

    engine.cancelAfter(2)
    expect(context.sources[0]?.stop).toHaveBeenCalled()
  })

  it('does not schedule muted events', async () => {
    const context = new FakeAudioContext()
    const engine = new AudioEngine({ createContext: () => context as unknown as AudioContext })
    await engine.ensureReady()

    expect(engine.schedule({ ...strongBeat, accent: 'mute' }, 2)).toBeNull()
    expect(context.sources).toHaveLength(0)
  })

  it('suspends and disposes owned browser audio resources', async () => {
    const context = new FakeAudioContext()
    const engine = new AudioEngine({ createContext: () => context as unknown as AudioContext })
    await engine.ensureReady()
    engine.schedule(strongBeat, 3)

    await engine.suspend()
    expect(context.sources[0]?.stop).toHaveBeenCalled()
    expect(context.suspend).toHaveBeenCalledTimes(1)

    await engine.dispose()
    expect(context.close).toHaveBeenCalledTimes(1)
  })
})
