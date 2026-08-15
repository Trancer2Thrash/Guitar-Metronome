import { describe, expect, it } from 'vitest'
import { clampBpm, cycleAccent, defaultAccents, normalizeAccents } from './meter'

describe('meter helpers', () => {
  it('uses musical accent defaults for common meters', () => {
    expect(defaultAccents({ numerator: 4, denominator: 4 })).toEqual([
      'strong', 'weak', 'medium', 'weak',
    ])
    expect(defaultAccents({ numerator: 3, denominator: 4 })).toEqual(['strong', 'weak', 'weak'])
    expect(defaultAccents({ numerator: 6, denominator: 8 })).toEqual([
      'strong', 'weak', 'weak', 'medium', 'weak', 'weak',
    ])
  })

  it('preserves existing accents and fills new beats with weak accents', () => {
    expect(normalizeAccents(['strong'], 3)).toEqual(['strong', 'weak', 'weak'])
    expect(normalizeAccents(['strong', 'medium', 'weak'], 2)).toEqual(['strong', 'medium'])
  })

  it('cycles accent states and clamps BPM', () => {
    expect(cycleAccent('strong')).toBe('medium')
    expect(cycleAccent('weak')).toBe('mute')
    expect(cycleAccent('mute')).toBe('strong')
    expect(clampBpm(8)).toBe(20)
    expect(clampBpm(500)).toBe(400)
  })
})
