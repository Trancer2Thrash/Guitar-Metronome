import { useEffect, useMemo, useRef, useState } from 'react'
import { audioSession } from '../audio/AudioSession'
import { ChordAudioEngine } from './ChordAudioEngine'
import { CHORDS, CHORD_CATEGORIES, type ChordCategory } from './chordData'
import { Fretboard } from './Fretboard'

export default function ChordPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ChordCategory | 'All'>('All')
  const [selected, setSelected] = useState(CHORDS[0]!)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<ChordAudioEngine | null>(null)
  const previewTimer = useRef<number | null>(null)

  useEffect(() => {
    const stopPreview = () => {
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
      previewTimer.current = null
      audio.current?.stop()
      setPlaying(false)
    }
    const unregister = audioSession.register('chords', stopPreview)
    return () => {
      stopPreview()
      unregister()
      audio.current?.dispose()
    }
  }, [])

  const filtered = useMemo(
    () => CHORDS.filter((chord) => (
      (category === 'All' || chord.category === category)
      && `${chord.name} ${chord.notes.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())
    )),
    [query, category],
  )

  async function preview() {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = null
    audioSession.acquire('chords')
    audio.current ??= new ChordAudioEngine()
    setPlaying(true)
    try {
      const started = await audio.current.play(selected)
      if (!started || audioSession.owner !== 'chords') {
        setPlaying(false)
        return
      }
      previewTimer.current = window.setTimeout(() => {
        setPlaying(false)
        audioSession.release('chords')
        previewTimer.current = null
      }, 1700)
    } catch {
      setPlaying(false)
      audioSession.release('chords')
    }
  }

  return <main className="tool-page chord-page">
    <section className="tool-hero">
      <span className="tool-kicker">02 / CHORD ATLAS</span>
      <p>搜索常用指法，确认每根弦的位置，然后听一次完整扫弦。</p>
    </section>
    <div className="chord-workbench">
      <aside className="chord-browser" aria-label="和弦列表">
        <label className="field-label">
          搜索和弦
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 Cmaj7、F♯m" />
        </label>
        <div className="chip-row">
          <button type="button" className={category === 'All' ? 'chip active' : 'chip'} onClick={() => setCategory('All')}>全部</button>
          {CHORD_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? 'chip active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="chord-list">
          {filtered.map((chord) => <button type="button" key={chord.id} className={selected.id === chord.id ? 'chord-list__item active' : 'chord-list__item'} onClick={() => setSelected(chord)}><strong>{chord.name}</strong><span>{chord.category}</span></button>)}
          {filtered.length === 0 && <p className="empty-state">没有匹配的和弦</p>}
        </div>
      </aside>
      <section className="chord-detail">
        <div className="chord-detail__diagram"><Fretboard chord={selected} /></div>
        <div className="chord-detail__copy">
          <span className="eyebrow">STANDARD TUNING · E A D G B E</span>
          <h3>{selected.name}</h3>
          <p>{selected.barre ? `${selected.barre.fret} 品横按指法` : '开放式 / 常用指法'}</p>
          <dl>
            <div><dt>组成音</dt><dd>{selected.notes.join(' · ')}</dd></div>
            <div><dt>音程</dt><dd>{selected.intervals.join(' · ')}</dd></div>
            <div><dt>按弦</dt><dd>{selected.frets.map((value) => value === null ? '×' : value).join(' · ')}</dd></div>
          </dl>
          <button type="button" className="primary-action" onClick={preview} aria-label={`试听 ${selected.name} 和弦`}><span aria-hidden="true">▶</span>{playing ? '正在扫弦' : '试听和弦'}</button>
        </div>
      </section>
    </div>
  </main>
}
