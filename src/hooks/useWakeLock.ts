import { useEffect, useRef, useState } from 'react'

export type WakeLockStatus = 'unsupported' | 'requesting' | 'active' | 'released'

interface WakeLockSentinelLike {
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface WakeLockNavigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>
  }
}

export function useWakeLock(active: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && Boolean((navigator as unknown as WakeLockNavigator).wakeLock)
  const [status, setStatus] = useState<WakeLockStatus>(supported ? 'released' : 'unsupported')
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    if (!supported) return
    let cancelled = false

    async function updateLock(): Promise<void> {
      if (!active) {
        const sentinel = sentinelRef.current
        sentinelRef.current = null
        if (sentinel) await sentinel.release()
        if (!cancelled) setStatus('released')
        return
      }

      setStatus('requesting')
      try {
        const sentinel = await (navigator as unknown as WakeLockNavigator).wakeLock?.request('screen')
        if (!sentinel || cancelled) {
          if (sentinel) await sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
          setStatus('released')
        })
        setStatus('active')
      } catch {
        if (!cancelled) setStatus('released')
      }
    }

    void updateLock()
    return () => {
      cancelled = true
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel) void sentinel.release()
    }
  }, [active, supported])

  return status
}
