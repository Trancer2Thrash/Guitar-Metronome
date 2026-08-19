import { describe, expect, it } from 'vitest'
import { normalizeChordName, transposeChordName, findChord } from './chordData'

describe('chord name normalization smoke', () => {
  it('normalizes sharp and flat spellings consistently', () => {
    expect(normalizeChordName('C#m')).toBe(normalizeChordName('C♯m'))
    expect(normalizeChordName('Bb')).toBe(normalizeChordName('B♭'))
    expect(findChord('C#m')?.name).toBe('C♯m')
    expect(findChord('B♭')?.id).toBe('Bb')
  })

  it('transposes while preserving accidental style', () => {
    expect(transposeChordName('A♯m', 0)).toBe('A♯m')
    expect(transposeChordName('E♭', 2)).toBe('F')
    expect(transposeChordName('B♭', 1)).toBe('B')
    expect(transposeChordName('F♯m7', 3)).toBe('Am7')
  })
})