import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordAudioEngine } from './ChordAudioEngine'
import { findChord } from './chordData'

class FakeAudioParam {
  values: Array<{ value: number; when: number }> = []
  setValueAtTime(value: number, when: number) { this.values.push({ value, when }) }
  exponentialRampToValueAtTime(value: number, when: number) { this.values.push({ value, when }) }
}

class FakeNode {
  connect() { return this }
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine'
  frequency = new FakeAudioParam()
  starts: number[] = []
  stops: number[] = []
  start(when: number) { this.starts.push(when) }
  stop(when?: number) { this.stops.push(when ?? -1) }
}

class FakeGain extends FakeNode { gain = new FakeAudioParam() }
class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass'
  frequency = new FakeAudioParam()
}

class FakeAudioContext {
  state: AudioContextState = 'running'
  currentTime = 10
  destination = new FakeNode()
  oscillators: FakeOscillator[] = []
  resume: () => Promise<void> = vi.fn(async () => undefined)
  close: () => Promise<void> = vi.fn(async () => undefined)
  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createGain() { return new FakeGain() }
  createBiquadFilter() { return new FakeFilter() }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ChordAudioEngine', () => {
  it('schedules a low-to-high strum and cancels the prior preview', async () => {
    vi.useFakeTimers()
    const contexts: FakeAudioContext[] = []
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      constructor() {
        super()
        contexts.push(this)
      }
    })
    const chord = findChord('C')!
    const engine = new ChordAudioEngine()

    expect(await engine.play(chord)).toBe(true)
    const firstPreview = [...contexts[0]!.oscillators]
    expect(firstPreview.map((oscillator) => oscillator.starts[0])).toEqual([10.02, 10.065, 10.11, 10.155, 10.2])

    expect(await engine.play(chord)).toBe(true)
    firstPreview.forEach((oscillator) => expect(oscillator.stops).toHaveLength(2))
    engine.dispose()
  })

  it('does not start notes after a pending preview has been stopped', async () => {
    let resumeAudio!: () => void
    const resume = new Promise<void>((resolve) => { resumeAudio = resolve })
    const context = new FakeAudioContext()
    context.state = 'suspended'
    context.resume = vi.fn(() => resume)
    vi.stubGlobal('AudioContext', class {
      constructor() { return context }
    })
    const engine = new ChordAudioEngine()

    const pending = engine.play(findChord('Em')!)
    engine.stop()
    resumeAudio()

    await expect(pending).resolves.toBe(false)
    expect(context.oscillators).toHaveLength(0)
    engine.dispose()
  })
})
