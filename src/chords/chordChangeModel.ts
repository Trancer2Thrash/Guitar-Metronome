export type ChordChangeBeats = 2 | 4 | 8
export type ChordChangeDuration = 1 | 3 | 5
export interface ChordChangeConfig {
  chordA: string
  chordB: string
  bpm: number
  beatsPerChord: ChordChangeBeats
  durationMinutes: ChordChangeDuration
}
export interface ChordChangePosition {
  currentChord: string
  nextChord: string
  beatInChord: number
  switchCount: number
}

const allowedBeats: ChordChangeBeats[] = [2, 4, 8]
const allowedDurations: ChordChangeDuration[] = [1, 3, 5]

function nearest<T extends number>(value: number, choices: T[]): T {
  return choices.reduce((best, choice) => Math.abs(choice - value) <= Math.abs(best - value) ? choice : best)
}

export function normalizeChordChangeConfig(input: Partial<Omit<ChordChangeConfig, 'beatsPerChord' | 'durationMinutes'>> & { beatsPerChord?: number; durationMinutes?: number }): ChordChangeConfig {
  return {
    chordA: input.chordA || 'C',
    chordB: input.chordB || 'G',
    bpm: Math.round(Math.min(200, Math.max(40, input.bpm ?? 80))),
    beatsPerChord: nearest(input.beatsPerChord ?? 4, allowedBeats),
    durationMinutes: nearest(input.durationMinutes ?? 1, allowedDurations),
  }
}

export function getChordChangePosition(beatIndex: number, config: ChordChangeConfig): ChordChangePosition {
  const safeBeat = Math.max(0, Math.floor(beatIndex))
  const switchCount = Math.floor(safeBeat / config.beatsPerChord)
  const useFirst = switchCount % 2 === 0
  return {
    currentChord: useFirst ? config.chordA : config.chordB,
    nextChord: useFirst ? config.chordB : config.chordA,
    beatInChord: safeBeat % config.beatsPerChord,
    switchCount,
  }
}
