import { useState } from 'react'
import type { QuietBars, QuietCountProgram } from '../training/quietCount'
import type { TempoProgram } from '../training/tempoTrainer'
import { validateTempoProgram } from '../training/tempoTrainer'
import type { TrainerConfig } from '../domain/trainer'

interface TrainerPanelProps {
  value: TrainerConfig
  onChange(value: TrainerConfig): void
}

function numeric(value: string, fallback = 1): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asQuietRange(value: QuietBars): { min: number; max: number } {
  if (typeof value !== 'number') return value
  return { min: value, max: Math.min(128, value + 1) }
}

export function TrainerPanel({ value, onChange }: TrainerPanelProps) {
  const [config, setConfig] = useState(value)

  const update = (next: TrainerConfig) => {
    setConfig(next)
    onChange(next)
  }
  const updateTempo = (patch: Partial<TempoProgram>) => update({
    ...config,
    tempoProgram: { ...config.tempoProgram, ...patch },
  })
  const updateQuiet = (patch: Partial<QuietCountProgram>) => update({
    ...config,
    quietProgram: { ...config.quietProgram, ...patch },
  })
  const tempoError = validateTempoProgram(config.tempoProgram)
  const direction = config.tempoProgram.targetBpm > config.tempoProgram.startBpm ? '+' : '−'
  const tempoRepetitions = config.tempoProgram.repetitions === 'infinite' ? '无限循环' : `${config.tempoProgram.repetitions} 次`
  const quietRange = asQuietRange(config.quietProgram.silentBars)
  const quietRepetitions = config.quietProgram.repetitions === 'infinite' ? '无限循环' : `${config.quietProgram.repetitions} 次`

  return (
    <div className="trainer-panel">
      <div className="segmented-control" aria-label="训练模式">
        <button type="button" aria-pressed={config.mode === 'off'} onClick={() => update({ ...config, mode: 'off' })}>普通</button>
        <button type="button" aria-pressed={config.mode === 'tempo'} onClick={() => update({ ...config, mode: 'tempo' })}>速度训练</button>
        <button type="button" aria-pressed={config.mode === 'quiet'} onClick={() => update({ ...config, mode: 'quiet' })}>Quiet Count</button>
      </div>

      {config.mode === 'off' && (
        <div className="trainer-empty">
          <strong>自由练习</strong>
          <p>保持当前 BPM 连续运行；也可设置练习时长自动停止。</p>
        </div>
      )}

      {config.mode === 'tempo' && (
        <div className="form-stack">
          <div className="field-grid field-grid--2">
            <label>起始 BPM<input aria-label="起始 BPM" type="number" min="20" max="400" value={config.tempoProgram.startBpm} onChange={(event) => updateTempo({ startBpm: numeric(event.target.value) })} /></label>
            <label>目标 BPM<input aria-label="目标 BPM" type="number" min="20" max="400" value={config.tempoProgram.targetBpm} onChange={(event) => updateTempo({ targetBpm: numeric(event.target.value) })} /></label>
            <label>每次变化<input aria-label="每次变化 BPM" type="number" min="1" max="20" value={config.tempoProgram.stepBpm} onChange={(event) => updateTempo({ stepBpm: numeric(event.target.value) })} /></label>
            <label>每几小节<input aria-label="变化间隔小节" type="number" min="1" max="128" value={config.tempoProgram.changeEveryBars} onChange={(event) => updateTempo({ changeEveryBars: numeric(event.target.value) })} /></label>
          </div>
          <label>到达目标后
            <select aria-label="目标行为" value={config.tempoProgram.targetBehavior} onChange={(event) => updateTempo({ targetBehavior: event.target.value as TempoProgram['targetBehavior'] })}>
              <option value="stop">停止</option><option value="hold">保持目标速度</option><option value="restart">回到起点</option><option value="reverse">反向往返</option>
            </select>
          </label>
          <label className="check-row">
            <input
              aria-label="速度训练无限循环"
              type="checkbox"
              checked={config.tempoProgram.repetitions === 'infinite'}
              onChange={(event) => updateTempo({ repetitions: event.target.checked ? 'infinite' : 3 })}
            />
            无限循环
          </label>
          {config.tempoProgram.repetitions !== 'infinite' && (
            <label>循环次数<input aria-label="速度训练循环次数" type="number" min="1" max="99" value={config.tempoProgram.repetitions} onChange={(event) => updateTempo({ repetitions: numeric(event.target.value) })} /></label>
          )}
          {tempoError ? <p className="form-error" role="alert">{tempoError}</p> : (
            <p className="trainer-summary">{config.tempoProgram.startBpm} → {config.tempoProgram.targetBpm} BPM，每 {config.tempoProgram.changeEveryBars} 小节 {direction}{config.tempoProgram.stepBpm}，{tempoRepetitions}</p>
          )}
        </div>
      )}

      {config.mode === 'quiet' && (
        <div className="form-stack">
          <label>静音模式
            <select
              aria-label="静音模式"
              value={typeof config.quietProgram.silentBars === 'number' ? 'fixed' : 'random'}
              onChange={(event) => updateQuiet({
                silentBars: event.target.value === 'random'
                  ? asQuietRange(config.quietProgram.silentBars)
                  : quietRange.min,
              })}
            >
              <option value="fixed">固定小节数</option>
              <option value="random">随机范围</option>
            </select>
          </label>
          <div className="field-grid field-grid--2">
            <label>有声小节<input aria-label="有声小节" type="number" min="1" max="128" value={config.quietProgram.audibleBars} onChange={(event) => updateQuiet({ audibleBars: numeric(event.target.value) })} /></label>
            {typeof config.quietProgram.silentBars === 'number' ? (
              <label>静音小节<input aria-label="静音小节" type="number" min="1" max="128" value={config.quietProgram.silentBars} onChange={(event) => updateQuiet({ silentBars: numeric(event.target.value) })} /></label>
            ) : (
              <>
                <label>最少静音<input aria-label="最少静音小节" type="number" min="1" max={quietRange.max} value={quietRange.min} onChange={(event) => {
                  const min = numeric(event.target.value)
                  updateQuiet({ silentBars: { min, max: quietRange.max } })
                }} /></label>
                <label>最多静音<input aria-label="最多静音小节" type="number" min={quietRange.min} max="128" value={quietRange.max} onChange={(event) => {
                  const max = numeric(event.target.value)
                  updateQuiet({ silentBars: { min: quietRange.min, max } })
                }} /></label>
              </>
            )}
          </div>
          <label className="check-row">
            <input
              aria-label="Quiet Count 无限循环"
              type="checkbox"
              checked={config.quietProgram.repetitions === 'infinite'}
              onChange={(event) => updateQuiet({ repetitions: event.target.checked ? 'infinite' : 3 })}
            />
            无限循环
          </label>
          {config.quietProgram.repetitions !== 'infinite' && (
            <label>循环次数<input aria-label="Quiet Count 循环次数" type="number" min="1" max="99" value={config.quietProgram.repetitions} onChange={(event) => updateQuiet({ repetitions: numeric(event.target.value) })} /></label>
          )}
          <label className="check-row"><input type="checkbox" checked={config.quietProgram.hideVisuals} onChange={(event) => updateQuiet({ hideVisuals: event.target.checked })} />静音阶段同时隐藏拍点提示</label>
          <p className="trainer-summary">{config.quietProgram.audibleBars} 小节有声 + {typeof config.quietProgram.silentBars === 'number' ? config.quietProgram.silentBars : `${quietRange.min}–${quietRange.max}`} 小节静音，{quietRepetitions}，训练内在拍感。</p>
        </div>
      )}

      <label className="session-duration">练习计时
        <select aria-label="练习时长" value={config.sessionMinutes} onChange={(event) => update({ ...config, sessionMinutes: numeric(event.target.value, 0) })}>
          <option value="0">不限时</option><option value="5">5 分钟</option><option value="10">10 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option>
        </select>
      </label>
    </div>
  )
}
