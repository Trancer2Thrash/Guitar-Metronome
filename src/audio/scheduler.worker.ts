let timer: ReturnType<typeof setInterval> | null = null

self.addEventListener('message', (event: MessageEvent<{ type: 'start' | 'stop'; intervalMs?: number }>) => {
  if (event.data.type === 'stop') {
    if (timer !== null) clearInterval(timer)
    timer = null
    return
  }

  if (timer !== null) clearInterval(timer)
  timer = setInterval(() => {
    self.postMessage({ type: 'tick' })
  }, Math.max(10, event.data.intervalMs ?? 25))
})

export {}
