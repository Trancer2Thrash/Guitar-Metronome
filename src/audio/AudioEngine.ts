import type { BeatAccent, BeatEvent, ClickSound } from '../domain/metronome'
import type { AudioClock, ClickSink, ScheduledClick } from './audioTypes'

interface AudioEngineOptions {
  createContext?: () => AudioContext
}

interface ActiveClick extends ScheduledClick {
  source: AudioBufferSourceNode
  cancelled: boolean
}

const ACCENT_GAIN: Record<Exclude<BeatAccent, 'mute'>, number> = {
  strong: 1,
  medium: 0.72,
  weak: 0.48,
}

const TIMBRES: ClickSound[] = ['classic', 'woodblock', 'sticks']
const AUDIBLE_ACCENTS: Array<Exclude<BeatAccent, 'mute'>> = ['strong', 'medium', 'weak']

function defaultContextFactory(): AudioContext {
  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) throw new Error('当前浏览器不支持 Web Audio API。')
  return new AudioContextConstructor()
}

function bufferKey(sound: ClickSound, accent: Exclude<BeatAccent, 'mute'>): string {
  return `${sound}:${accent}`
}

function synthesizeBuffer(
  context: AudioContext,
  sound: ClickSound,
  accent: Exclude<BeatAccent, 'mute'>,
): AudioBuffer {
  const accentPitch = accent === 'strong' ? 1.2 : accent === 'medium' ? 1 : 0.84
  const duration = sound === 'woodblock' ? 0.055 : sound === 'sticks' ? 0.028 : 0.04
  const length = Math.max(1, Math.round(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    const time = index / context.sampleRate
    const progress = index / length
    const envelope = Math.exp(-progress * (sound === 'woodblock' ? 7 : 11))
    let sample: number

    if (sound === 'woodblock') {
      sample = (
        Math.sin(2 * Math.PI * 780 * accentPitch * time)
        + 0.55 * Math.sin(2 * Math.PI * 1180 * accentPitch * time)
      ) * 0.52
    } else if (sound === 'sticks') {
      const noise = Math.sin(index * 12.9898) * 43_758.5453
      const centeredNoise = (noise - Math.floor(noise)) * 2 - 1
      sample = centeredNoise * 0.72 + Math.sin(2 * Math.PI * 2400 * accentPitch * time) * 0.28
    } else {
      sample = (
        Math.sin(2 * Math.PI * 1700 * accentPitch * time)
        + 0.24 * Math.sin(2 * Math.PI * 2550 * accentPitch * time)
      ) * 0.72
    }

    data[index] = Math.max(-1, Math.min(1, sample * envelope))
  }

  return buffer
}

export class AudioEngine implements AudioClock, ClickSink {
  private readonly createContext: () => AudioContext
  private context: AudioContext | null = null
  private readonly buffers = new Map<string, AudioBuffer>()
  private readonly activeClicks = new Set<ActiveClick>()
  private sound: ClickSound = 'classic'
  private volume = 0.75
  private disposed = false

  constructor({ createContext = defaultContextFactory }: AudioEngineOptions = {}) {
    this.createContext = createContext
  }

  now(): number {
    return this.context?.currentTime ?? 0
  }

  async ensureReady(): Promise<void> {
    if (this.disposed) throw new Error('音频引擎已经释放。')
    if (!this.context) {
      this.context = this.createContext()
      this.generateBuffers(this.context)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  configure({ sound, volume }: { sound: ClickSound; volume: number }): void {
    this.sound = sound
    this.volume = Math.min(1, Math.max(0, volume))
  }

  schedule(event: BeatEvent, when: number): ScheduledClick | null {
    if (!this.context || this.disposed || event.accent === 'mute') return null
    const accent = event.accent
    const buffer = this.buffers.get(bufferKey(this.sound, accent))
    if (!buffer) return null

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    source.connect(gain)
    gain.connect(this.context.destination)
    gain.gain.setValueAtTime(this.volume * ACCENT_GAIN[accent], when)

    const handle: ActiveClick = {
      when,
      source,
      cancelled: false,
      cancel: () => {
        if (handle.cancelled) return
        handle.cancelled = true
        try { source.stop() } catch { /* Source may already have ended. */ }
        this.activeClicks.delete(handle)
      },
    }
    source.onended = () => this.activeClicks.delete(handle)
    this.activeClicks.add(handle)
    source.start(when)
    return handle
  }

  cancelAfter(when: number): void {
    this.activeClicks.forEach((click) => {
      if (click.when >= when) click.cancel()
    })
  }

  stop(): void {
    this.cancelAfter(this.now())
  }

  async suspend(): Promise<void> {
    if (!this.context || this.disposed) return
    this.stop()
    if (this.context.state === 'running') await this.context.suspend()
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    if (this.context && this.context.state !== 'closed') await this.context.close()
    this.context = null
    this.buffers.clear()
    this.activeClicks.clear()
  }

  private generateBuffers(context: AudioContext): void {
    TIMBRES.forEach((sound) => {
      AUDIBLE_ACCENTS.forEach((accent) => {
        this.buffers.set(bufferKey(sound, accent), synthesizeBuffer(context, sound, accent))
      })
    })
  }
}
