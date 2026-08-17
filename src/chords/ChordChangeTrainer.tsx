import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { CHORDS } from './chordData'
import { ChordChangeEngine, type ChordChangeRuntime } from './ChordChangeEngine'
import { normalizeChordChangeConfig, type ChordChangeBeats, type ChordChangeConfig, type ChordChangeDuration } from './chordChangeModel'

export interface ChordChangeTrainerHandle { stop: () => void }
interface Props { onRequestAudio: () => void; onReleaseAudio: () => void }
type TrainerStatus = 'stopped' | 'playing' | 'paused'

const DEFAULT_CONFIG = normalizeChordChangeConfig({ chordA: 'C', chordB: 'G', bpm: 80, beatsPerChord: 4, durationMinutes: 1 })
const DEFAULT_RUNTIME: ChordChangeRuntime = { beatIndex: 0, elapsedSeconds: 0, remainingSeconds: 60, completed: false, currentChord: 'C', nextChord: 'G', beatInChord: 0, switchCount: 0 }

export const ChordChangeTrainer = forwardRef<ChordChangeTrainerHandle, Props>(function ChordChangeTrainer({ onRequestAudio, onReleaseAudio }, ref) {
  const [config, setConfig] = useState<ChordChangeConfig>(DEFAULT_CONFIG)
  const [runtime, setRuntime] = useState<ChordChangeRuntime>(DEFAULT_RUNTIME)
  const [status, setStatus] = useState<TrainerStatus>('stopped')
  const engine = useRef<ChordChangeEngine | null>(null)

  function stop(release = true) {
    engine.current?.stop()
    setStatus('stopped')
    setRuntime({ ...DEFAULT_RUNTIME, remainingSeconds: config.durationMinutes * 60, currentChord: config.chordA, nextChord: config.chordB })
    if (release) onReleaseAudio()
  }

  useImperativeHandle(ref, () => ({ stop: () => stop(false) }))
  useEffect(() => () => engine.current?.dispose(), [])

  function update(patch: Partial<ChordChangeConfig>) {
    const next = normalizeChordChangeConfig({ ...config, ...patch })
    setConfig(next)
    if (status === 'playing') {
      onRequestAudio()
      void engine.current?.start(next, handleRuntime, true)
    } else {
      setRuntime({ ...DEFAULT_RUNTIME, remainingSeconds: next.durationMinutes * 60, currentChord: next.chordA, nextChord: next.chordB })
    }
  }

  function handleRuntime(next: ChordChangeRuntime) {
    setRuntime(next)
    if (next.completed) {
      setStatus('stopped')
      onReleaseAudio()
    }
  }

  async function toggle() {
    engine.current ??= new ChordChangeEngine()
    if (status === 'playing') {
      engine.current.pause()
      setStatus('paused')
      onReleaseAudio()
      return
    }
    onRequestAudio()
    const started = await engine.current.start(config, handleRuntime, status === 'stopped')
    if (started) setStatus('playing')
  }

  async function reset() {
    if (!engine.current) {
      setRuntime({ ...DEFAULT_RUNTIME, remainingSeconds: config.durationMinutes * 60, currentChord: config.chordA, nextChord: config.chordB })
      return
    }
    await engine.current.reset()
    if (status !== 'playing') setStatus('stopped')
  }

  return <section className="chord-trainer panel" aria-label="和弦切换训练">
    <div className="section-heading"><div><span className="eyebrow">CHORD CHANGE</span><h3>和弦切换训练</h3></div><span className="trainer-count">切换 {runtime.switchCount}</span></div>
    <div className="chord-trainer__now">
      <div><small>当前</small><strong>{runtime.currentChord}</strong></div>
      <span aria-hidden="true">→</span>
      <div><small>下一个</small><strong>{runtime.nextChord}</strong></div>
    </div>
    <div className="trainer-beats">{Array.from({ length: config.beatsPerChord }, (_, index) => <span key={index} className={runtime.beatInChord === index && status !== 'stopped' ? 'active' : ''}>{index + 1}</span>)}</div>
    <div className="chord-trainer__settings">
      <label><span>和弦 A</span><select aria-label="训练和弦 A" value={config.chordA} onChange={(event) => update({ chordA: event.target.value })}>{CHORDS.map((chord) => <option key={chord.id}>{chord.name}</option>)}</select></label>
      <label><span>和弦 B</span><select aria-label="训练和弦 B" value={config.chordB} onChange={(event) => update({ chordB: event.target.value })}>{CHORDS.map((chord) => <option key={chord.id}>{chord.name}</option>)}</select></label>
      <label><span>速度</span><input aria-label="切换训练 BPM" type="number" min="40" max="200" value={config.bpm} onChange={(event) => update({ bpm: Number(event.target.value) })} /></label>
    </div>
    <div className="trainer-options"><div className="control-group"><span>每个和弦</span>{([2, 4, 8] as ChordChangeBeats[]).map((beats) => <button type="button" key={beats} className={config.beatsPerChord === beats ? 'seg active' : 'seg'} onClick={() => update({ beatsPerChord: beats })}>{beats} 拍</button>)}</div><div className="control-group"><span>时长</span>{([1, 3, 5] as ChordChangeDuration[]).map((minutes) => <button type="button" key={minutes} className={config.durationMinutes === minutes ? 'seg active' : 'seg'} onClick={() => update({ durationMinutes: minutes })}>{minutes} 分</button>)}</div></div>
    <div className="chord-trainer__transport"><span>剩余 {Math.ceil(runtime.remainingSeconds)} 秒</span><button type="button" onClick={reset}>重置</button><button type="button" className="primary-action" onClick={toggle}>{status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '开始训练'}</button><button type="button" onClick={() => stop()}>停止</button></div>
  </section>
})
