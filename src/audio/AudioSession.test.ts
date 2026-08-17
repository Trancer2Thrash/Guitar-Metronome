import { describe, expect, it, vi } from 'vitest'
import { AudioSessionManager } from './AudioSession'

describe('AudioSessionManager', () => {
  it('stops the previous owner when another tool acquires playback', () => {
    const manager = new AudioSessionManager()
    const stopMetronome = vi.fn()
    const stopJam = vi.fn()
    manager.register('metronome', stopMetronome)
    manager.register('jam', stopJam)
    manager.acquire('metronome')
    manager.acquire('jam')
    expect(stopMetronome).toHaveBeenCalledOnce()
    expect(stopJam).not.toHaveBeenCalled()
    expect(manager.owner).toBe('jam')
  })

  it('releases ownership when the active tool unmounts', () => {
    const manager = new AudioSessionManager()
    const unregister = manager.register('chords', vi.fn())
    manager.acquire('chords')
    unregister()
    expect(manager.owner).toBeNull()
  })
})