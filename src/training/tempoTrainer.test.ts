import { describe, expect, it } from 'vitest'
import {
  advanceTempoStage,
  createTempoSession,
  pauseTempoSession,
  resumeTempoSession,
  validateTempoProgram,
} from './tempoTrainer'

describe('tempo trainer', () => {
  it('advances after the configured number of bars', () => {
    const session = createTempoSession({
      startBpm: 60,
      targetBpm: 64,
      stepBpm: 2,
      changeEveryBars: 2,
      targetBehavior: 'reverse',
      repetitions: 2,
    })
    expect(advanceTempoStage(session, 1).currentBpm).toBe(60)
    expect(advanceTempoStage(session, 2).currentBpm).toBe(62)
  })

  it('clamps to the target and completes stop programs', () => {
    let session = createTempoSession({
      startBpm: 60,
      targetBpm: 65,
      stepBpm: 4,
      changeEveryBars: 1,
      targetBehavior: 'stop',
      repetitions: 1,
    })
    session = advanceTempoStage(session, 1)
    expect(session.currentBpm).toBe(64)
    session = advanceTempoStage(session, 2)
    expect(session.currentBpm).toBe(65)
    expect(session.status).toBe('completed')
  })

  it('supports decreasing programs', () => {
    const session = createTempoSession({
      startBpm: 100,
      targetBpm: 90,
      stepBpm: 5,
      changeEveryBars: 1,
      targetBehavior: 'hold',
      repetitions: 1,
    })
    expect(advanceTempoStage(session, 1).currentBpm).toBe(95)
  })

  it('completes a finite reverse program after returning to the start', () => {
    let session = createTempoSession({
      startBpm: 60,
      targetBpm: 64,
      stepBpm: 2,
      changeEveryBars: 1,
      targetBehavior: 'reverse',
      repetitions: 1,
    })

    session = advanceTempoStage(session, 4)

    expect(session.currentBpm).toBe(60)
    expect(session.completedRepetitions).toBe(1)
    expect(session.status).toBe('completed')
  })

  it('restarts from the initial tempo until repetitions are complete', () => {
    let session = createTempoSession({
      startBpm: 80,
      targetBpm: 84,
      stepBpm: 2,
      changeEveryBars: 1,
      targetBehavior: 'restart',
      repetitions: 2,
    })

    session = advanceTempoStage(session, 2)
    expect(session.currentBpm).toBe(80)
    expect(session.completedRepetitions).toBe(1)
    expect(session.status).toBe('running')

    session = advanceTempoStage(session, 4)
    expect(session.currentBpm).toBe(84)
    expect(session.completedRepetitions).toBe(2)
    expect(session.status).toBe('completed')
  })

  it('does not advance while paused and restores the prior state', () => {
    const running = createTempoSession({
      startBpm: 100,
      targetBpm: 110,
      stepBpm: 5,
      changeEveryBars: 1,
      targetBehavior: 'hold',
      repetitions: 1,
    })
    const paused = pauseTempoSession(running)

    expect(advanceTempoStage(paused, 3)).toBe(paused)
    expect(resumeTempoSession(paused).status).toBe('running')
  })

  it('rejects conflicting values', () => {
    expect(validateTempoProgram({
      startBpm: 80,
      targetBpm: 80,
      stepBpm: 2,
      changeEveryBars: 4,
      targetBehavior: 'stop',
      repetitions: 1,
    })).toMatch(/不同/)
  })
})
