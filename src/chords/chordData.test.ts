import { describe, expect, it } from 'vitest'
import { CHORDS, findChord, resolveChordMidi, transposeChordName } from './chordData'

describe('chord catalog', () => {
  it('contains 51 playable standard-tuning voicings', () => {
    expect(CHORDS).toHaveLength(51)
    CHORDS.forEach((chord) => {
      expect(chord.frets).toHaveLength(6)
      expect(chord.midi).toHaveLength(6)
      expect(chord.notes.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('finds aliases and transposes chord names', () => {
    expect(findChord('Bb')?.name).toBe('B♭')
    expect(transposeChordName('Am', 2)).toBe('Bm')
    expect(transposeChordName('G7', 1)).toBe('A♭7')
    expect(resolveChordMidi('D♭')).toEqual([49, 53, 56, 61])
    expect(resolveChordMidi('A♭m7')).toEqual([44, 47, 51, 54, 56])
  })
})
