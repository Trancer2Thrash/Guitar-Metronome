import type { MetronomeSettings } from '../domain/metronome'

const SUBDIVISION_LABEL: Record<MetronomeSettings['subdivision'], string> = {
  quarter: '四分音符',
  eighth: '八分音符',
  triplet: '三连音',
  sixteenth: '十六分音符',
  swing: '摇摆八分',
}

const SOUND_LABEL: Record<MetronomeSettings['sound'], string> = {
  classic: '经典滴答',
  woodblock: '木鱼',
  sticks: '鼓棒',
}

interface QuickSettingsProps {
  settings: MetronomeSettings
  onOpen(tab: 'rhythm' | 'sound' | 'training'): void
}

export function QuickSettings({ settings, onOpen }: QuickSettingsProps) {
  return (
    <nav className="quick-settings" aria-label="快速设置">
      <button type="button" onClick={() => onOpen('rhythm')} aria-label={`拍号 ${settings.meter.numerator}/${settings.meter.denominator}`}>
        <span className="quick-settings__label">拍号</span>
        <strong>{settings.meter.numerator}/{settings.meter.denominator}</strong>
      </button>
      <button type="button" onClick={() => onOpen('rhythm')}>
        <span className="quick-settings__label">细分</span>
        <strong>{SUBDIVISION_LABEL[settings.subdivision]}</strong>
      </button>
      <button type="button" onClick={() => onOpen('sound')}>
        <span className="quick-settings__label">音色</span>
        <strong>{SOUND_LABEL[settings.sound]}</strong>
      </button>
      <button type="button" onClick={() => onOpen('training')}>
        <span className="quick-settings__label">训练</span>
        <strong>关闭</strong>
      </button>
    </nav>
  )
}
