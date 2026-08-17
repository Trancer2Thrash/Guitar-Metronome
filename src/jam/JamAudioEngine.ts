import { resolveChordMidi } from '../chords/chordData'
import { buildJamEvents, type DrumKind, type JamEvent, type JamSession } from './jamModel'

interface Position { bar: number; beat: number }
const SAMPLE_FILES: Record<DrumKind, string> = {
  kick: 'kick.wav',
  snare: 'snare.wav',
  'closed-hat': 'closed-hat.wav',
  'open-hat': 'open-hat.wav',
}

export class JamAudioEngine {
  private context: AudioContext | null = null
  private timer: number | null = null
  private visual: number | null = null
  private sources = new Set<AudioScheduledSourceNode>()
  private running = false
  private startTime = 0
  private pausedBeat = 0
  private session: JamSession | null = null
  private events: JamEvent[] = []
  private eventIndex = 0
  private eventCycle = 0
  private onPosition: ((position: Position) => void) | null = null
  private samples: Record<DrumKind, AudioBuffer> | null = null
  private samplePromise: Promise<Record<DrumKind, AudioBuffer>> | null = null
  private playbackGeneration = 0

  private async ready() {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    if (!this.samples) {
      this.samplePromise ??= this.loadSamples(this.context)
      this.samples = await this.samplePromise
    }
    return this.context
  }

  get isRunning() { return this.running }

  async start(session: JamSession, onPosition: (position: Position) => void, fromBeat = this.pausedBeat): Promise<boolean> {
    const generation = ++this.playbackGeneration
    this.running = false
    this.clearTimers()
    this.stopNodes()
    const context = await this.ready()
    if (generation !== this.playbackGeneration) return false
    this.session = session
    this.events = buildJamEvents(session)
    this.onPosition = onPosition
    this.running = true
    const totalBeats = session.bars * session.meter
    this.pausedBeat = ((fromBeat % totalBeats) + totalBeats) % totalBeats
    const beatDuration = 60 / session.bpm
    this.startTime = context.currentTime - this.pausedBeat * beatDuration
    this.eventIndex = this.events.findIndex((event) => event.bar * session.meter + event.beat >= this.pausedBeat)
    if (this.eventIndex < 0) {
      this.eventIndex = 0
      this.eventCycle = 1
    } else {
      this.eventCycle = 0
    }
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 25)
    this.visual = window.setInterval(() => this.updateVisual(), 30)
    return true
  }

  pause() {
    if (!this.running || !this.context || !this.session) return
    this.playbackGeneration += 1
    const beatDuration = 60 / this.session.bpm
    this.pausedBeat = ((this.context.currentTime - this.startTime) / beatDuration) % (this.session.bars * this.session.meter)
    this.running = false
    this.clearTimers()
    this.stopNodes()
  }

  stop() {
    this.playbackGeneration += 1
    this.running = false
    this.pausedBeat = 0
    this.clearTimers()
    this.stopNodes()
    this.onPosition?.({ bar: 0, beat: 0 })
  }

  async reset(): Promise<boolean> {
    const session = this.session
    const callback = this.onPosition
    this.stop()
    if (session && callback) return this.start(session, callback, 0)
    return false
  }

  dispose() {
    this.stop()
    void this.context?.close()
    this.context = null
    this.samples = null
    this.samplePromise = null
  }

  private tick() {
    if (!this.running || !this.context || !this.session || this.events.length === 0) return
    const beatDuration = 60 / this.session.bpm
    const totalBeats = this.session.bars * this.session.meter
    while (true) {
      const event = this.events[this.eventIndex]!
      const eventBeat = event.bar * this.session.meter + event.beat + this.eventCycle * totalBeats
      const when = this.startTime + eventBeat * beatDuration
      if (when >= this.context.currentTime + 0.12) break
      if (when >= this.context.currentTime - 0.02) this.schedule(event, when, beatDuration)
      this.eventIndex += 1
      if (this.eventIndex >= this.events.length) {
        this.eventIndex = 0
        this.eventCycle += 1
      }
    }
  }

  private updateVisual() {
    if (!this.running || !this.context || !this.session) return
    const total = this.session.bars * this.session.meter
    const beatDuration = 60 / this.session.bpm
    const position = (((this.context.currentTime - this.startTime) / beatDuration) % total + total) % total
    this.onPosition?.({ bar: Math.floor(position / this.session.meter), beat: Math.floor(position % this.session.meter) })
  }

  private schedule(event: JamEvent, when: number, beatDuration: number) {
    if (!this.session) return
    const mix = this.session.mix[event.track]
    if (mix.muted || mix.volume <= 0) return
    if (event.track === 'drums') this.drum(event.kind as DrumKind, when, event.velocity * mix.volume)
    else if (event.track === 'bass') this.bass(event.chord, when, 0.42 * beatDuration, mix.volume)
    else this.guitar(event.chord, when, 0.75 * beatDuration, mix.volume)
  }

  private drum(kind: DrumKind, when: number, volume: number) {
    const context = this.context!
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = this.samples![kind]
    gain.gain.setValueAtTime(volume * (kind === 'kick' ? 0.8 : kind === 'snare' ? 0.58 : 0.42), when)
    source.connect(gain).connect(context.destination)
    source.start(when)
    this.track(source)
  }

  private bass(name: string, when: number, duration: number, volume: number) {
    const context = this.context!
    const midi = resolveChordMidi(name)[0]
    if (midi === undefined) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 440 * 2 ** (((midi - 12) - 69) / 12)
    gain.gain.setValueAtTime(0.001, when)
    gain.gain.exponentialRampToValueAtTime(0.3 * volume, when + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(when)
    oscillator.stop(when + duration + 0.02)
    this.track(oscillator)
  }

  private guitar(name: string, when: number, duration: number, volume: number) {
    const context = this.context!
    resolveChordMidi(name).forEach((midi, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()
      const start = when + index * 0.018
      oscillator.type = 'triangle'
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12)
      filter.type = 'lowpass'
      filter.frequency.value = 1800
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.07 * volume, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(filter).connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
      this.track(oscillator)
    })
  }

  private async loadSamples(context: AudioContext) {
    const entries = await Promise.all((Object.entries(SAMPLE_FILES) as Array<[DrumKind, string]>).map(async ([kind, file]) => {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${file}`)
      if (!response.ok) throw new Error(`Unable to load drum sample: ${file}`)
      return [kind, await context.decodeAudioData(await response.arrayBuffer())] as const
    }))
    return Object.fromEntries(entries) as Record<DrumKind, AudioBuffer>
  }

  private track(source: AudioScheduledSourceNode) {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
  }

  private clearTimers() {
    if (this.timer !== null) clearInterval(this.timer)
    if (this.visual !== null) clearInterval(this.visual)
    this.timer = null
    this.visual = null
  }

  private stopNodes() {
    this.sources.forEach((source) => {
      try { source.stop() } catch { /* already ended */ }
    })
    this.sources.clear()
  }
}