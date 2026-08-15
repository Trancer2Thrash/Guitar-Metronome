import type { BeatEvent, ScheduledVisualBeat } from '../domain/metronome'

export interface AudioClock {
  now(): number
}

export interface ScheduledClick {
  when: number
  cancel(): void
}

export interface ClickSink {
  schedule(event: BeatEvent, when: number): ScheduledClick | null
  cancelAfter(when: number): void
}

export interface SchedulerDependencies {
  clock: AudioClock
  sink: ClickSink
  scheduleAheadSeconds?: number
}

export interface SchedulerPosition {
  barNumber: number
  beatIndex: number
  subdivisionIndex: number
}

export type VisualBeat = ScheduledVisualBeat
