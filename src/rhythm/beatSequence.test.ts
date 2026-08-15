import { describe, expect, it } from 'vitest'
import type { MetronomeSettings, Subdivision } from '../domain/metronome'
import { buildBarEvents } from './beatSequence'

function settingsFor(subdivision: Subdivision): MetronomeSettings {
  return {
    bpm: 96,
    meter: { numerator: 4, denominator: 4, accents: ['strong', 'weak', 'medium', 'weak'] },
    subdivision,
    sound: 'classic',
    volume: 0.75,
    countInBars: 0,
  }
}

describe('buildBarEvents', () => {
  it('builds the expected number of events per four-beat bar', () => {
    expect(buildBarEvents(settingsFor('quarter'))).toHaveLength(4)
    expect(buildBarEvents(settingsFor('eighth'))).toHaveLength(8)
    expect(buildBarEvents(settingsFor('triplet'))).toHaveLength(12)
    expect(buildBarEvents(settingsFor('sixteenth'))).toHaveLength(16)
  })

  it('uses a two-thirds placement for the off-beat swing click', () => {
    expect(buildBarEvents(settingsFor('swing')).map((event) => event.offsetBeats)).toEqual([
      0, 2 / 3, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3, 3 + 2 / 3,
    ])
  })

  it('keeps main-beat accents and gives subdivisions weak accents', () => {
    const events = buildBarEvents(settingsFor('eighth'))
    expect(events[0]).toMatchObject({ beatIndex: 0, subdivisionIndex: 0, accent: 'strong', isMainBeat: true })
    expect(events[1]).toMatchObject({ beatIndex: 0, subdivisionIndex: 1, accent: 'weak', isMainBeat: false })
    expect(events[4]).toMatchObject({ beatIndex: 2, subdivisionIndex: 0, accent: 'medium', isMainBeat: true })
  })
})
