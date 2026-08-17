import { findChord, transposeChordName } from '../chords/chordData'

export type JamStyle = 'rock' | 'pop' | 'ballad' | 'shuffle'
export type JamTrack = 'drums' | 'bass' | 'guitar'
export type JamBars = 4 | 8 | 12
export type JamMeter = 3 | 4
export type DrumKind = 'kick' | 'snare' | 'closed-hat' | 'open-hat'
export interface TrackMix { volume: number; muted: boolean }
export interface JamSession {
  bpm: number
  meter: JamMeter
  bars: JamBars
  progression: string[]
  style: JamStyle
  mix: Record<JamTrack, TrackMix>
}
export interface JamEvent {
  bar: number
  beat: number
  track: JamTrack
  kind: string
  chord: string
  velocity: number
}

export const DEFAULT_JAM_SESSION: JamSession = {
  bpm: 96,
  meter: 4,
  bars: 4,
  progression: ['C', 'G', 'Am', 'F'],
  style: 'rock',
  mix: {
    drums: { volume: 0.78, muted: false },
    bass: { volume: 0.68, muted: false },
    guitar: { volume: 0.56, muted: false },
  },
}

export const JAM_PRESETS: Record<string, string[]> = {
  'I–V–vi–IV': ['C', 'G', 'Am', 'F'],
  'vi–IV–I–V': ['Am', 'F', 'C', 'G'],
  'ii–V–I': ['Dm', 'G7', 'C', 'C'],
  'I–vi–IV–V': ['C', 'Am', 'F', 'G'],
  '12-Bar Blues': ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'],
}

export function resizeProgression(items: string[], bars: number) {
  return Array.from({ length: bars }, (_, index) => items[index % items.length] ?? 'C')
}
export function transposeProgression(items: string[], semitones: number) {
  return items.map((chord) => transposeChordName(chord, semitones))
}

interface StylePattern {
  drums: Array<[number, DrumKind, number]>
  bass: number[]
  guitar: number[]
}
const patterns: Record<JamStyle, StylePattern> = {
  rock: {
    drums: [[0, 'kick', 1], [0.5, 'closed-hat', 0.45], [1, 'snare', 0.9], [1.5, 'closed-hat', 0.45], [2, 'kick', 0.82], [2.5, 'closed-hat', 0.45], [3, 'snare', 0.92], [3.5, 'open-hat', 0.42]],
    bass: [0, 2], guitar: [0, 1.5, 2, 3.5],
  },
  pop: {
    drums: [[0, 'kick', 0.9], [0.5, 'closed-hat', 0.38], [1, 'snare', 0.78], [1.5, 'closed-hat', 0.38], [2, 'kick', 0.7], [2.5, 'closed-hat', 0.38], [3, 'snare', 0.8], [3.5, 'open-hat', 0.35]],
    bass: [0, 2.5], guitar: [0.5, 1.5, 2.5, 3.5],
  },
  ballad: {
    drums: [[0, 'kick', 0.65], [1, 'closed-hat', 0.25], [2, 'snare', 0.55], [3, 'open-hat', 0.25]],
    bass: [0, 2], guitar: [0, 2],
  },
  shuffle: {
    drums: [[0, 'kick', 0.9], [0.66, 'closed-hat', 0.4], [1, 'snare', 0.82], [1.66, 'closed-hat', 0.4], [2, 'kick', 0.75], [2.66, 'closed-hat', 0.4], [3, 'snare', 0.84], [3.66, 'open-hat', 0.38]],
    bass: [0, 1.33, 2.66], guitar: [0, 1.33, 2.66],
  },
}

export function buildJamEvents(session: JamSession): JamEvent[] {
  const pattern = patterns[session.style]
  const events: JamEvent[] = []
  session.progression.slice(0, session.bars).forEach((name, bar) => {
    const chord = findChord(name)?.name ?? name
    pattern.drums.filter(([beat]) => beat < session.meter).forEach(([beat, kind, velocity]) => {
      events.push({ bar, beat, track: 'drums', kind, chord, velocity })
    })
    pattern.bass.filter((beat) => beat < session.meter).forEach((beat) => {
      events.push({ bar, beat, track: 'bass', kind: 'root', chord, velocity: 0.8 })
    })
    pattern.guitar.filter((beat) => beat < session.meter).forEach((beat) => {
      events.push({ bar, beat, track: 'guitar', kind: 'strum', chord, velocity: 0.7 })
    })
  })
  return events.sort((a, b) => a.bar - b.bar || a.beat - b.beat)
}