import type { BeatAccent, Meter } from '../domain/metronome'
import { cycleAccent, defaultAccents } from '../rhythm/meter'

const LABELS: Record<BeatAccent, string> = {
  strong: '强拍',
  medium: '次强拍',
  weak: '弱拍',
  mute: '静音拍',
}

interface AccentEditorProps {
  meter: Meter
  onAccentChange(index: number, accent: BeatAccent): void
}

export function AccentEditor({ meter, onAccentChange }: AccentEditorProps) {
  const restoreDefaults = () => {
    defaultAccents(meter).forEach((accent, index) => onAccentChange(index, accent))
  }

  return (
    <fieldset className="accent-editor">
      <legend className="accent-editor__heading">
        <span>逐拍强弱</span>
        <button type="button" onClick={restoreDefaults}>恢复推荐重音</button>
      </legend>
      <p>点击拍点循环切换：强 → 次强 → 弱 → 静音。</p>
      <div className="accent-editor__grid">
        {meter.accents.map((accent, index) => (
          <button
            key={index}
            className={`accent-chip accent-chip--${accent}`}
            type="button"
            aria-label={`第 ${index + 1} 拍：${LABELS[accent]}`}
            onClick={() => onAccentChange(index, cycleAccent(accent))}
          >
            <span>{index + 1}</span>
            <small>{LABELS[accent]}</small>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
