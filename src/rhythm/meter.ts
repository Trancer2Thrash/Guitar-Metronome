import type { BeatAccent, Meter, MeterDenominator } from '../domain/metronome'

const ACCENT_CYCLE: BeatAccent[] = ['strong', 'medium', 'weak', 'mute']

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 96
  return Math.min(400, Math.max(20, Math.round(value)))
}

export function normalizeAccents(accents: readonly BeatAccent[], numerator: number): BeatAccent[] {
  const safeNumerator = Math.min(16, Math.max(1, Math.round(numerator)))
  return Array.from({ length: safeNumerator }, (_, index) => accents[index] ?? (index === 0 ? 'strong' : 'weak'))
}

export function defaultAccents(meter: Pick<Meter, 'numerator' | 'denominator'>): BeatAccent[] {
  const key = `${meter.numerator}/${meter.denominator}`
  if (key === '4/4') return ['strong', 'weak', 'medium', 'weak']
  if (key === '3/4') return ['strong', 'weak', 'weak']
  if (key === '6/8') return ['strong', 'weak', 'weak', 'medium', 'weak', 'weak']
  return normalizeAccents([], meter.numerator)
}

export function cycleAccent(accent: BeatAccent): BeatAccent {
  const index = ACCENT_CYCLE.indexOf(accent)
  return ACCENT_CYCLE[(index + 1) % ACCENT_CYCLE.length] ?? 'strong'
}

export function createMeter(numerator: number, denominator: MeterDenominator, accents?: BeatAccent[]): Meter {
  const safeNumerator = Math.min(16, Math.max(1, Math.round(numerator)))
  return {
    numerator: safeNumerator,
    denominator,
    accents: accents ? normalizeAccents(accents, safeNumerator) : defaultAccents({ numerator: safeNumerator, denominator }),
  }
}
