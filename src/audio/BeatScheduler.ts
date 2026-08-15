import type { MetronomeSettings, ScheduledVisualBeat } from '../domain/metronome'
import { buildBarEvents, secondsPerBeat } from '../rhythm/beatSequence'
import type { SchedulerDependencies } from './audioTypes'

const DEFAULT_LOOK_AHEAD_SECONDS = 0.1
const EPSILON = 0.000_001

function rhythmShape(settings: MetronomeSettings): string {
  return `${settings.meter.numerator}/${settings.meter.denominator}:${settings.subdivision}`
}

export class BeatScheduler {
  private readonly clock: SchedulerDependencies['clock']
  private readonly sink: SchedulerDependencies['sink']
  private readonly scheduleAheadSeconds: number
  private settings: MetronomeSettings | null = null
  private events = [] as ReturnType<typeof buildBarEvents>
  private nextEventIndex = 0
  private nextEventTime = 0
  private barNumber = 1
  private playing = false
  private paused = false
  private disposed = false
  private visualEvents: ScheduledVisualBeat[] = []

  constructor({ clock, sink, scheduleAheadSeconds = DEFAULT_LOOK_AHEAD_SECONDS }: SchedulerDependencies) {
    this.clock = clock
    this.sink = sink
    this.scheduleAheadSeconds = Math.max(0.01, scheduleAheadSeconds)
  }

  get isRunning(): boolean {
    return this.playing
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  start(settings: MetronomeSettings): void {
    if (this.disposed) return
    this.settings = settings
    this.events = buildBarEvents(settings)
    this.nextEventIndex = 0
    this.nextEventTime = this.clock.now()
    this.barNumber = 1
    this.visualEvents = []
    this.playing = true
    this.paused = false
    this.tick()
  }

  updateSettings(settings: MetronomeSettings): void {
    if (this.disposed) return
    const priorShape = this.settings ? rhythmShape(this.settings) : null
    this.settings = settings
    const updatedEvents = buildBarEvents(settings)

    if (priorShape !== null && priorShape !== rhythmShape(settings)) {
      const now = this.clock.now()
      this.sink.cancelAfter(now)
      this.visualEvents = this.visualEvents.filter((event) => event.when <= now)
      this.events = updatedEvents
      this.nextEventIndex = 0
      this.nextEventTime = now
      this.barNumber += 1
      if (this.playing) this.tick()
      return
    }

    this.events = updatedEvents
    if (this.nextEventIndex >= this.events.length) this.nextEventIndex = 0
  }

  tick(): void {
    if (!this.playing || this.disposed || !this.settings || this.events.length === 0) return
    const horizon = this.clock.now() + this.scheduleAheadSeconds

    while (this.nextEventTime <= horizon + EPSILON) {
      const event = this.events[this.nextEventIndex]
      if (!event) break

      const visualEvent: ScheduledVisualBeat = {
        ...event,
        when: this.nextEventTime,
        barNumber: this.barNumber,
      }
      this.visualEvents.push(visualEvent)
      if (event.accent !== 'mute') this.sink.schedule(event, this.nextEventTime)
      this.advancePosition(event.offsetBeats)
    }
  }

  drainVisualEvents(untilTime = this.clock.now()): ScheduledVisualBeat[] {
    const ready: ScheduledVisualBeat[] = []
    const future: ScheduledVisualBeat[] = []
    this.visualEvents.forEach((event) => {
      if (event.when <= untilTime + EPSILON) ready.push(event)
      else future.push(event)
    })
    this.visualEvents = future
    return ready
  }

  pause(): void {
    if (!this.playing || this.disposed) return
    const now = this.clock.now()
    this.sink.cancelAfter(now)
    this.visualEvents = this.visualEvents.filter((event) => event.when <= now)
    this.playing = false
    this.paused = true
  }

  resume(): void {
    if (!this.paused || this.disposed || !this.settings) return
    this.nextEventTime = this.clock.now()
    this.playing = true
    this.paused = false
    this.tick()
  }

  stop(): void {
    if (this.disposed) return
    const now = this.clock.now()
    this.sink.cancelAfter(now)
    this.playing = false
    this.paused = false
    this.settings = null
    this.events = []
    this.nextEventIndex = 0
    this.nextEventTime = 0
    this.barNumber = 1
    this.visualEvents = []
  }

  dispose(): void {
    if (this.disposed) return
    const now = this.clock.now()
    this.sink.cancelAfter(now)
    this.playing = false
    this.paused = false
    this.visualEvents = []
    this.disposed = true
  }

  private advancePosition(currentOffsetBeats: number): void {
    if (!this.settings) return
    const nextIndex = this.nextEventIndex + 1
    let beatDelta: number

    if (nextIndex < this.events.length) {
      beatDelta = (this.events[nextIndex]?.offsetBeats ?? currentOffsetBeats) - currentOffsetBeats
      this.nextEventIndex = nextIndex
    } else {
      beatDelta = this.settings.meter.numerator - currentOffsetBeats
      this.nextEventIndex = 0
      this.barNumber += 1
    }

    this.nextEventTime += beatDelta * secondsPerBeat(this.settings.bpm)
  }
}
