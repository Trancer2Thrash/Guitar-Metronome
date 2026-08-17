import { findChord, transposeChordName } from '../chords/chordData'

export type JamStyle = 'rock' | 'pop' | 'ballad' | 'shuffle'
export type JamTrack = 'drums' | 'bass' | 'guitar'
export type JamBars = 4 | 8 | 12
export type JamMeter = 3 | 4
export type JamCountInBars = 0 | 1 | 2
export type JamSectionId = 'A' | 'B' | 'C'
export type JamMode = 'major' | 'minor'
export type JamKey = 'C' | 'D♭' | 'D' | 'E♭' | 'E' | 'F' | 'G♭' | 'G' | 'A♭' | 'A' | 'B♭' | 'B'
export type DrumKind = 'kick' | 'snare' | 'closed-hat' | 'open-hat'
export interface TrackMix { volume: number; muted: boolean }
export interface JamSection {
  id: JamSectionId
  name: string
  bars: JamBars
  progression: string[]
  fill: boolean
}
export interface JamSession {
  bpm: number
  meter: JamMeter
  countInBars: JamCountInBars
  key: JamKey
  mode: JamMode
  sections: JamSection[]
  style: JamStyle
  mix: Record<JamTrack, TrackMix>
}
export interface JamTimelineBar {
  bar: number
  localBar: number
  sectionId: JamSectionId
  sectionIndex: number
  chord: string
  sectionEnd: boolean
  fill: boolean
}
export interface JamEvent {
  bar: number
  beat: number
  track: JamTrack
  kind: string
  chord: string
  velocity: number
}
export interface CountInCue { bar: number; beat: number; accent: boolean }
export interface ScaleRecommendation { id: string; name: string; notes: JamKey[]; use: string }

export const JAM_KEYS: JamKey[] = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
export const JAM_SECTION_META: Record<JamSectionId, string> = { A: '主段', B: '副段', C: '桥段' }

