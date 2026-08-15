import { describe, expect, it } from 'vitest'
import { PresetExportSchema, PresetSchema } from './presetSchema'

const validPreset = {
  id: 'warmup-96',
  name: '热身 96',
  kind: 'standard',
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
  settings: {
    bpm: 96,
    meter: {
      numerator: 4,
      denominator: 4,
      accents: ['strong', 'weak', 'medium', 'weak'],
    },
    subdivision: 'eighth',
    sound: 'classic',
    volume: 0.75,
    countInBars: 1,
  },
} as const

describe('PresetSchema', () => {
  it('accepts a valid versioned export', () => {
    expect(PresetExportSchema.safeParse({
      schemaVersion: 1,
      exportedAt: '2026-08-15T10:30:00.000Z',
      presets: [validPreset],
    }).success).toBe(true)
  })

  it('rejects tempos outside the supported range', () => {
    expect(PresetSchema.safeParse({
      ...validPreset,
      settings: { ...validPreset.settings, bpm: 9999 },
    }).success).toBe(false)
  })

  it('requires one accent value per meter beat', () => {
    expect(PresetSchema.safeParse({
      ...validPreset,
      settings: {
        ...validPreset.settings,
        meter: { ...validPreset.settings.meter, accents: ['strong'] },
      },
    }).success).toBe(false)
  })

  it('requires trainer settings for trainer presets', () => {
    expect(PresetSchema.safeParse({
      ...validPreset,
      kind: 'tempo',
    }).success).toBe(false)
  })
})
