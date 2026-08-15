import { useEffect, useRef } from 'react'
import type { MetronomeSettings } from '../domain/metronome'
import type { MetronomeRuntime } from '../hooks/useMetronome'
import { StringPulse } from './StringPulse'
import { TransportButton } from './TransportButton'

interface FocusModeProps {
  open: boolean
  settings: MetronomeSettings
  runtime: MetronomeRuntime
  hideVisuals: boolean
  phaseLabel: string
  onExit: () => void
  onPlay: () => void | Promise<void>
  onPause: () => void | Promise<void>
  onVolumeChange: (volume: number) => void
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function FocusMode({
  open,
  settings,
  runtime,
  hideVisuals,
  phaseLabel,
  onExit,
  onPlay,
  onPause,
  onVolumeChange,
}: FocusModeProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit, open])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      className="focus-mode"
      role="dialog"
      aria-modal="true"
      aria-label="专注练习模式"
      tabIndex={-1}
    >
      <header className="focus-mode__header">
        <div>
          <span>FOCUS / PRACTICE</span>
          <strong>{phaseLabel}</strong>
        </div>
        <button className="focus-exit" type="button" aria-label="退出专注模式" onClick={onExit}>退出 ×</button>
      </header>

      <main className="focus-mode__stage">
        <div className="focus-mode__meta">
          <span>第 {runtime.barNumber} 小节</span>
          <span>{settings.meter.numerator}/{settings.meter.denominator}</span>
          <span>{formatDuration(runtime.elapsedSeconds)}</span>
        </div>

        <StringPulse meter={settings.meter} activeBeat={runtime.beatIndex} hideVisuals={hideVisuals} />

        <div className="focus-tempo" aria-label={`当前速度 ${settings.bpm} BPM`}>
          <strong>{settings.bpm}</strong>
          <span>BPM</span>
        </div>
      </main>

      <footer className="focus-mode__transport">
        <label>
          音量
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
          />
        </label>
        <TransportButton compact status={runtime.status} onPlay={onPlay} onPause={onPause} />
        <span>{runtime.status === 'playing' ? '节拍运行中' : runtime.status === 'paused' ? '练习已暂停' : '准备开始'}</span>
      </footer>
    </div>
  )
}
