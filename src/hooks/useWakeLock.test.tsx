import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

const release = vi.fn(async () => undefined)
const request = vi.fn(async () => ({ release, addEventListener: vi.fn() }))

afterEach(() => {
  vi.restoreAllMocks()
  release.mockClear()
  request.mockClear()
})

describe('useWakeLock', () => {
  it('reports unsupported browsers', () => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
    const { result } = renderHook(() => useWakeLock(true))
    expect(result.current).toBe('unsupported')
  })

  it('requests while active and releases when playback pauses', async () => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
    const { result, rerender, unmount } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    })

    await waitFor(() => expect(result.current).toBe('active'))
    expect(request).toHaveBeenCalledWith('screen')

    await act(async () => { rerender({ active: false }) })
    await waitFor(() => expect(result.current).toBe('released'))
    expect(release).toHaveBeenCalledTimes(1)

    unmount()
  })
})
