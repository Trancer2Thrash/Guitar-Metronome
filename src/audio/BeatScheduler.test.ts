import { describe, expect, it, vi } from 'vitest'
import type { BeatEvent, MetronomeSettings } from '../domain/metronome'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import { BeatScheduler } from './BeatScheduler'
import type { AudioClock, ClickSink, ScheduledClick } from './audioTypes'

class FakeClock implements AudioClock {
  current = 0
  now(): number { return this.current }
}

class FakeSink implements ClickSink {
  scheduled: Array<{ event: BeatEvent; when: number }> = []
  cancelAfter = vi.fn()

  schedule(event: BeatEvent, when: number): ScheduledClick | null {
    this.scheduled.push({ event, when })
    return { when, cancel: vi.fn() }
  }
}

function createHarness(settings: MetronomeSettings = DEFAULT_SETTINGS, ahead = 0.1) {
  const clock = new FakeClock()
  const sink = new FakeSink()
  const scheduler = new BeatScheduler({ clock, sink, scheduleAheadSeconds: ahead })
  scheduler.start(settings)
  return { clock, sink, scheduler }
}

describe('BeatScheduler', () => {
  it('fills the look-ahead window without scheduling duplicates', () => {
    const { clock, sink, scheduler } = createHarness({ ...DEFAULT_SETTINGS, bpm: 120 })
    expect(sink.scheduled.map((item) => item.when)).toEqual([0])

    clock.current = 0.45
    scheduler.tick()
    scheduler.tick()

    expect(sink.scheduled.map((item) => item.when)).toEqual([0, 0.5])
  })

  it('uses subdivision offsets for scheduled timing', () => {
    const { sink } = createHarness({ ...DEFAULT_SETTINGS, bpm: 60, subdivision: 'eighth' }, 0.6)
    expect(sink.scheduled.map((item) => item.when)).toEqual([0, 0.5])
  })

  it('keeps muted beats in the visual queue but skips audio output', () => {
    const settings: MetronomeSettings = {
      ...DEFAULT_SETTINGS,
      meter: { numerator: 2, denominator: 4, accents: ['strong', 'mute'] },
    }
    const { clock, sink, scheduler } = createHarness(settings)
    clock.current = 0.95
    scheduler.tick()

    expect(sink.scheduled).toHaveLength(1)
    expect(scheduler.drainVisualEvents(1).map((event) => event.accent)).toEqual(['strong', 'mute'])
  })

  it('applies a BPM change to intervals that have not been scheduled yet', () => {
    const { clock, sink, scheduler } = createHarness({ ...DEFAULT_SETTINGS, bpm: 120 })
    scheduler.updateSettings({ ...DEFAULT_SETTINGS, bpm: 60 })

    clock.current = 0.45
    scheduler.tick()
    clock.current = 1.45
    scheduler.tick()

    expect(sink.scheduled.map((item) => item.when)).toEqual([0, 0.5, 1.5])
  })

  it('pauses, resumes from the current clock, and resets on stop', () => {
    const { clock, sink, scheduler } = createHarness({ ...DEFAULT_SETTINGS, bpm: 120 })
    clock.current = 0.2
    scheduler.pause()
    clock.current = 1
    scheduler.tick()
    expect(sink.scheduled).toHaveLength(1)
    expect(sink.cancelAfter).toHaveBeenCalledWith(0.2)

    scheduler.resume()
    expect(sink.scheduled.at(-1)?.when).toBe(1)

    scheduler.stop()
    clock.current = 2
    scheduler.start({ ...DEFAULT_SETTINGS, bpm: 120 })
    expect(sink.scheduled.at(-1)).toMatchObject({ when: 2, event: { beatIndex: 0 } })
  })

  it('resets scheduled progress to beat one and cancels stale audio', () => {
    const { clock, sink, scheduler } = createHarness({ ...DEFAULT_SETTINGS, bpm: 120 })
    clock.current = 1.1
    scheduler.tick()

    scheduler.reset(DEFAULT_SETTINGS, true)

    expect(sink.cancelAfter).toHaveBeenLastCalledWith(1.1)
    expect(sink.scheduled.at(-1)).toMatchObject({ when: 1.1, event: { beatIndex: 0 } })
    expect(scheduler.drainVisualEvents(1.1).at(-1)?.barNumber).toBe(1)
  })
  it('cancels future audio and becomes inert when disposed', () => {
    const { clock, sink, scheduler } = createHarness()
    clock.current = 0.05
    scheduler.dispose()
    scheduler.tick()

    expect(sink.cancelAfter).toHaveBeenCalledWith(0.05)
    expect(scheduler.isDisposed).toBe(true)
  })
})
