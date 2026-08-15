export type BeatAccent = 'strong' | 'medium' | 'weak' | 'mute'
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing'
export type ClickSound = 'classic' | 'woodblock' | 'sticks'
export type MeterDenominator = 2 | 4 | 8 | 16

export interface Meter {
  numerator: number
  denominator: MeterDenominator
  accents: BeatAccent[]
}

export interface MetronomeSettings {
  bpm: number
  meter: Meter
  subdivision: Subdivision
  sound: ClickSound
  volume: number
  countInBars: 0 | 1 | 2 | 4
}

export interface BeatEvent {
  beatIndex: number
  subdivisionIndex: number
  accent: BeatAccent
  isMainBeat: boolean
  offsetBeats: number
}

export interface ScheduledVisualBeat extends BeatEvent {
  when: number
  barNumber: number
}

export const DEFAULT_SETTINGS: MetronomeSettings = {
  bpm: 96,
  meter: {
    numerator: 4,
    denominator: 4,
    accents: ['strong', 'weak', 'medium', 'weak'],
  },
  subdivision: 'quarter',
  sound: 'classic',
  volume: 0.75,
  countInBars: 0,
}
