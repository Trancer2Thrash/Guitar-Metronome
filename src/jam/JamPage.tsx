import { useEffect, useMemo, useRef, useState } from 'react'
import { audioSession } from '../audio/AudioSession'
import { CHORDS } from '../chords/chordData'
import { TapTempoTracker } from '../rhythm/tapTempo'
import { JamAudioEngine, type JamPosition } from './JamAudioEngine'
import {
  JAM_KEYS,
  JAM_PRESETS,
  JAM_SECTION_META,
  buildJamTimeline,
  recommendScales,
  resizeProgression,
  totalJamBars,
  transposeJamSession,
  transposeProgression,
  type JamBars,
  type JamCountInBars,
  type JamKey,
  type JamMeter,
  type JamMode,
  type JamSection,
  type JamSectionId,
  type JamSession,
  type JamStyle,
  type JamTrack,
} from './jamModel'
import { loadJamSession, saveJamSession } from './jamStorage'

const STYLE_LABELS: Record<JamStyle, string> = { rock: 'Rock', pop: 'Pop', ballad: 'Ballad', shuffle: 'Shuffle' }
const TRACK_LABELS: Record<JamTrack, string> = { guitar: '吉他', bass: '贝斯', drums: '鼓' }
const SECTION_IDS: JamSectionId[] = ['A', 'B', 'C']
type JamStatus = 'stopped' | 'playing' | 'paused'

const START_POSITION: JamPosition = { phase: 'playing', bar: 0, beat: 0, sectionId: 'A', sectionIndex: 0, localBar: 0 }

