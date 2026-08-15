import { clampBpm } from './meter'

const RESET_AFTER_MS = 2000
const MAX_TAPS = 7

function activeSeries(taps: readonly number[]): number[] {
  if (taps.length < 2) return [...taps]
  let start = 0
  for (let index = 1; index < taps.length; index += 1) {
    const previous = taps[index - 1]
    const current = taps[index]
    if (previous === undefined || current === undefined) continue
    if (current - previous > RESET_AFTER_MS) start = index
  }
  return taps.slice(start)
}

export function calculateTapTempo(taps: readonly number[]): number | null {
  const series = activeSeries(taps).slice(-MAX_TAPS)
  if (series.length < 2) return null
  const intervals: number[] = []
  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1]
    const current = series[index]
    if (previous === undefined || current === undefined) continue
    const interval = current - previous
    if (interval >= 150 && interval <= RESET_AFTER_MS) intervals.push(interval)
  }
  if (intervals.length === 0) return null
  const sorted = [...intervals].sort((a, b) => a - b)
  const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted
  const average = trimmed.reduce((sum, interval) => sum + interval, 0) / trimmed.length
  return clampBpm(60000 / average)
}

export class TapTempoTracker {
  private taps: number[] = []

  get size(): number {
    return this.taps.length
  }

  tap(timestampMs: number): number | null {
    const previous = this.taps.at(-1)
    if (previous !== undefined && timestampMs - previous > RESET_AFTER_MS) this.taps = []
    this.taps.push(timestampMs)
    this.taps = this.taps.slice(-MAX_TAPS)
    return this.value()
  }

  value(): number | null {
    return calculateTapTempo(this.taps)
  }

  reset(): void {
    this.taps = []
  }
}
