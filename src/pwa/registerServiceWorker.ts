export interface PwaUpdate {
  apply(): void
}

interface RegisterServiceWorkerOptions {
  onUpdateReady?(update: PwaUpdate): void
  onError?(error: unknown): void
}

export function getServiceWorkerUrl(baseUrl = import.meta.env.BASE_URL) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}service-worker.js`
}

export async function registerServiceWorker({ onUpdateReady, onError }: RegisterServiceWorkerOptions = {}) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return () => undefined

  let refreshing = false
  const registration = await navigator.serviceWorker.register(getServiceWorkerUrl(), {
    scope: import.meta.env.BASE_URL,
  })

  const applyWaitingWorker = () => {
    const waiting = registration.waiting
    if (!waiting) return
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }, { once: true })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  const reportWaitingWorker = () => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      onUpdateReady?.({ apply: applyWaitingWorker })
    }
  }

  const handleUpdateFound = () => {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') reportWaitingWorker()
    })
  }

  registration.addEventListener('updatefound', handleUpdateFound)
  reportWaitingWorker()
  void registration.update().catch(onError)

  return () => registration.removeEventListener('updatefound', handleUpdateFound)
}
