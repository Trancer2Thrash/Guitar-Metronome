import { useEffect, useMemo, useRef, useState } from 'react'
import { audioSession } from '../audio/AudioSession'
import { ChordAudioEngine } from './ChordAudioEngine'
import { ChordChangeTrainer, type ChordChangeTrainerHandle } from './ChordChangeTrainer'
import { CHORDS, CHORD_CATEGORIES, type ChordCategory } from './chordData'
import { getChordVoicings, toPlayableChord } from './chordVoicings'
import { Fretboard } from './Fretboard'

export default function ChordPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ChordCategory | 'All'>('All')
  const [selected, setSelected] = useState(CHORDS[0]!)
  const [voicingId, setVoicingId] = useState('')
  const [playing, setPlaying] = useState(false)
  const audio = useRef<ChordAudioEngine | null>(null)
  const previewTimer = useRef<number | null>(null)
  const trainer = useRef<ChordChangeTrainerHandle | null>(null)
  const voicings = useMemo(() => getChordVoicings(selected), [selected])
  const selectedVoicing = voicings.find((voicing) => voicing.id === voicingId) ?? voicings[0]!
  const playableChord = useMemo(() => toPlayableChord(selected, selectedVoicing), [selected, selectedVoicing])

  function stopPreview(release = true) {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = null
    audio.current?.stop()
    setPlaying(false)
    if (release) audioSession.release('chords')
  }

  useEffect(() => {
    const trainerHandle = trainer.current
    const unregister = audioSession.register('chords', () => {
      stopPreview(false)
      trainer.current?.stop()
    })
    return () => {
      stopPreview(false)
      trainerHandle?.stop()
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

  function chooseChord(chord: typeof selected) {
    setSelected(chord)
    setVoicingId('')
  }

  async function preview() {
    trainer.current?.stop()
    stopPreview(false)
    audioSession.acquire('chords')
    audio.current ??= new ChordAudioEngine()
    setPlaying(true)
    try {
      const started = await audio.current.play(playableChord)
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
    <section className="tool-hero"><span className="tool-kicker">02 / CHORD ATLAS</span><p>搜索常用指法，切换不同把位，然后听一次完整扫弦。</p></section>
    <div className="chord-workbench">
      <aside className="chord-browser" aria-label="和弦列表">
        <label className="field-label">搜索和弦<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 Cmaj7、F♯m" /></label>
        <div className="chip-row"><button type="button" className={category === 'All' ? 'chip active' : 'chip'} onClick={() => setCategory('All')}>全部</button>{CHORD_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? 'chip active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="chord-list">{filtered.map((chord) => <button type="button" key={chord.id} className={selected.id === chord.id ? 'chord-list__item active' : 'chord-list__item'} onClick={() => chooseChord(chord)}><strong>{chord.name}</strong><span>{chord.category}</span></button>)}{filtered.length === 0 && <p className="empty-state">没有匹配的和弦</p>}</div>
      </aside>
      <section className="chord-detail">
        <div className="chord-detail__diagram">
          <div className="voicing-tabs" aria-label={`${selected.name} 把位选择`}>{voicings.map((voicing) => <button type="button" key={voicing.id} className={selectedVoicing.id === voicing.id ? 'active' : ''} aria-pressed={selectedVoicing.id === voicing.id} onClick={() => setVoicingId(voicing.id)}>{voicing.label}</button>)}</div>
          <Fretboard chord={playableChord} />
        </div>
        <div className="chord-detail__copy">
          <span className="eyebrow">STANDARD TUNING · E A D G B E</span><h3>{selected.name}</h3><p>{selectedVoicing.label}{playableChord.barre ? ` · ${playableChord.barre.fret} 品横按` : ''}</p>
          <dl><div><dt>组成音</dt><dd>{selected.notes.join(' · ')}</dd></div><div><dt>音程</dt><dd>{selected.intervals.join(' · ')}</dd></div><div><dt>按弦</dt><dd>{playableChord.frets.map((value) => value === null ? '×' : value).join(' · ')}</dd></div></dl>
          <button type="button" className="primary-action" onClick={preview} aria-label={`试听 ${selected.name} ${selectedVoicing.label}`}><span aria-hidden="true">▶</span>{playing ? '正在扫弦' : '试听和弦'}</button>
        </div>
      </section>
    </div>
    <ChordChangeTrainer ref={trainer} onRequestAudio={() => { stopPreview(false); audioSession.acquire('chords') }} onReleaseAudio={() => audioSession.release('chords')} />
  </main>
}
