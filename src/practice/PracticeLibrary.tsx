import { useEffect, useMemo, useState } from 'react'
import {
  PRACTICE_SONGS,
  filterPracticeSongs,
  type PracticeDifficulty,
  type PracticeSong,
  type PracticeStyle,
} from './practiceSongs'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (song: PracticeSong, bpm: number) => void
}

const DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = { beginner: '入门', intermediate: '进阶', advanced: '挑战' }
const STYLE_LABELS: Record<PracticeStyle, string> = { rock: 'Rock', pop: 'Pop', blues: 'Blues', funk: 'Funk', metal: 'Metal', acoustic: 'Acoustic' }

export default function PracticeLibrary({ open, onClose, onApply }: Props) {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<PracticeDifficulty | 'all'>('all')
  const [style, setStyle] = useState<PracticeStyle | 'all'>('all')
  const songs = useMemo(() => filterPracticeSongs(PRACTICE_SONGS, { query, difficulty, style }), [query, difficulty, style])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return <div className="practice-library-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <section className="practice-library" role="dialog" aria-modal="true" aria-label="节拍器练习曲目列表">
      <div className="practice-library__head"><div><span className="eyebrow">PRACTICE SETLIST</span><h2>练习曲目</h2><p>速度为循序练习建议，可先慢速稳定，再逐步接近目标。</p></div><button type="button" onClick={onClose} aria-label="关闭练习曲目">×</button></div>
      <div className="practice-library__filters">
        <label><span>搜索</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="曲名、艺人或练习重点" /></label>
        <label><span>难度</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as PracticeDifficulty | 'all')}><option value="all">全部</option>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>风格</span><select value={style} onChange={(event) => setStyle(event.target.value as PracticeStyle | 'all')}><option value="all">全部</option>{Object.entries(STYLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="practice-song-list">
        {songs.map((song) => <article className="practice-song" key={song.id}>
          <div className="practice-song__title"><span>{STYLE_LABELS[song.style]} · {song.meter}/4</span><h3>{song.title}</h3><p>{song.artist}</p></div>
          <div className="practice-song__focus"><span>{DIFFICULTY_LABELS[song.difficulty]}</span><p>{song.focus}</p></div>
          <div className="practice-song__actions"><button type="button" onClick={() => onApply(song, song.startBpm)}><small>慢速开始</small><strong>{song.startBpm} BPM</strong></button><button type="button" className="target" onClick={() => onApply(song, song.targetBpm)}><small>目标速度</small><strong>{song.targetBpm} BPM</strong></button></div>
        </article>)}
        {songs.length === 0 && <p className="empty-state">没有匹配的练习曲目</p>}
      </div>
    </section>
  </div>
}
