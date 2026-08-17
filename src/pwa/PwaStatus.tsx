import { useEffect, useState } from 'react'
import { registerServiceWorker, type PwaUpdate } from './registerServiceWorker'

export function PwaStatus() {
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [update, setUpdate] = useState<PwaUpdate | null>(null)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    let dispose: () => void = () => undefined
    void registerServiceWorker({
      onUpdateReady: setUpdate,
      onError: (error) => console.warn('Service worker registration failed', error),
    }).then((cleanup) => { dispose = cleanup })

    return () => {
      dispose()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (update) {
    return (
      <aside className="pwa-notice" aria-label="应用更新">
        <div><strong>新版本已就绪</strong><span>更新后会自动恢复本地练习设置。</span></div>
        <button type="button" onClick={() => update.apply()}>立即更新</button>
      </aside>
    )
  }

  if (offline) {
    return (
      <aside className="pwa-notice pwa-notice--offline" aria-label="离线状态">
        <div><strong>当前离线</strong><span>正在使用已缓存的练习工具。</span></div>
      </aside>
    )
  }

  return null
}
