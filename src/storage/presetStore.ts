import { DEFAULT_SETTINGS, type MetronomeSettings } from '../domain/metronome'
import {
  MetronomeSettingsSchema,
  PresetExportSchema,
  PresetSchema,
  type Preset,
} from './presetSchema'

const PRESETS_KEY = 'six-string-metronome:presets:v1'
const LAST_SETTINGS_KEY = 'six-string-metronome:last-settings:v1'

function parseJson(value: string | null): unknown {
  if (value === null) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export interface PresetStore {
  list(): Preset[]
  save(preset: Preset): Preset
  remove(id: string): void
  loadLastSettings(): MetronomeSettings
  saveLastSettings(settings: MetronomeSettings): void
  exportJson(): string
  importJson(raw: string): Preset[]
}

export function createPresetStore(
  storage: Storage,
  now: () => string = () => new Date().toISOString(),
): PresetStore {
  function list(): Preset[] {
    const result = PresetSchema.array().safeParse(parseJson(storage.getItem(PRESETS_KEY)))
    return result.success ? result.data : []
  }

  function persist(presets: Preset[]): void {
    storage.setItem(PRESETS_KEY, JSON.stringify(presets))
  }

  return {
    list,
    save(preset) {
      const validPreset = PresetSchema.parse(preset)
      const presets = list()
      const existingIndex = presets.findIndex((item) => item.id === validPreset.id)
      if (existingIndex >= 0) presets[existingIndex] = validPreset
      else presets.push(validPreset)
      persist(presets)
      return validPreset
    },
    remove(id) {
      persist(list().filter((preset) => preset.id !== id))
    },
    loadLastSettings() {
      const result = MetronomeSettingsSchema.safeParse(parseJson(storage.getItem(LAST_SETTINGS_KEY)))
      return result.success ? result.data : MetronomeSettingsSchema.parse(DEFAULT_SETTINGS)
    },
    saveLastSettings(settings) {
      storage.setItem(LAST_SETTINGS_KEY, JSON.stringify(MetronomeSettingsSchema.parse(settings)))
    },
    exportJson() {
      return JSON.stringify({
        schemaVersion: 1,
        exportedAt: now(),
        presets: list(),
      }, null, 2)
    },
    importJson(raw) {
      let source: unknown
      try {
        source = JSON.parse(raw) as unknown
      } catch {
        throw new Error('导入文件不是有效的 JSON。')
      }
      const result = PresetExportSchema.safeParse(source)
      if (!result.success) throw new Error('导入文件格式或数据无效。')

      const merged = new Map(list().map((preset) => [preset.id, preset]))
      result.data.presets.forEach((preset) => merged.set(preset.id, preset))
      persist([...merged.values()])
      return result.data.presets
    },
  }
}
