import { describe, expect, it } from 'vitest'
import { TapTempoTracker, calculateTapTempo } from './tapTempo'

describe('Tap Tempo', () => {
  it('calculates tempo from stable taps', () => {
    expect(calculateTapTempo([0, 500, 1000, 1500])).toBe(120)
  })

  it('starts a new series after a timeout', () => {
    expect(calculateTapTempo([0, 500, 1000, 5000])).toBeNull()
  })

  it('keeps a bounded rolling series', () => {
    const tracker = new TapTempoTracker()
    ;[0, 500, 1000, 1500, 2000, 2500, 3000, 3500].forEach((tap) => tracker.tap(tap))
    expect(tracker.value()).toBe(120)
    expect(tracker.size).toBeLessThanOrEqual(7)
  })
})
