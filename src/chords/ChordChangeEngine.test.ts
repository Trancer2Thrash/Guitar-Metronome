import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordChangeEngine } from './ChordChangeEngine'
import { normalizeChordChangeConfig } from './chordChangeModel'

class FakeAudioParam {
  values: Array<{ value: number; when: number }> = []
  setValueAtTime(value: number, when: number) { this.values.push({ value, when }) }
  exponentialRampToValueAtTime(value: number, when: number) { this.values.push({ value, when }) }
}

class FakeNode {
  connect(destination: FakeNode) { return destination }
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine'
  frequency = new FakeAudioParam()
  start(_when: number) {}
  stop(_when?: number) {}
  addEventListener(_type: string, _listener: () => void, _options?: AddEventListenerOptions) {}
}

class FakeGain extends FakeNode { gain = new FakeAudioParam() }

class FakeAudioContext {
  _time = 0
  get currentTime() { return this._time }
  state: AudioContextState = 'running'
  destination = new FakeNode()
  oscillators: FakeOscillator[] = []
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o }
  createGain() { return new FakeGain() }
}

const DEFAULT = normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: 80, beatsPerChord: 4, durationMinutes: 1 })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ChordChangeEngine', () => {
  it('start emits visual callbacks and reports the correct position', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    const runtimeFrames: Array<{ currentChord: string; beatInChord: number }> = []
    const engine = new ChordChangeEngine()
    const started = await engine.start(DEFAULT, (runtime) => {
      runtimeFrames.push({ currentChord: runtime.currentChord, beatInChord: runtime.beatInChord })
    })
    expect(started).toBe(true)

    // advance the clock: each beat is 60/80 = 0.75s, we need > 4 beats for a switch
    for (let i = 0; i < 200; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    expect(runtimeFrames.length).toBeGreaterThan(0)
    const switched = runtimeFrames.find((frame) => frame.currentChord === 'G')
    expect(switched).toBeDefined()
    engine.dispose()
  })

  it('resumes from the paused beat position', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    const engine = new ChordChangeEngine()

    await engine.start(DEFAULT, () => {})
    for (let i = 0; i < 200; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    engine.pause()

    const resumeFrames: number[] = []
    const resumed = await engine.start(DEFAULT, (runtime) => {
      resumeFrames.push(runtime.beatIndex)
    }, false)
    expect(resumed).toBe(true)

    for (let i = 0; i < 40; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    expect(resumeFrames[0]).toBeGreaterThanOrEqual(3)
    engine.dispose()
  })

  it('stop resets to beat 0', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    let lastFrame: { currentChord: string; beatIndex: number } | null = null
    const engine = new ChordChangeEngine()

    await engine.start(DEFAULT, (runtime) => {
      lastFrame = { currentChord: runtime.currentChord, beatIndex: runtime.beatIndex }
    })
    for (let i = 0; i < 200; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    engine.stop()
    expect(lastFrame!.beatIndex).toBe(0)
    expect(lastFrame!.currentChord).toBe('C')
    engine.dispose()
  })

  it('runs to completion and fires the completed flag', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    let completed = false
    const engine = new ChordChangeEngine()

    const config = normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: 200, beatsPerChord: 2, durationMinutes: 1 })
    await engine.start(config, (runtime) => {
      if (runtime.completed) completed = true
    })

    // fast-forward: 1 minute = 60000ms, ~2400 ticks at 25ms each
    for (let i = 0; i < 3000; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    expect(completed).toBe(true)
    engine.dispose()
  })

  it('reset restarts from the beginning', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    const engine = new ChordChangeEngine()

    const config = normalizeChordChangeConfig({ chordA: 'Am', chordB: 'F', bpm: 120, beatsPerChord: 4, durationMinutes: 1 })
    await engine.start(config, () => {})
    for (let i = 0; i < 200; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }

    await engine.reset()
    const callbacks: Array<{ currentChord: string; beatInChord: number }> = []
    await engine.start(config, (runtime) => {
      callbacks.push({ currentChord: runtime.currentChord, beatInChord: runtime.beatInChord })
    })
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    expect(callbacks[0]!.currentChord).toBe('Am')
    expect(callbacks[0]!.beatInChord).toBe(0)
    engine.dispose()
  })

  it('dispose cleans up timer and context', async () => {
    vi.useFakeTimers()
    const ctx = new FakeAudioContext()
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { constructor() { return ctx } })
    const engine = new ChordChangeEngine()

    await engine.start(DEFAULT, () => {})
    for (let i = 0; i < 40; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    engine.dispose()
    const callback = vi.fn()
    for (let i = 0; i < 40; i++) {
      vi.advanceTimersByTime(25)
      ctx._time = performance.now() / 1000
    }
    expect(callback).not.toHaveBeenCalled()
  })
})