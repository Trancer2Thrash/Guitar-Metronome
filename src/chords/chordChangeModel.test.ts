import { describe, expect, it } from 'vitest'
import { getChordChangePosition, normalizeChordChangeConfig } from './chordChangeModel'

describe('chord change training model', () => {
  it('alternates two chords after the configured beat span', () => {
    const config = normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: 80, beatsPerChord: 4, durationMinutes: 1 })
    expect(getChordChangePosition(0, config)).toMatchObject({ currentChord: 'C', nextChord: 'G', beatInChord: 0, switchCount: 0 })
    expect(getChordChangePosition(3, config)).toMatchObject({ currentChord: 'C', beatInChord: 3, switchCount: 0 })
    expect(getChordChangePosition(4, config)).toMatchObject({ currentChord: 'G', nextChord: 'C', beatInChord: 0, switchCount: 1 })
    expect(getChordChangePosition(8, config)).toMatchObject({ currentChord: 'C', switchCount: 2 })
  })

  it('clamps unsafe persisted or typed values', () => {
    expect(normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: 999, beatsPerChord: 3, durationMinutes: 8 })).toMatchObject({
      bpm: 200,
      beatsPerChord: 4,
      durationMinutes: 5,
    })
  })

  it('falls back to safe defaults for NaN inputs', () => {
    expect(normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: NaN, beatsPerChord: NaN, durationMinutes: NaN })).toEqual({
      chordA: 'C',
      chordB: 'G',
      bpm: 80,
      beatsPerChord: 4,
      durationMinutes: 1,
    })
  })
})
