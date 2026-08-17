export type PracticeDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type PracticeStyle = 'rock' | 'pop' | 'blues' | 'funk' | 'metal' | 'acoustic'
export interface PracticeSong {
  id: string
  title: string
  artist: string
  difficulty: PracticeDifficulty
  style: PracticeStyle
  meter: 3 | 4
  startBpm: number
  targetBpm: number
  focus: string
}
export interface PracticeSongFilters {
  query: string
  difficulty: PracticeDifficulty | 'all'
  style: PracticeStyle | 'all'
}

export const PRACTICE_SONGS: PracticeSong[] = [
  { id: 'seven-nation-army', title: 'Seven Nation Army', artist: 'The White Stripes', difficulty: 'beginner', style: 'rock', meter: 4, startBpm: 60, targetBpm: 124, focus: '单音 Riff、休止与稳定八分音符' },
  { id: 'smoke-on-the-water', title: 'Smoke on the Water', artist: 'Deep Purple', difficulty: 'beginner', style: 'rock', meter: 4, startBpm: 55, targetBpm: 112, focus: '双音 Riff 与拍内落点' },
  { id: 'come-as-you-are', title: 'Come as You Are', artist: 'Nirvana', difficulty: 'beginner', style: 'rock', meter: 4, startBpm: 55, targetBpm: 120, focus: '交替拨弦与相邻弦切换' },
  { id: 'knockin-on-heavens-door', title: "Knockin’ on Heaven’s Door", artist: 'Bob Dylan', difficulty: 'beginner', style: 'acoustic', meter: 4, startBpm: 50, targetBpm: 75, focus: '开放和弦转换与四拍扫弦' },
  { id: 'stand-by-me', title: 'Stand by Me', artist: 'Ben E. King', difficulty: 'beginner', style: 'pop', meter: 4, startBpm: 55, targetBpm: 120, focus: 'I–vi–IV–V 循环与均匀低音' },
  { id: 'house-of-the-rising-sun', title: 'House of the Rising Sun', artist: 'The Animals', difficulty: 'intermediate', style: 'rock', meter: 3, startBpm: 55, targetBpm: 92, focus: '6/8 感分解和弦；用 3/4 点击保持大拍' },
  { id: 'sunshine-of-your-love', title: 'Sunshine of Your Love', artist: 'Cream', difficulty: 'beginner', style: 'blues', meter: 4, startBpm: 55, targetBpm: 112, focus: 'Blues Riff、附点感与重拍' },
  { id: 'californication', title: 'Californication', artist: 'Red Hot Chili Peppers', difficulty: 'intermediate', style: 'rock', meter: 4, startBpm: 48, targetBpm: 96, focus: '跨弦分解与留音控制' },
  { id: 'wish-you-were-here', title: 'Wish You Were Here', artist: 'Pink Floyd', difficulty: 'intermediate', style: 'acoustic', meter: 4, startBpm: 55, targetBpm: 84, focus: '旋律与和弦交替、弱拍进入' },
  { id: 'back-in-black', title: 'Back in Black', artist: 'AC/DC', difficulty: 'intermediate', style: 'rock', meter: 4, startBpm: 65, targetBpm: 94, focus: '切分、闷音与 Riff 间休止' },
  { id: 'sweet-child-o-mine', title: "Sweet Child O’ Mine", artist: "Guns N’ Roses", difficulty: 'advanced', style: 'rock', meter: 4, startBpm: 50, targetBpm: 125, focus: '跨弦型、十六分音符与放松' },
  { id: 'enter-sandman', title: 'Enter Sandman', artist: 'Metallica', difficulty: 'intermediate', style: 'metal', meter: 4, startBpm: 60, targetBpm: 123, focus: '闷音、重音与 Riff 循环' },
  { id: 'paranoid', title: 'Paranoid', artist: 'Black Sabbath', difficulty: 'intermediate', style: 'metal', meter: 4, startBpm: 80, targetBpm: 164, focus: '快速八分音符与换把' },
  { id: 'johnny-b-goode', title: 'Johnny B. Goode', artist: 'Chuck Berry', difficulty: 'advanced', style: 'blues', meter: 4, startBpm: 80, targetBpm: 168, focus: 'Shuffle 语汇与双音推弦' },
  { id: 'the-thrill-is-gone', title: 'The Thrill Is Gone', artist: 'B.B. King', difficulty: 'intermediate', style: 'blues', meter: 4, startBpm: 45, targetBpm: 90, focus: '留白、句尾落点与小调五声音阶' },
  { id: 'superstition', title: 'Superstition', artist: 'Stevie Wonder', difficulty: 'advanced', style: 'funk', meter: 4, startBpm: 50, targetBpm: 100, focus: '十六分切分与左右手消音' },
  { id: 'get-lucky', title: 'Get Lucky', artist: 'Daft Punk', difficulty: 'intermediate', style: 'funk', meter: 4, startBpm: 58, targetBpm: 116, focus: '十六分扫弦与和弦换位' },
  { id: 'wonderwall', title: 'Wonderwall', artist: 'Oasis', difficulty: 'beginner', style: 'acoustic', meter: 4, startBpm: 60, targetBpm: 87, focus: '固定指型与切分扫弦' },
]

export function filterPracticeSongs(songs: PracticeSong[], filters: PracticeSongFilters) {
  const query = filters.query.trim().toLocaleLowerCase()
  return songs.filter((song) => {
    const matchesQuery = !query || `${song.title} ${song.artist} ${song.focus}`.toLocaleLowerCase().includes(query)
    const matchesDifficulty = filters.difficulty === 'all' || song.difficulty === filters.difficulty
    const matchesStyle = filters.style === 'all' || song.style === filters.style
    return matchesQuery && matchesDifficulty && matchesStyle
  })
}
