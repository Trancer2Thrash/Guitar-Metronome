import { describe, expect, it } from 'vitest'
import { CHORDS, findChord, normalizeChordName, resolveChordMidi, transposeChordName } from './chordData'

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

  it('preserves sharp notation for sharp-key chords', () => {
    expect(findChord('C#m')?.name).toBe('C♯m')
    expect(findChord('C#m')?.notes).toEqual(['C♯', 'G♯', 'E'])
    expect(findChord('F#m')?.notes).toEqual(['F♯', 'C♯', 'A'])
    expect(findChord('F#m7')?.notes).toEqual(['F♯', 'C♯', 'E', 'A'])
  })

  it('preserves sharp notation when transposing sharp chords', () => {
    expect(transposeChordName('C♯m', 0)).toBe('C♯m')
    expect(transposeChordName('C♯m', 2)).toBe('D♯m')
    expect(transposeChordName('F♯m', 1)).toBe('Gm')
    expect(transposeChordName('F♯m7', 2)).toBe('G♯m7')
  })

  it('keeps flat notation for flat-key chords', () => {
    expect(findChord('Bb')?.notes).toEqual(['B♭', 'F', 'D'])
    expect(transposeChordName('B♭', 0)).toBe('B♭')
    expect(transposeChordName('B♭', 2)).toBe('C')
  })

  it('normalizes sharp and flat spellings consistently', () => {
    expect(normalizeChordName('C#m')).toBe(normalizeChordName('C♯m'))
    expect(normalizeChordName('B♭')).toBe('Bb')
    expect(findChord('C♯m')?.id).toBe('C#m')
    expect(findChord('B♭')?.name).toBe('B♭')
  })

  it('transposes while preserving accidental style', () => {
    expect(transposeChordName('A♯m', 0)).toBe('A♯m')
    expect(transposeChordName('E♭', 2)).toBe('F')
    expect(transposeChordName('B♭', 1)).toBe('B')
    expect(transposeChordName('F♯m7', 3)).toBe('Am7')
  })
})