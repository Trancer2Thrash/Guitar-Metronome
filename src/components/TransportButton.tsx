import type { TransportStatus } from '../hooks/useMetronome'

interface TransportButtonProps {
  status: TransportStatus
  onPlay(): void | Promise<void>
  onPause(): void | Promise<void>
  compact?: boolean
}

export function TransportButton({ status, onPlay, onPause, compact = false }: TransportButtonProps) {
  const playing = status === 'playing'
  return (
    <button
      className={`transport-button${compact ? ' transport-button--compact' : ''}`}
      type="button"
      aria-label={playing ? '暂停节拍' : '开始节拍'}
      onClick={() => { void (playing ? onPause() : onPlay()) }}
    >
      <span aria-hidden="true" className="transport-button__icon">{playing ? 'Ⅱ' : '▶'}</span>
      <span>{playing ? '暂停' : status === 'paused' ? '继续' : '开始'}</span>
    </button>
  )
}