export default function JamPage() {
  const [session, setSession] = useState<JamSession>(() => loadJamSession())
  const [status, setStatus] = useState<JamStatus>('stopped')
  const [position, setPosition] = useState<JamPosition>(START_POSITION)
  const [activeSectionId, setActiveSectionId] = useState<JamSectionId>('A')
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const engine = useRef<JamAudioEngine | null>(null)
  const tapper = useRef(new TapTempoTracker())
  const sessionRef = useRef(session)
  const saveTimer = useRef<number | null>(null)

  const timeline = useMemo(() => buildJamTimeline(session), [session])
  const scales = useMemo(() => recommendScales(session), [session])
  const activeSection = session.sections.find((section) => section.id === activeSectionId) ?? session.sections[0]!
  const playingBar = timeline[position.bar] ?? timeline[0]

  useEffect(() => {
    sessionRef.current = session
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveJamSession(session)
      saveTimer.current = null
    }, 180)
  }, [session])

  useEffect(() => () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveJamSession(sessionRef.current)
  }, [])


  useEffect(() => {
    const unregister = audioSession.register('jam', () => {
      engine.current?.stop()
      setStatus('stopped')
      setPosition(START_POSITION)
    })
    return () => {
      unregister()
      engine.current?.dispose()
    }
  }, [])

  function handlePosition(next: JamPosition) {
    setPosition(next)
    if (next.phase === 'playing') setActiveSectionId(next.sectionId)
  }
  async function restartPlaying(next: JamSession, fromBeat: number) {
    if (!engine.current) return
    try {
      await engine.current.start(next, handlePosition, { fromBeat, countIn: false })
    } catch {
      audioSession.release('jam')
      setStatus('stopped')
      setPosition(START_POSITION)
      setError('伴奏音频加载失败，请刷新页面后重试。')
    }
  }

  function update(next: JamSession) {
    setSession(next)
    if (status === 'playing') {
      setError(null)
      const maxBeat = Math.max(1, totalJamBars(next) * next.meter)
      const currentBeat = Math.min(maxBeat - 1, position.bar * next.meter + Math.min(position.beat, next.meter - 1))
      void restartPlaying(next, currentBeat)
    }
  }

  function updateSection(sectionId: JamSectionId, patch: Partial<JamSection>) {
    update({ ...session, sections: session.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section) })
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
        ? await engine.current.start(session, handlePosition, { countIn: false })
        : await engine.current.start(session, handlePosition, { fromBeat: 0, countIn: true })
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
    setPosition(START_POSITION)
    setActiveSectionId(session.sections[0]?.id ?? 'A')
  }

  async function reset() {
    if (status === 'playing') await engine.current?.reset()
    else {
      engine.current?.stop()
      audioSession.release('jam')
      setPosition(START_POSITION)
      setStatus('stopped')
      setActiveSectionId(session.sections[0]?.id ?? 'A')
    }
  }

  function changeBars(bars: JamBars) {
    updateSection(activeSection.id, { bars, progression: resizeProgression(activeSection.progression, bars) })
  }

  function choosePreset(name: string, progression: string[]) {
    const bars = (name === '12-Bar Blues' ? 12 : activeSection.bars) as JamBars
    const keyOffset = JAM_KEYS.indexOf(session.key)
    updateSection(activeSection.id, { bars, progression: resizeProgression(transposeProgression(progression, keyOffset), bars) })
  }

  function changeKey(key: JamKey) {
    const semitones = JAM_KEYS.indexOf(key) - JAM_KEYS.indexOf(session.key)
    update(transposeJamSession(session, semitones))
  }

  function addSection(copy = false) {
    const id = SECTION_IDS.find((candidate) => !session.sections.some((section) => section.id === candidate))
    if (!id) return
    const section: JamSection = {
      id,
      name: JAM_SECTION_META[id],
      bars: activeSection.bars,
      progression: copy ? [...activeSection.progression] : resizeProgression(['F', 'G', 'Em', 'Am'], activeSection.bars),
      fill: true,
    }
    update({ ...session, sections: [...session.sections, section].sort((a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id)) })
    setActiveSectionId(id)
    setEditing(null)
  }

  function deleteSection() {
    if (session.sections.length === 1) return
    const sections = session.sections.filter((section) => section.id !== activeSection.id)
    update({ ...session, sections })
    setActiveSectionId(sections[0]!.id)
    setEditing(null)
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
      <div className={`jam-now${position.phase === 'count-in' ? ' jam-now--count-in' : ''}`}>
        <span>{position.phase === 'count-in' ? 'COUNT IN' : `${playingBar?.sectionId ?? 'A'} · ${STYLE_LABELS[session.style]}`}</span>
        <strong>{position.phase === 'count-in' ? `${(position.countInBar ?? 0) + 1} / ${session.countInBars}` : playingBar?.chord ?? '—'}</strong>
        <small>{position.phase === 'count-in' ? `预备第 ${position.beat + 1} 拍` : `${playingBar?.sectionId ?? 'A'} 段第 ${(playingBar?.localBar ?? 0) + 1} 小节 · 第 ${position.beat + 1} 拍`}</small>
      </div>
    </section>

    {error && <div className="error-banner" role="alert">{error}</div>}

    <section className="jam-controls panel" aria-label="Jam 基础设置">
      <div className="control-group control-group--tempo">
        <span>速度</span>
        <button type="button" aria-label="BPM 减 1" onClick={() => update({ ...session, bpm: Math.max(40, session.bpm - 1) })}>−</button>
        <input aria-label="Jam BPM" type="number" min="40" max="220" value={session.bpm} onChange={(event) => update({ ...session, bpm: Math.min(220, Math.max(40, Number(event.target.value))) })} />
        <strong>BPM</strong>
        <button type="button" aria-label="BPM 加 1" onClick={() => update({ ...session, bpm: Math.min(220, session.bpm + 1) })}>＋</button>
        <button type="button" className="tap-button" onClick={(event) => tap(event.timeStamp)}>Tap</button>
        <input className="jam-bpm-slider" aria-label="Jam 速度滑块" type="range" min="40" max="220" value={session.bpm} onChange={(event) => update({ ...session, bpm: Number(event.target.value) })} />
      </div>
      <div className="control-group"><span>拍号</span>{([3, 4] as JamMeter[]).map((meter) => <button type="button" aria-pressed={session.meter === meter} className={session.meter === meter ? 'seg active' : 'seg'} onClick={() => update({ ...session, meter })} key={meter}>{meter}/4</button>)}</div>
      <div className="control-group"><span>预备拍</span>{([0, 1, 2] as JamCountInBars[]).map((bars) => <button type="button" aria-pressed={session.countInBars === bars} className={session.countInBars === bars ? 'seg active' : 'seg'} onClick={() => update({ ...session, countInBars: bars })} key={bars}>{bars === 0 ? '关' : `${bars} 小节`}</button>)}</div>
    </section>

    <section className="jam-timeline panel">
      <div className="section-heading">
        <div><span className="eyebrow">ARRANGEMENT</span><h3>段落与和弦时间线</h3></div>
        <div className="inline-actions"><button type="button" onClick={() => addSection(false)} disabled={session.sections.length >= 3}>添加段落</button><button type="button" onClick={() => addSection(true)} disabled={session.sections.length >= 3}>复制为新段</button><button type="button" onClick={deleteSection} disabled={session.sections.length === 1}>删除本段</button></div>
      </div>

      <div className="section-rail" aria-label="Jam 段落">
        {session.sections.map((section) => <button type="button" key={section.id} className={activeSection.id === section.id ? 'section-tab active' : 'section-tab'} onClick={() => { setActiveSectionId(section.id); setEditing(null) }}><span>{section.id}</span><strong>{section.name}</strong><small>{section.bars} 小节{section.fill ? ' · Fill' : ''}</small></button>)}
      </div>

      <div className="section-toolbar">
        <div className="control-group"><span>本段长度</span>{([4, 8, 12] as JamBars[]).map((bars) => <button type="button" aria-pressed={activeSection.bars === bars} className={activeSection.bars === bars ? 'seg active' : 'seg'} onClick={() => changeBars(bars)} key={bars}>{bars}</button>)}</div>
        <label className="fill-toggle"><input type="checkbox" checked={activeSection.fill} onChange={(event) => updateSection(activeSection.id, { fill: event.target.checked })} /><span>段尾鼓 Fill</span></label>
        <div className="inline-actions"><button type="button" onClick={() => updateSection(activeSection.id, { progression: transposeProgression(activeSection.progression, -1) })}>降半音</button><button type="button" onClick={() => updateSection(activeSection.id, { progression: transposeProgression(activeSection.progression, 1) })}>升半音</button><button type="button" onClick={() => updateSection(activeSection.id, { progression: Array(activeSection.bars).fill(session.key) })}>清空</button></div>
      </div>

      <div className="progression-grid">
        {activeSection.progression.slice(0, activeSection.bars).map((chord, index) => {
          const isPlaying = status !== 'stopped' && position.phase === 'playing' && position.sectionId === activeSection.id && position.localBar === index
          return <button type="button" key={index} aria-label={`${activeSection.id} 段第 ${index + 1} 小节 ${chord}`} onClick={() => setEditing(index)} className={isPlaying ? 'progression-cell active' : 'progression-cell'}><span>{activeSection.id}{String(index + 1).padStart(2, '0')}</span><strong>{chord}</strong><small>{isPlaying ? `拍 ${position.beat + 1}` : '点击编辑'}</small></button>
        })}
      </div>

      {editing !== null && <div className="chord-picker" role="dialog" aria-label={`编辑 ${activeSection.id} 段第 ${editing + 1} 小节`}>
        <div className="chord-picker__head"><strong>{activeSection.id} 段第 {editing + 1} 小节</strong><div className="chord-picker__actions">{editing > 0 && <button type="button" className="chord-picker__copy" onClick={() => { const progression = [...activeSection.progression]; progression[editing] = progression[editing - 1] ?? session.key; updateSection(activeSection.id, { progression }); setEditing(null) }}>复制上一小节</button>}<button type="button" onClick={() => setEditing(null)} aria-label="关闭和弦选择">×</button></div></div>
        <div>{CHORDS.map((chord) => <button type="button" key={chord.id} className={activeSection.progression[editing] === chord.name ? 'chip active' : 'chip'} onClick={() => { const progression = [...activeSection.progression]; progression[editing] = chord.name; updateSection(activeSection.id, { progression }); setEditing(null) }}>{chord.name}</button>)}</div>
      </div>}
    </section>

    <section className="key-scale-panel panel">
      <div className="section-heading"><div><span className="eyebrow">KEY & SCALE</span><h3>调性及音阶推荐</h3></div></div>
      <div className="key-scale-controls"><label><span>调性</span><select aria-label="Jam 调性" value={session.key} onChange={(event) => changeKey(event.target.value as JamKey)}>{JAM_KEYS.map((key) => <option key={key}>{key}</option>)}</select></label><div className="control-group"><span>模式</span>{(['major', 'minor'] as JamMode[]).map((mode) => <button type="button" key={mode} className={session.mode === mode ? 'seg active' : 'seg'} aria-pressed={session.mode === mode} onClick={() => update({ ...session, mode })}>{mode === 'major' ? '大调' : '小调'}</button>)}</div></div>
      <div className="scale-grid">{scales.map((scale) => <article key={scale.id} className="scale-card"><strong>{scale.name}</strong><div>{scale.notes.map((note) => <span key={note}>{note}</span>)}</div><p>{scale.use}</p></article>)}</div>
    </section>

    <div className="jam-lower">
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">QUICK LOAD</span><h3>常用进行 · 写入当前段</h3></div></div><div className="preset-grid">{Object.entries(JAM_PRESETS).map(([name, progression]) => <button type="button" key={name} onClick={() => choosePreset(name, progression)}><strong>{name}</strong><span>{transposeProgression(progression, JAM_KEYS.indexOf(session.key)).join(' · ')}</span></button>)}</div></section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">GROOVE & MIX</span><h3>律动与混音</h3></div></div><div className="style-row">{(Object.keys(STYLE_LABELS) as JamStyle[]).map((style) => <button type="button" key={style} aria-pressed={session.style === style} className={session.style === style ? 'chip active' : 'chip'} onClick={() => update({ ...session, style })}>{STYLE_LABELS[style]}</button>)}</div><div className="mixer">{(['guitar', 'bass', 'drums'] as JamTrack[]).map((track) => <label key={track}><span>{TRACK_LABELS[track]}</span><input aria-label={`${TRACK_LABELS[track]}音量`} type="range" min="0" max="1" step="0.01" value={session.mix[track].volume} onChange={(event) => setTrack(track, { volume: Number(event.target.value) })} /><button type="button" aria-pressed={session.mix[track].muted} className={session.mix[track].muted ? 'mute active' : 'mute'} onClick={() => setTrack(track, { muted: !session.mix[track].muted })}>{session.mix[track].muted ? '恢复' : '静音'}</button></label>)}</div></section>
    </div>

    <div className="jam-transport" aria-label="Jam 播放控制"><button type="button" className="transport-small" onClick={stop}>■<span>停止</span></button><button type="button" className="jam-play" onClick={play}>{status === 'playing' ? 'Ⅱ' : '▶'}<span>{status === 'playing' ? '暂停' : '播放'}</span></button><button type="button" className="transport-small" onClick={reset}>↺<span>回到开头</span></button></div>
  </main>
}
