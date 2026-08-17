import { useEffect, useRef, useState } from 'react'
import { audioSession } from '../audio/AudioSession'
import { CHORDS } from '../chords/chordData'
import { TapTempoTracker } from '../rhythm/tapTempo'
import { JamAudioEngine } from './JamAudioEngine'
import {
  JAM_PRESETS,
  resizeProgression,
  transposeProgression,
  type JamBars,
  type JamMeter,
  type JamSession,
  type JamStyle,
  type JamTrack,
} from './jamModel'
import { loadJamSession, saveJamSession } from './jamStorage'

const STYLE_LABELS: Record<JamStyle, string> = {
  rock: 'Rock',
  pop: 'Pop',
  ballad: 'Ballad',
  shuffle: 'Shuffle',
}
const TRACK_LABELS: Record<JamTrack, string> = { guitar: '吉他', bass: '贝斯', drums: '鼓' }

type JamStatus = 'stopped' | 'playing' | 'paused'

export default function JamPage() {
  const [session, setSession] = useState<JamSession>(() => loadJamSession())
  const [status, setStatus] = useState<JamStatus>('stopped')
  const [position, setPosition] = useState({ bar: 0, beat: 0 })
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const engine = useRef<JamAudioEngine | null>(null)
  const tapper = useRef(new TapTempoTracker())

  useEffect(() => { saveJamSession(session) }, [session])
  useEffect(() => {
    const unregister = audioSession.register('jam', () => {
      engine.current?.stop()
      setStatus('stopped')
      setPosition({ bar: 0, beat: 0 })
    })
    return () => {
      unregister()
      engine.current?.dispose()
    }
  }, [])

  async function restartPlaying(next: JamSession, fromBeat: number) {
    if (!engine.current) return
    try {
      await engine.current.start(next, setPosition, fromBeat)
    } catch {
      audioSession.release('jam')
      setStatus('stopped')
      setPosition({ bar: 0, beat: 0 })
      setError('伴奏音频加载失败，请刷新页面后重试。')
    }
  }

  function update(next: JamSession) {
    setSession(next)
    if (status === 'playing') {
      setError(null)
      const currentBeat = position.bar * next.meter + Math.min(position.beat, next.meter - 1)
      void restartPlaying(next, currentBeat)
    }
  }

  async function play() {
    engine.current ??= new JamAudioEngine()
    if (status === 'playing') {
      engine.current.pause()
      audioSession.release('jam')
      setStatus('paused')
      return
    }

    setError(null)
    audioSession.acquire('jam')
    try {
      const started = status === 'paused'
        ? await engine.current.start(session, setPosition)
        : await engine.current.start(session, setPosition, 0)
      if (started && audioSession.owner === 'jam') setStatus('playing')
    } catch {
      audioSession.release('jam')
      setStatus('stopped')
      setError('伴奏音频加载失败，请刷新页面后重试。')
    }
  }

  function stop() {
    engine.current?.stop()
    audioSession.release('jam')
    setStatus('stopped')
    setPosition({ bar: 0, beat: 0 })
  }

  async function reset() {
    if (status === 'playing') await engine.current?.reset()
    else {
      engine.current?.stop()
      audioSession.release('jam')
      setPosition({ bar: 0, beat: 0 })
      setStatus('stopped')
    }
  }

  function changeBars(bars: JamBars) {
    update({ ...session, bars, progression: resizeProgression(session.progression, bars) })
  }

  function choosePreset(name: string, progression: string[]) {
    const bars = (name === '12-Bar Blues' ? 12 : session.bars) as JamBars
    update({ ...session, bars, progression: resizeProgression(progression, bars) })
  }

  function tap(timestamp: number) {
    const bpm = tapper.current.tap(timestamp)
    if (bpm) update({ ...session, bpm })
  }

  function setTrack(track: JamTrack, patch: Partial<JamSession['mix'][JamTrack]>) {
    update({ ...session, mix: { ...session.mix, [track]: { ...session.mix[track], ...patch } } })
  }

  return <main className="tool-page jam-page">
    <section className="tool-hero tool-hero--jam">
      <span className="tool-kicker">03 / JAM LOOP</span>
      <p>排好和弦，选择律动，让鼓、贝斯与扫弦持续循环。</p>
      <div className="jam-now" aria-live="polite">
        <span>{STYLE_LABELS[session.style]}</span>
        <strong>{session.progression[position.bar] ?? '—'}</strong>
        <small>第 {position.bar + 1} 小节 · 第 {position.beat + 1} 拍</small>
      </div>
    </section>

    {error && <div className="error-banner" role="alert">{error}</div>}

    <section className="jam-controls panel" aria-label="Jam 基础设置">
      <div className="control-group">
        <span>速度</span>
        <button type="button" aria-label="BPM 减 1" onClick={() => update({ ...session, bpm: Math.max(40, session.bpm - 1) })}>−</button>
        <input aria-label="Jam BPM" type="number" min="40" max="220" value={session.bpm} onChange={(event) => update({ ...session, bpm: Math.min(220, Math.max(40, Number(event.target.value))) })} />
        <input className="jam-bpm-slider" aria-label="Jam 速度滑块" type="range" min="40" max="220" value={session.bpm} onChange={(event) => update({ ...session, bpm: Number(event.target.value) })} />
        <button type="button" aria-label="BPM 加 1" onClick={() => update({ ...session, bpm: Math.min(220, session.bpm + 1) })}>＋</button>
        <button type="button" className="secondary-action" onClick={(event) => tap(event.timeStamp)}>Tap</button>
      </div>
      <div className="control-group">
        <span>拍号</span>
        {([4, 3] as JamMeter[]).map((meter) => <button type="button" aria-pressed={session.meter === meter} className={session.meter === meter ? 'seg active' : 'seg'} onClick={() => update({ ...session, meter })} key={meter}>{meter}/4</button>)}
      </div>
      <div className="control-group">
        <span>长度</span>
        {([4, 8, 12] as JamBars[]).map((bars) => <button type="button" aria-pressed={session.bars === bars} className={session.bars === bars ? 'seg active' : 'seg'} onClick={() => changeBars(bars)} key={bars}>{bars}</button>)}
      </div>
    </section>

    <section className="jam-timeline panel">
      <div className="section-heading">
        <div><span className="eyebrow">CHORD PROGRESSION</span><h3>和弦时间线</h3></div>
        <div className="inline-actions">
          <button type="button" onClick={() => update({ ...session, progression: transposeProgression(session.progression, -1) })}>降半音</button>
          <button type="button" onClick={() => update({ ...session, progression: transposeProgression(session.progression, 1) })}>升半音</button>
          <button type="button" onClick={() => update({ ...session, progression: Array(session.bars).fill('C') })}>清空</button>
        </div>
      </div>
      <div className="progression-grid">
        {session.progression.slice(0, session.bars).map((chord, index) => <button type="button" key={index} aria-label={`第 ${index + 1} 小节 ${chord}`} onClick={() => setEditing(index)} className={position.bar === index && status !== 'stopped' ? 'progression-cell active' : 'progression-cell'}><span>{String(index + 1).padStart(2, '0')}</span><strong>{chord}</strong><small>{position.bar === index && status !== 'stopped' ? `拍 ${position.beat + 1}` : '点击编辑'}</small></button>)}
      </div>
      {editing !== null && <div className="chord-picker" role="dialog" aria-label={`编辑第 ${editing + 1} 小节`}>
        <div className="chord-picker__head">
          <strong>第 {editing + 1} 小节</strong>
          <div className="chord-picker__actions">
            {editing > 0 && <button type="button" className="chord-picker__copy" onClick={() => {
              const progression = [...session.progression]
              progression[editing] = progression[editing - 1] ?? 'C'
              update({ ...session, progression })
              setEditing(null)
            }}>复制上一小节</button>}
            <button type="button" onClick={() => setEditing(null)} aria-label="关闭和弦选择">×</button>
          </div>
        </div>
        <div>{CHORDS.map((chord) => <button type="button" key={chord.id} className={session.progression[editing] === chord.name ? 'chip active' : 'chip'} onClick={() => {
          const progression = [...session.progression]
          progression[editing] = chord.name
          update({ ...session, progression })
          setEditing(null)
        }}>{chord.name}</button>)}</div>
      </div>}
    </section>

    <div className="jam-lower">
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">QUICK LOAD</span><h3>常用进行</h3></div></div>
        <div className="preset-grid">{Object.entries(JAM_PRESETS).map(([name, progression]) => <button type="button" key={name} onClick={() => choosePreset(name, progression)}><strong>{name}</strong><span>{progression.join(' · ')}</span></button>)}</div>
      </section>
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">GROOVE & MIX</span><h3>律动与混音</h3></div></div>
        <div className="style-row">{(Object.keys(STYLE_LABELS) as JamStyle[]).map((style) => <button type="button" key={style} aria-pressed={session.style === style} className={session.style === style ? 'chip active' : 'chip'} onClick={() => update({ ...session, style })}>{STYLE_LABELS[style]}</button>)}</div>
        <div className="mixer">{(['guitar', 'bass', 'drums'] as JamTrack[]).map((track) => <label key={track}><span>{TRACK_LABELS[track]}</span><input aria-label={`${TRACK_LABELS[track]}音量`} type="range" min="0" max="1" step="0.01" value={session.mix[track].volume} onChange={(event) => setTrack(track, { volume: Number(event.target.value) })} /><button type="button" aria-pressed={session.mix[track].muted} className={session.mix[track].muted ? 'mute active' : 'mute'} onClick={() => setTrack(track, { muted: !session.mix[track].muted })}>{session.mix[track].muted ? '恢复' : '静音'}</button></label>)}</div>
      </section>
    </div>

    <div className="jam-transport" aria-label="Jam 播放控制">
      <button type="button" className="transport-small" onClick={stop}>■<span>停止</span></button>
      <button type="button" className="jam-play" onClick={play}>{status === 'playing' ? 'Ⅱ' : '▶'}<span>{status === 'playing' ? '暂停' : '播放'}</span></button>
      <button type="button" className="transport-small" onClick={reset}>↺<span>回到开头</span></button>
    </div>
  </main>
}
