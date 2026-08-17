import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JAM_SESSION,
  buildCountInCues,
  buildJamEvents,
  buildJamTimeline,
  recommendScales,
  resizeProgression,
  transposeJamSession,
  transposeProgression,
  type JamStyle,
} from './jamModel'

describe('jam model', () => {
  it('resizes a progression while retaining existing bars', () => {
    expect(resizeProgression(['C', 'G', 'Am', 'F'], 8)).toEqual(['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'])
    expect(resizeProgression(['C', 'G', 'Am', 'F'], 2)).toEqual(['C', 'G'])
  })

  it('transposes every chord and the declared key', () => {
    expect(transposeProgression(['C', 'G7', 'Am'], 2)).toEqual(['D', 'A7', 'Bm'])
    const moved = transposeJamSession(DEFAULT_JAM_SESSION, 2)
    expect(moved.key).toBe('D')
    expect(moved.sections[0]?.progression).toEqual(['D', 'A', 'Bm', 'G'])
  })

  it('flattens A/B/C sections in playback order', () => {
    const session = {
      ...DEFAULT_JAM_SESSION,
      sections: [
        { id: 'A' as const, name: '主段', bars: 4 as const, progression: ['C', 'G', 'Am', 'F'], fill: false },
        { id: 'B' as const, name: '副段', bars: 4 as const, progression: ['F', 'G', 'Em', 'Am'], fill: true },
      ],
    }
    const timeline = buildJamTimeline(session)
    expect(timeline).toHaveLength(8)
    expect(timeline[0]).toMatchObject({ bar: 0, localBar: 0, sectionId: 'A', chord: 'C' })
    expect(timeline[7]).toMatchObject({ bar: 7, localBar: 3, sectionId: 'B', chord: 'Am', sectionEnd: true, fill: true })
  })

  it('builds a count-in cue for every preparation beat', () => {
    const cues = buildCountInCues({ ...DEFAULT_JAM_SESSION, countInBars: 2, meter: 3 })
    expect(cues).toHaveLength(6)
    expect(cues[0]).toEqual({ bar: 0, beat: 0, accent: true })
    expect(cues[5]).toEqual({ bar: 1, beat: 2, accent: false })
  })

  it('adds a denser drum fill only to enabled section endings', () => {
    const section = { ...DEFAULT_JAM_SESSION.sections[0]!, fill: true }
    const events = buildJamEvents({ ...DEFAULT_JAM_SESSION, sections: [section] })
    const finalBarSnareBeats = events
      .filter((event) => event.track === 'drums' && event.kind === 'snare' && event.bar === 3)
      .map((event) => event.beat)
    expect(finalBarSnareBeats).toEqual(expect.arrayContaining([2.5, 3, 3.25, 3.5, 3.75]))
    expect(events.every((event) => event.bar < 4 && event.beat < DEFAULT_JAM_SESSION.meter)).toBe(true)
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
        expect(Math.max(...events.map((event) => event.bar))).toBe(3)
        events.filter((event) => event.track === 'drums').forEach((event) => drumKinds.add(event.kind))
      })
    })
    expect(drumKinds).toEqual(new Set(['kick', 'snare', 'closed-hat', 'open-hat']))
  })

  it('recommends playable scales with note lists for the selected key and mode', () => {
    const major = recommendScales({ ...DEFAULT_JAM_SESSION, key: 'C', mode: 'major' })
    const minor = recommendScales({ ...DEFAULT_JAM_SESSION, key: 'A', mode: 'minor' })
    expect(major).toHaveLength(3)
    expect(major[0]).toMatchObject({ name: 'C 大调五声音阶', notes: ['C', 'D', 'E', 'G', 'A'] })
    expect(minor[0]).toMatchObject({ name: 'A 小调五声音阶', notes: ['A', 'C', 'D', 'E', 'G'] })
  })
})
