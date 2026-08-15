import type { CSSProperties } from 'react'
import type { BeatAccent, Meter } from '../domain/metronome'

const ACCENT_LABEL: Record<BeatAccent, string> = {
  strong: '强拍',
  medium: '次强拍',
  weak: '弱拍',
  mute: '静音拍',
}

interface StringPulseProps {
  meter: Meter
  activeBeat: number
  hideVisuals: boolean
  compact?: boolean
}

export function StringPulse({ meter, activeBeat, hideVisuals, compact = false }: StringPulseProps) {
  return (
    <div
      className={`string-pulse${hideVisuals ? ' string-pulse--hidden' : ''}${compact ? ' string-pulse--compact' : ''}`}
      role="img"
      aria-label={`${meter.numerator}/${meter.denominator} 拍号的六弦拍点显示`}
      style={{ '--beat-count': meter.numerator } as CSSProperties}
    >
      <div className="string-pulse__strings" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="string-pulse__string" key={index} />
        ))}
      </div>
      <div className="string-pulse__beats">
        {meter.accents.map((accent, index) => {
          const active = !hideVisuals && index === activeBeat
          return (
            <span
              className={`beat-node beat-node--${accent}${active ? ' is-active' : ''}`}
              key={`${index}-${accent}`}
              aria-label={`第 ${index + 1} 拍：${ACCENT_LABEL[accent]}`}
              aria-current={active ? 'true' : undefined}
            >
              <span className="beat-node__halo" aria-hidden="true" />
              <span className="beat-node__number" aria-current={active ? 'true' : undefined}>{index + 1}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
