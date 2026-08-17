import { describe, expect, it } from 'vitest'
import { findChord } from './chordData'
import { getChordVoicings, toPlayableChord } from './chordVoicings'

describe('chord voicings', () => {
  it('adds distinct open and movable positions for common major chords', () => {
    const chord = findChord('C')!
    const voicings = getChordVoicings(chord)
    expect(voicings.length).toBeGreaterThanOrEqual(3)
    expect(voicings[0]?.label).toBe('常用把位')
    expect(new Set(voicings.map((voicing) => voicing.frets.join(','))).size).toBe(voicings.length)
    expect(voicings.some((voicing) => voicing.label.includes('A 型'))).toBe(true)
    expect(voicings.some((voicing) => voicing.label.includes('E 型'))).toBe(true)
  })

  it('keeps generated voicings playable in standard tuning', () => {
    const chord = findChord('F♯m')!
    getChordVoicings(chord).forEach((voicing) => {
      const playable = toPlayableChord(chord, voicing)
      expect(playable.frets).toHaveLength(6)
      expect(playable.midi).toHaveLength(6)
      expect(playable.midi.some((note) => note !== null)).toBe(true)
    })
  })

  it('provides two root-string shapes for power chords', () => {
    const labels = getChordVoicings(findChord('A5')!).map((voicing) => voicing.label)
    expect(labels.some((label) => label.includes('6 弦根音'))).toBe(true)
    expect(labels.some((label) => label.includes('5 弦根音'))).toBe(true)
  })
})
