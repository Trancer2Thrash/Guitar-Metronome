import { act, renderHook } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import type { MetronomeEngine } from './useMetronome'
import { useMetronome } from './useMetronome'

function fakeEngine(): MetronomeEngine {
  return {
    start: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    pause: vi.fn(async () => undefined),
    stop: vi.fn(),
    updateSettings: vi.fn(),
    drainVisualEvents: vi.fn(() => []),
    now: vi.fn(() => 0),
    dispose: vi.fn(async () => undefined),
  }
}

describe('useMetronome', () => {
  it('starts from a stopped runtime and controls the injected engine', async () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }))

    expect(result.current.runtime.status).toBe('stopped')

    await act(async () => { await result.current.actions.play() })
    expect(engine.start).toHaveBeenCalledWith(DEFAULT_SETTINGS)
    expect(result.current.runtime.status).toBe('playing')

    await act(async () => { await result.current.actions.pause() })
    expect(engine.pause).toHaveBeenCalledTimes(1)
    expect(result.current.runtime.status).toBe('paused')
  })

  it('updates BPM immediately in state and in the running engine', () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }))

    act(() => result.current.actions.setBpm(128))

    expect(result.current.settings.bpm).toBe(128)
    expect(engine.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ bpm: 128 }))
  })

  it('cycles accents and normalizes the meter length', () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }))

    act(() => result.current.actions.cycleAccent(1))
    expect(result.current.settings.meter.accents[1]).toBe('mute')

    act(() => result.current.actions.setMeter(3, 4))
    expect(result.current.settings.meter.accents).toHaveLength(3)
  })
  it('does not dispose the browser engine during StrictMode effect replay', async () => {
    let disposed = false
    const engine = fakeEngine()
    vi.mocked(engine.dispose).mockImplementation(async () => { disposed = true })
    vi.mocked(engine.start).mockImplementation(async () => {
      if (disposed) throw new Error('音频引擎已经释放。')
    })
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }), { wrapper })

    await act(async () => { await result.current.actions.play() })

    expect(result.current.runtime.status).toBe('playing')
    expect(result.current.runtime.error).toBeNull()
  })
})

  it('starts tempo training from the configured start BPM', async () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }))

    act(() => result.current.actions.setTrainerConfig({
      ...result.current.trainer,
      mode: 'tempo',
      tempoProgram: { ...result.current.trainer.tempoProgram, startBpm: 72, targetBpm: 90 },
    }))
    await act(async () => { await result.current.actions.play() })

    expect(engine.start).toHaveBeenCalledWith(expect.objectContaining({ bpm: 72 }))
    expect(result.current.settings.bpm).toBe(72)
    expect(result.current.phaseLabel).toContain('速度训练')
  })

  it('loads all settings from a preset through one controller action', () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useMetronome({ engineFactory: () => engine }))
    const loaded = { ...DEFAULT_SETTINGS, bpm: 144, subdivision: 'eighth' as const }

    act(() => result.current.actions.loadSettings(loaded))

    expect(result.current.settings).toEqual(loaded)
    expect(engine.updateSettings).toHaveBeenLastCalledWith(loaded)
  })
