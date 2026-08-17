import { describe, expect, it } from 'vitest'
import { getServiceWorkerUrl } from './registerServiceWorker'

describe('getServiceWorkerUrl', () => {
  it('keeps the GitHub Pages repository base path', () => {
    expect(getServiceWorkerUrl('/Guitar-Metronome/')).toBe('/Guitar-Metronome/service-worker.js')
  })

  it('normalizes a base path without a trailing slash', () => {
    expect(getServiceWorkerUrl('/preview')).toBe('/preview/service-worker.js')
  })
})
