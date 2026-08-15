import { TransportButton } from './components/TransportButton'
import { useMetronome } from './hooks/useMetronome'
import { useWakeLock } from './hooks/useWakeLock'

export default function App() {
  const metronome = useMetronome()
  const wakeLock = useWakeLock(metronome.runtime.status === 'playing')

  return (
    <main>
      <h1>六弦节拍器</h1>
      <p>{metronome.settings.bpm} BPM · {metronome.settings.meter.numerator}/{metronome.settings.meter.denominator}</p>
      <TransportButton
        status={metronome.runtime.status}
        onPlay={metronome.actions.play}
        onPause={metronome.actions.pause}
      />
      <span className="sr-only" aria-live="polite">屏幕常亮：{wakeLock}</span>
    </main>
  )
}
