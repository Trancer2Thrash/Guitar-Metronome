import type { ChordDefinition } from './chordData'

export type StrumDirection = 'down' | 'up' | 'arpeggio-down' | 'arpeggio-up'

export interface StrumPattern {
  direction: StrumDirection
  /** Time between consecutive strings in seconds */
  stepSeconds: number
}

export const DEFAULT_PATTERN: StrumPattern = { direction: 'down', stepSeconds: 0.045 }

export class ChordAudioEngine {
  private context: AudioContext | null = null
  private active: OscillatorNode[] = []
  private cleanupTimer: number | null = null
  private playbackGeneration = 0

  private async ready() {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context
  }

  stop() {
    this.playbackGeneration += 1
    this.stopActiveNodes()
  }

  async play(chord: ChordDefinition, pattern: StrumPattern = DEFAULT_PATTERN): Promise<boolean> {
    this.stop()
    const generation = this.playbackGeneration
    const ctx = await this.ready()
    if (generation !== this.playbackGeneration) return false

    const now = ctx.currentTime + 0.02
    const entries = chord.midi
      .map((midi, index) => (midi === null ? null : ({ midi, index } as { midi: number; index: number })))
      .filter((item): item is { midi: number; index: number } => item !== null)

    const ordered = this.orderEntries(entries, pattern.direction)

    ordered.forEach((item, i) => {
      const start = now + i * pattern.stepSeconds
      this.playNote(ctx, item.midi, start)
    })

    this.cleanupTimer = window.setTimeout(() => {
      if (generation !== this.playbackGeneration) return
      this.active = []
      this.cleanupTimer = null
    }, 1800)
    return true
  }

  dispose() {
    this.stop()
    void this.context?.close()
    this.context = null
  }

  private orderEntries(entries: { midi: number; index: number }[], direction: StrumDirection) {
    switch (direction) {
      case 'down':
        return entries.sort((a, b) => a.index - b.index)
      case 'up':
        return entries.sort((a, b) => b.index - a.index)
      case 'arpeggio-down':
        return entries.sort((a, b) => a.midi - b.midi)
      case 'arpeggio-up':
        return entries.sort((a, b) => b.midi - a.midi)
      default:
        return entries
    }
  }

  private playNote(ctx: AudioContext, midi: number, start: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2200, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.17, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.35)
    osc.connect(filter).connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 1.4)
    this.active.push(osc)
  }

  private stopActiveNodes() {
    if (this.cleanupTimer !== null) window.clearTimeout(this.cleanupTimer)
    this.cleanupTimer = null
    this.active.forEach((node) => {
      try { node.stop() } catch { /* already ended */ }
    })
    this.active = []
  }
}
