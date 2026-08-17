import { describe, expect, it, vi } from 'vitest'
import { loadDrumSamples } from './JamAudioEngine'

const context = {
  decodeAudioData: vi.fn(async () => ({ duration: 0.1 } as AudioBuffer)),
} as unknown as AudioContext

describe('loadDrumSamples', () => {
  it('returns an empty sample bank instead of rejecting when every request fails', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }))

    await expect(loadDrumSamples(context, fetcher)).resolves.toEqual({})
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
