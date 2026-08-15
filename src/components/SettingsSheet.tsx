import type { ReactNode } from 'react'
import type { BeatAccent, ClickSound, MeterDenominator, MetronomeSettings, Subdivision } from '../domain/metronome'
import { AccentEditor } from './AccentEditor'

export type SettingsTab = 'rhythm' | 'sound' | 'training' | 'timer' | 'presets'

interface SettingsSheetProps {
  open: boolean
  activeTab: SettingsTab
  settings: MetronomeSettings
  onClose(): void
  onTabChange(tab: SettingsTab): void
  onMeterChange(numerator: number, denominator: MeterDenominator): void
  onSubdivisionChange(subdivision: Subdivision): void
  onAccentChange(index: number, accent: BeatAccent): void
  onSoundChange(sound: ClickSound): void
  onVolumeChange(volume: number): void
  onCountInChange(value: MetronomeSettings['countInBars']): void
  trainerContent?: ReactNode
  presetContent?: ReactNode
}

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'rhythm', label: '节奏' },
  { id: 'sound', label: '声音' },
  { id: 'training', label: '训练' },
  { id: 'timer', label: '计时' },
  { id: 'presets', label: '预设' },
]

export function SettingsSheet(props: SettingsSheetProps) {
  if (!props.open) return null
  const { settings } = props

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-label="节拍器设置">
        <header className="settings-sheet__header">
          <div><span>CONTROL ROOM</span><h2>节拍器设置</h2></div>
          <button className="sheet-close" type="button" aria-label="关闭设置" onClick={props.onClose}>×</button>
        </header>
        <div className="settings-sheet__body">
          <nav className="settings-tabs" aria-label="设置分类">
            {TABS.map((tab) => <button key={tab.id} type="button" aria-current={props.activeTab === tab.id ? 'page' : undefined} onClick={() => props.onTabChange(tab.id)}>{tab.label}</button>)}
          </nav>
          <div className="settings-content">
            {props.activeTab === 'rhythm' && (
              <div className="form-stack">
                <div className="field-grid field-grid--2">
                  <label>拍号分子
                    <select aria-label="拍号分子" value={settings.meter.numerator} onChange={(event) => props.onMeterChange(Number(event.target.value), settings.meter.denominator)}>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>拍号分母
                    <select aria-label="拍号分母" value={settings.meter.denominator} onChange={(event) => props.onMeterChange(settings.meter.numerator, Number(event.target.value) as MeterDenominator)}>
                      {[2, 4, 8, 16].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>
                <label>拍内细分
                  <select aria-label="拍内细分" value={settings.subdivision} onChange={(event) => props.onSubdivisionChange(event.target.value as Subdivision)}>
                    <option value="quarter">四分音符</option><option value="eighth">八分音符</option><option value="triplet">三连音</option><option value="sixteenth">十六分音符</option><option value="swing">摇摆八分</option>
                  </select>
                </label>
                <AccentEditor meter={settings.meter} onAccentChange={props.onAccentChange} />
              </div>
            )}

            {props.activeTab === 'sound' && (
              <div className="form-stack">
                <label>点击音色
                  <select aria-label="点击音色" value={settings.sound} onChange={(event) => props.onSoundChange(event.target.value as ClickSound)}>
                    <option value="classic">经典滴答</option><option value="woodblock">木鱼</option><option value="sticks">鼓棒</option>
                  </select>
                </label>
                <label>音量 <output>{Math.round(settings.volume * 100)}%</output>
                  <input aria-label="音量" type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(event) => props.onVolumeChange(event.target.valueAsNumber)} />
                </label>
              </div>
            )}

            {props.activeTab === 'training' && (props.trainerContent ?? <p>训练设置尚未载入。</p>)}
            {props.activeTab === 'timer' && (
              <div className="form-stack">
                <label>预备拍小节
                  <select aria-label="预备拍小节" value={settings.countInBars} onChange={(event) => props.onCountInChange(Number(event.target.value) as MetronomeSettings['countInBars'])}>
                    <option value="0">关闭</option><option value="1">1 小节</option><option value="2">2 小节</option><option value="4">4 小节</option>
                  </select>
                </label>
                <p className="settings-note">计时在预备拍结束后开始；暂停和页面隐藏时不会继续累计。</p>
              </div>
            )}
            {props.activeTab === 'presets' && (props.presetContent ?? <p>预设面板尚未载入。</p>)}
          </div>
        </div>
      </section>
    </div>
  )
}
