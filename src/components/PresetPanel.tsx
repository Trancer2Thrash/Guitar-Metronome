import { useRef, useState } from 'react'
import type { MetronomeSettings } from '../domain/metronome'
import type { TrainerConfig } from '../domain/trainer'
import type { Preset } from '../storage/presetSchema'
import type { PresetStore } from '../storage/presetStore'

interface PresetPanelProps {
  store: PresetStore
  settings: MetronomeSettings
  trainer: TrainerConfig
  onLoad: (preset: Preset) => void
}

function createPresetId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function presetKindLabel(kind: Preset['kind']): string {
  if (kind === 'tempo') return '速度训练'
  if (kind === 'quiet') return '静音训练'
  return '普通节拍'
}

export function PresetPanel({ store, settings, trainer, onLoad }: PresetPanelProps) {
  const [name, setName] = useState('')
  const [presets, setPresets] = useState<Preset[]>(() => store.list())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const refresh = () => setPresets(store.list())

  const savePreset = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('请先填写预设名称。')
      return
    }

    const timestamp = new Date().toISOString()
    const kind: Preset['kind'] = trainer.mode === 'tempo' ? 'tempo' : trainer.mode === 'quiet' ? 'quiet' : 'standard'
    const preset: Preset = {
      id: createPresetId(),
      name: trimmedName,
      kind,
      createdAt: timestamp,
      updatedAt: timestamp,
      settings,
      ...(kind === 'tempo' ? { tempoProgram: trainer.tempoProgram } : {}),
      ...(kind === 'quiet' ? { quietProgram: trainer.quietProgram } : {}),
    }

    store.save(preset)
    refresh()
    setName('')
    setError(null)
    setMessage(`已保存“${trimmedName}”。`)
  }

  const removePreset = (preset: Preset) => {
    if (typeof window !== 'undefined' && !window.confirm(`删除预设“${preset.name}”？`)) return
    store.remove(preset.id)
    refresh()
    setMessage(`已删除“${preset.name}”。`)
  }

  const exportPresets = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `six-string-metronome-presets-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('预设文件已导出。')
  }

  const importPresets = async (file: File | undefined) => {
    if (!file) return
    try {
      store.importJson(await file.text())
      refresh()
      setError(null)
      setMessage('预设导入完成。')
    } catch (importError) {
      setMessage(null)
      setError(importError instanceof Error ? importError.message : '导入文件格式或数据无效。')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  return (
    <section className="preset-panel" aria-label="预设管理">
      <div className="preset-save-row">
        <label>
          预设名称
          <input
            value={name}
            maxLength={40}
            placeholder="例如：音阶热身"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') savePreset() }}
          />
        </label>
        <button className="primary-small-button" type="button" onClick={savePreset}>保存预设</button>
      </div>

      <div className="preset-file-actions">
        <label className="secondary-small-button">
          导入预设文件
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => { void importPresets(event.target.files?.[0]) }}
          />
        </label>
        <button className="secondary-small-button" type="button" onClick={exportPresets}>导出全部</button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}

      <div className="preset-list" aria-live="polite">
        {presets.length === 0 ? (
          <div className="preset-empty">
            <strong>还没有预设</strong>
            <p>保存当前节奏与训练参数，练习时可一键恢复。</p>
          </div>
        ) : presets.map((preset) => (
          <article className="preset-card" key={preset.id}>
            <div>
              <span>{presetKindLabel(preset.kind)}</span>
              <h3>{preset.name}</h3>
              <p>{preset.settings.bpm} BPM · {preset.settings.meter.numerator}/{preset.settings.meter.denominator}</p>
            </div>
            <div className="preset-card__actions">
              <button type="button" onClick={() => onLoad(preset)}>载入</button>
              <button type="button" onClick={() => removePreset(preset)}>删除</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
