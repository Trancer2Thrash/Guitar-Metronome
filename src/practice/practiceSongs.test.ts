import { describe, expect, it } from 'vitest'
import { PRACTICE_SONGS, filterPracticeSongs } from './practiceSongs'

describe('practice song catalog', () => {
  it('contains a varied, valid set of recommended practice tempos', () => {
    expect(PRACTICE_SONGS.length).toBeGreaterThanOrEqual(15)
    expect(new Set(PRACTICE_SONGS.map((song) => song.id)).size).toBe(PRACTICE_SONGS.length)
    PRACTICE_SONGS.forEach((song) => {
      expect(song.startBpm).toBeGreaterThanOrEqual(40)
      expect(song.targetBpm).toBeLessThanOrEqual(220)
      expect(song.startBpm).toBeLessThanOrEqual(song.targetBpm)
      expect([3, 4]).toContain(song.meter)
    })
  })

  it('filters by search, difficulty, and style', () => {
    expect(filterPracticeSongs(PRACTICE_SONGS, { query: 'seven nation', difficulty: 'all', style: 'all' }).map((song) => song.id)).toEqual(['seven-nation-army'])
    expect(filterPracticeSongs(PRACTICE_SONGS, { query: '', difficulty: 'beginner', style: 'rock' }).every((song) => song.difficulty === 'beginner' && song.style === 'rock')).toBe(true)
  })
})