export const DEFAULT_JAM_SESSION: JamSession = {
  bpm: 96,
  meter: 4,
  countInBars: 1,
  key: 'C',
  mode: 'major',
  sections: [{ id: 'A', name: '主段', bars: 4, progression: ['C', 'G', 'Am', 'F'], fill: true }],
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

export function cloneJamSession(session: JamSession): JamSession {
  return {
    ...session,
    sections: session.sections.map((section) => ({ ...section, progression: [...section.progression] })),
    mix: {
      drums: { ...session.mix.drums },
      bass: { ...session.mix.bass },
      guitar: { ...session.mix.guitar },
    },
  }
}

export function resizeProgression(items: string[], bars: number) {
  return Array.from({ length: bars }, (_, index) => items[index % Math.max(1, items.length)] ?? 'C')
}

export function transposeProgression(items: string[], semitones: number) {
  return items.map((chord) => transposeChordName(chord, semitones))
}

export function transposeJamSession(session: JamSession, semitones: number): JamSession {
  const keyIndex = JAM_KEYS.indexOf(session.key)
  return {
    ...session,
    key: JAM_KEYS[(keyIndex + semitones % 12 + 12) % 12]!,
    sections: session.sections.map((section) => ({
      ...section,
      progression: transposeProgression(section.progression, semitones),
    })),
  }
}

export function inferJamKey(progression: string[]): JamKey {
  const root = progression[0]?.replace('♯', '#').replace('♭', 'b').match(/^([A-G](?:#|b)?)/)?.[1]
  const aliases: Record<string, JamKey> = { C: 'C', 'C#': 'D♭', Db: 'D♭', D: 'D', 'D#': 'E♭', Eb: 'E♭', E: 'E', F: 'F', 'F#': 'G♭', Gb: 'G♭', G: 'G', 'G#': 'A♭', Ab: 'A♭', A: 'A', 'A#': 'B♭', Bb: 'B♭', B: 'B' }
  return root ? aliases[root] ?? 'C' : 'C'
}

export function totalJamBars(session: JamSession) {
  return session.sections.reduce((total, section) => total + section.bars, 0)
}

export function buildJamTimeline(session: JamSession): JamTimelineBar[] {
  const timeline: JamTimelineBar[] = []
  session.sections.forEach((section, sectionIndex) => {
    resizeProgression(section.progression, section.bars).forEach((chord, localBar) => {
      timeline.push({
        bar: timeline.length,
        localBar,
        sectionId: section.id,
        sectionIndex,
        chord,
        sectionEnd: localBar === section.bars - 1,
        fill: section.fill,
      })
    })
  })
  return timeline
}

export function buildCountInCues(session: JamSession): CountInCue[] {
  return Array.from({ length: session.countInBars * session.meter }, (_, index) => ({
    bar: Math.floor(index / session.meter),
    beat: index % session.meter,
    accent: index % session.meter === 0,
  }))
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

function addSectionFill(events: JamEvent[], bar: JamTimelineBar, meter: JamMeter) {
  if (!bar.sectionEnd || !bar.fill) return
  const start = Math.max(0, meter - 1.5)
  for (let beat = start; beat < meter; beat += 0.25) {
    events.push({ bar: bar.bar, beat, track: 'drums', kind: 'snare', chord: bar.chord, velocity: beat % 1 === 0 ? 0.9 : 0.68 })
    if (beat >= meter - 0.25) events.push({ bar: bar.bar, beat, track: 'drums', kind: 'open-hat', chord: bar.chord, velocity: 0.72 })
  }
}

export function buildJamEvents(session: JamSession): JamEvent[] {
  const pattern = patterns[session.style]
  const events: JamEvent[] = []
  buildJamTimeline(session).forEach((bar) => {
    const chord = findChord(bar.chord)?.name ?? bar.chord
    pattern.drums.filter(([beat]) => beat < session.meter).forEach(([beat, kind, velocity]) => {
      events.push({ bar: bar.bar, beat, track: 'drums', kind, chord, velocity })
    })
    pattern.bass.filter((beat) => beat < session.meter).forEach((beat) => {
      events.push({ bar: bar.bar, beat, track: 'bass', kind: 'root', chord, velocity: 0.8 })
    })
    pattern.guitar.filter((beat) => beat < session.meter).forEach((beat) => {
      events.push({ bar: bar.bar, beat, track: 'guitar', kind: 'strum', chord, velocity: 0.7 })
    })
    addSectionFill(events, bar, session.meter)
  })
  return events.sort((a, b) => a.bar - b.bar || a.beat - b.beat || a.track.localeCompare(b.track))
}

const SCALE_PATTERNS: Record<string, number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
}

function scaleNotes(key: JamKey, pattern: number[]) {
  const root = JAM_KEYS.indexOf(key)
  return pattern.map((interval) => JAM_KEYS[(root + interval) % 12]!)
}

export function recommendScales(session: JamSession): ScaleRecommendation[] {
  if (session.mode === 'minor') {
    return [
      { id: 'minor-pentatonic', name: `${session.key} 小调五声音阶`, notes: scaleNotes(session.key, SCALE_PATTERNS.minorPentatonic!), use: '先用五个音建立稳定落点，适合循环即兴。' },
      { id: 'blues', name: `${session.key} Blues 音阶`, notes: scaleNotes(session.key, SCALE_PATTERNS.blues!), use: '加入降五级，适合 Rock 与 Shuffle 的经过音。' },
      { id: 'natural-minor', name: `${session.key} 自然小调`, notes: scaleNotes(session.key, SCALE_PATTERNS.naturalMinor!), use: '覆盖完整七声音阶，用于旋律与连接句。' },
    ]
  }
  return [
    { id: 'major-pentatonic', name: `${session.key} 大调五声音阶`, notes: scaleNotes(session.key, SCALE_PATTERNS.majorPentatonic!), use: '避免半音冲突，适合先建立主音与和弦音意识。' },
    { id: 'major', name: `${session.key} 大调音阶`, notes: scaleNotes(session.key, SCALE_PATTERNS.major!), use: '覆盖完整调内音，适合练习级进旋律。' },
    { id: 'mixolydian', name: `${session.key} Mixolydian`, notes: scaleNotes(session.key, SCALE_PATTERNS.mixolydian!), use: '包含降七级，可尝试在属七和弦与 Rock 律动上使用。' },
  ]
}
