import type { ChordDefinition } from './chordData'

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

  async play(chord: ChordDefinition): Promise<boolean> {
    this.stop()
    const generation = this.playbackGeneration
    const ctx = await this.ready()
    if (generation !== this.playbackGeneration) return false

    const now = ctx.currentTime + 0.02
    chord.midi.forEach((midi, index) => {
      if (midi === null) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      const start = now + index * 0.045
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

  private stopActiveNodes() {
    if (this.cleanupTimer !== null) window.clearTimeout(this.cleanupTimer)
    this.cleanupTimer = null
    this.active.forEach((node) => {
      try { node.stop() } catch { /* already ended */ }
    })
    this.active = []
  }
}
