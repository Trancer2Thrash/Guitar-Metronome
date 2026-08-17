import { describe, expect, it } from 'vitest'
import { DEFAULT_JAM_SESSION, buildJamEvents, resizeProgression, transposeProgression, type JamStyle } from './jamModel'

describe('jam model', () => {
  it('resizes a progression while retaining existing bars', () => {
    expect(resizeProgression(['C', 'G', 'Am', 'F'], 8)).toEqual(['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'])
    expect(resizeProgression(['C', 'G', 'Am', 'F'], 2)).toEqual(['C', 'G'])
  })

  it('transposes every chord in a progression', () => {
    expect(transposeProgression(['C', 'G7', 'Am'], 2)).toEqual(['D', 'A7', 'Bm'])
  })

  it('builds bounded timelines for every meter and style', () => {
    const styles: JamStyle[] = ['rock', 'pop', 'ballad', 'shuffle']
    const drumKinds = new Set<string>()
    styles.forEach((style) => {
      ;([3, 4] as const).forEach((meter) => {
        const session = { ...DEFAULT_JAM_SESSION, style, meter }
        const events = buildJamEvents(session)
        expect(new Set(events.map((event) => event.track))).toEqual(new Set(['drums', 'bass', 'guitar']))
        expect(events.every((event) => event.beat < meter)).toBe(true)
        expect(Math.max(...events.map((event) => event.bar))).toBe(session.bars - 1)
        events.filter((event) => event.track === 'drums').forEach((event) => drumKinds.add(event.kind))
      })
    })
    expect(drumKinds).toEqual(new Set(['kick', 'snare', 'closed-hat', 'open-hat']))
  })
})