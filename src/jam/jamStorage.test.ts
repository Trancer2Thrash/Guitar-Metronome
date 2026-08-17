import { describe, expect, it } from 'vitest'
import { DEFAULT_JAM_SESSION } from './jamModel'
import { loadJamSession, saveJamSession } from './jamStorage'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}

describe('jam storage', () => {
  it('round trips valid v2 sessions', () => {
    const storage = new MemoryStorage()
    saveJamSession({ ...DEFAULT_JAM_SESSION, bpm: 132, countInBars: 2 }, storage)
    expect(loadJamSession(storage)).toMatchObject({ bpm: 132, countInBars: 2 })
  })

  it('migrates the flat v1 progression without adding a surprise count-in', () => {
    const storage = new MemoryStorage()
    storage.setItem('six-string-jam-v1', JSON.stringify({
      bpm: 110,
      meter: 4,
      bars: 4,
      progression: ['D', 'A', 'Bm', 'G'],
      style: 'pop',
      mix: DEFAULT_JAM_SESSION.mix,
    }))
    const loaded = loadJamSession(storage)
    expect(loaded.countInBars).toBe(0)
    expect(loaded.key).toBe('D')
    expect(loaded.sections[0]?.progression).toEqual(['D', 'A', 'Bm', 'G'])
  })

  it('falls back safely for corrupt data and returns a fresh default', () => {
    const storage = new MemoryStorage()
    storage.setItem('six-string-jam-v2', '{"bpm":999}')
    const loaded = loadJamSession(storage)
    loaded.sections[0]!.progression[0] = 'D'
    expect(loadJamSession(new MemoryStorage())).toEqual(DEFAULT_JAM_SESSION)
  })
})
