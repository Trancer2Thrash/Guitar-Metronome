import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import type { Preset } from './presetSchema'
import { createPresetStore } from './presetStore'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const preset: Preset = {
  id: 'warmup-96',
  name: '热身 96',
  kind: 'standard',
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
  settings: DEFAULT_SETTINGS,
}

describe('preset store', () => {
  it('saves, updates, lists, and removes presets', () => {
    const storage = new MemoryStorage()
    const store = createPresetStore(storage)

    store.save(preset)
    expect(store.list()).toEqual([preset])

    store.save({ ...preset, name: '更新后的热身', updatedAt: '2026-08-15T11:00:00.000Z' })
    expect(store.list()).toHaveLength(1)
    expect(store.list()[0]?.name).toBe('更新后的热身')

    store.remove(preset.id)
    expect(store.list()).toEqual([])
  })

  it('returns default settings for missing or corrupt storage without deleting it', () => {
    const storage = new MemoryStorage()
    storage.setItem('six-string-metronome:last-settings:v1', '{broken')
    const store = createPresetStore(storage)

    expect(store.loadLastSettings()).toEqual(DEFAULT_SETTINGS)
    expect(storage.getItem('six-string-metronome:last-settings:v1')).toBe('{broken')
  })

  it('persists and restores the last valid settings', () => {
    const storage = new MemoryStorage()
    const store = createPresetStore(storage)
    const settings = { ...DEFAULT_SETTINGS, bpm: 132 }

    store.saveLastSettings(settings)

    expect(store.loadLastSettings()).toEqual(settings)
  })

  it('exports and safely imports versioned JSON', () => {
    const source = createPresetStore(new MemoryStorage(), () => '2026-08-15T12:00:00.000Z')
    source.save(preset)
    const exported = source.exportJson()

    const destination = createPresetStore(new MemoryStorage())
    expect(destination.importJson(exported)).toEqual([preset])
    expect(destination.list()).toEqual([preset])
    expect(() => destination.importJson('{"schemaVersion":99}')).toThrow(/导入/)
  })
})
