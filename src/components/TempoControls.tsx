import { useState } from 'react'

interface TempoControlsProps {
  bpm: number
  onBpmChange(bpm: number): void
  onTap(): void
}

function tempoTerm(bpm: number): string {
  if (bpm < 60) return 'Largo · 广板'
  if (bpm < 76) return 'Adagio · 柔板'
  if (bpm < 108) return 'Andante · 行板'
  if (bpm < 120) return 'Moderato · 中板'
  if (bpm < 168) return 'Allegro · 快板'
  return 'Presto · 急板'
}

function TempoStep({ amount, onStep }: { amount: number; onStep(amount: number): void }) {
  const direction = amount > 0 ? '提高' : '降低'
  const magnitude = Math.abs(amount)
  return (
    <button
      className="tempo-step"
      type="button"
      aria-label={`${direction} ${magnitude} BPM`}
      onClick={() => onStep(amount)}
    >
      {amount > 0 ? '+' : '−'}{magnitude}
    </button>
  )
}

export function TempoControls({ bpm, onBpmChange, onTap }: TempoControlsProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(bpm))

  const update = (value: number) => {
    if (Number.isFinite(value)) onBpmChange(Math.min(400, Math.max(20, Math.round(value))))
  }

  const handleDraft = (value: string) => {
    setDraft(value)
    if (value.trim() === '') return
    const parsed = Number(value)
    if (Number.isFinite(parsed)) update(parsed)
  }

  return (
    <section className="tempo-controls" aria-labelledby="tempo-heading">
      <div className="tempo-controls__eyebrow" id="tempo-heading">TEMPO</div>
      <div className="tempo-readout">
        <TempoStep amount={-5} onStep={(amount) => update(bpm + amount)} />
        <TempoStep amount={-1} onStep={(amount) => update(bpm + amount)} />
        <label className="tempo-value">
          <span className="sr-only">BPM</span>
          <input
            aria-label="BPM"
            inputMode="numeric"
            min="20"
            max="400"
            type="number"
            value={editing ? draft : String(bpm)}
            onFocus={() => { setDraft(String(bpm)); setEditing(true) }}
            onChange={(event) => handleDraft(event.currentTarget.value)}
            onBlur={() => setEditing(false)}
          />
          <span>BPM</span>
          <output className="tempo-term" aria-live="polite">{tempoTerm(bpm)}</output>
        </label>
        <TempoStep amount={1} onStep={(amount) => update(bpm + amount)} />
        <TempoStep amount={5} onStep={(amount) => update(bpm + amount)} />
      </div>
      <div className="tempo-controls__lower">
        <span>20</span>
        <input
          aria-label="BPM 滑杆"
          type="range"
          min="20"
          max="400"
          value={bpm}
          onChange={(event) => update(event.currentTarget.valueAsNumber)}
        />
        <span>400</span>
        <button className="tap-button" type="button" onClick={onTap}>Tap Tempo</button>
      </div>
    </section>
  )
}
