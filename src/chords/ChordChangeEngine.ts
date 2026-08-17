import { getChordChangePosition, type ChordChangeConfig } from './chordChangeModel'

export interface ChordChangeRuntime {
  beatIndex: number
  elapsedSeconds: number
  remainingSeconds: number
  completed: boolean
  currentChord: string
  nextChord: string
  beatInChord: number
  switchCount: number
}

export class ChordChangeEngine {
  private context: AudioContext | null = null
  private timer: number | null = null
  private sources = new Set<OscillatorNode>()
  private running = false
  private startTime = 0
  private nextBeat = 0
  private pausedBeat = 0
  private lastVisualBeat = -1
  private config: ChordChangeConfig | null = null
  private callback: ((runtime: ChordChangeRuntime) => void) | null = null

  get isRunning() { return this.running }

  private async ready() {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context
  }

  async start(config: ChordChangeConfig, callback: (runtime: ChordChangeRuntime) => void, fromStart = false) {
    const context = await this.ready()
    this.stopNodes()
    if (this.timer !== null) window.clearInterval(this.timer)
    if (fromStart) this.pausedBeat = 0
    this.config = config
    this.callback = callback
    this.running = true
    this.nextBeat = Math.floor(this.pausedBeat)
    this.lastVisualBeat = -1
    this.startTime = context.currentTime + 0.04 - this.pausedBeat * (60 / config.bpm)
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 25)
    return true
  }

  pause() {
    if (!this.running || !this.context || !this.config) return
    this.pausedBeat = Math.max(0, (this.context.currentTime - this.startTime) / (60 / this.config.bpm))
    this.running = false
    this.clearTimer()
    this.stopNodes()
  }

  stop(notify = true) {
    this.running = false
    this.pausedBeat = 0
    this.nextBeat = 0
    this.clearTimer()
    this.stopNodes()
    if (notify && this.config && this.callback) this.callback(this.runtimeForBeat(0, false))
  }

  async reset() {
    if (!this.config || !this.callback) return false
    const wasRunning = this.running
    this.stop(false)
    if (wasRunning) return this.start(this.config, this.callback, true)
    this.callback(this.runtimeForBeat(0, false))
    return false
  }

  dispose() {
    this.stop(false)
    void this.context?.close()
    this.context = null
  }

  private tick() {
    if (!this.running || !this.context || !this.config || !this.callback) return
    const beatDuration = 60 / this.config.bpm
    const totalBeats = Math.max(1, Math.round(this.config.durationMinutes * 60 * this.config.bpm / 60))
    while (this.startTime + this.nextBeat * beatDuration < this.context.currentTime + 0.1 && this.nextBeat < totalBeats) {
      this.click(this.startTime + this.nextBeat * beatDuration, this.nextBeat % this.config.beatsPerChord === 0)
      this.nextBeat += 1
    }
    const currentBeat = Math.max(0, Math.floor((this.context.currentTime - this.startTime) / beatDuration))
    if (currentBeat >= totalBeats) {
      const runtime = this.runtimeForBeat(totalBeats, true)
      this.running = false
      this.pausedBeat = 0
      this.clearTimer()
      this.stopNodes()
      this.callback(runtime)
      return
    }
    if (currentBeat !== this.lastVisualBeat) {
      this.lastVisualBeat = currentBeat
      this.callback(this.runtimeForBeat(currentBeat, false))
    }
  }

  private runtimeForBeat(beatIndex: number, completed: boolean): ChordChangeRuntime {
    const config = this.config!
    const elapsedSeconds = beatIndex * 60 / config.bpm
    const totalSeconds = config.durationMinutes * 60
    return {
      beatIndex,
      elapsedSeconds,
      remainingSeconds: Math.max(0, totalSeconds - elapsedSeconds),
      completed,
      ...getChordChangePosition(beatIndex, config),
    }
  }

  private click(when: number, accent: boolean) {
    const context = this.context!
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(accent ? 1180 : 760, when)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, when + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(when)
    oscillator.stop(when + 0.05)
    this.sources.add(oscillator)
    oscillator.addEventListener('ended', () => this.sources.delete(oscillator), { once: true })
  }

  private clearTimer() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private stopNodes() {
    this.sources.forEach((source) => {
      try { source.stop() } catch { /* already ended */ }
    })
    this.sources.clear()
  }
}
