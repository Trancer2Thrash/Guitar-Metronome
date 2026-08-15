import { describe, expect, it, vi } from 'vitest'
import {
  advanceQuietCount,
  createQuietCountSession,
  pauseQuietCount,
  resumeQuietCount,
} from './quietCount'

describe('Quiet Count', () => {
  it('switches phases only at bar boundaries', () => {
    const session = createQuietCountSession({
      audibleBars: 2,
      silentBars: 1,
      repetitions: 2,
      hideVisuals: true,
    })
    const silent = advanceQuietCount(session, 2)
    expect(silent.phase).toBe('silent')
    expect(advanceQuietCount(silent, 3).phase).toBe('audible')
  })

  it('chooses random silence once per silent phase', () => {
    const random = vi.fn(() => 0.9)
    const session = createQuietCountSession({
      audibleBars: 1,
      silentBars: { min: 1, max: 3 },
      repetitions: 'infinite',
      hideVisuals: true,
    }, random)
    const silent = advanceQuietCount(session, 1)
    expect(silent.currentSilentBars).toBe(3)
    advanceQuietCount(silent, 2)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('completes after the configured number of audible and silent cycles', () => {
    const session = createQuietCountSession({
      audibleBars: 1,
      silentBars: 2,
      repetitions: 2,
      hideVisuals: false,
    })

    const completed = advanceQuietCount(session, 6)

    expect(completed.phase).toBe('completed')
    expect(completed.completedRepetitions).toBe(2)
  })

  it('does not consume bars while paused', () => {
    const running = createQuietCountSession({
      audibleBars: 1,
      silentBars: 1,
      repetitions: 1,
      hideVisuals: true,
    })
    const paused = pauseQuietCount(running)

    expect(advanceQuietCount(paused, 4)).toBe(paused)
    expect(resumeQuietCount(paused).phase).toBe('audible')
  })
})
