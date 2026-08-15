import type { BeatEvent, MetronomeSettings } from '../domain/metronome'

function subdivisionOffsets(subdivision: MetronomeSettings['subdivision']): number[] {
  switch (subdivision) {
    case 'quarter': return [0]
    case 'eighth': return [0, 0.5]
    case 'triplet': return [0, 1 / 3, 2 / 3]
    case 'sixteenth': return [0, 0.25, 0.5, 0.75]
    case 'swing': return [0, 2 / 3]
  }
}

export function buildBarEvents(settings: MetronomeSettings): BeatEvent[] {
  const offsets = subdivisionOffsets(settings.subdivision)
  const events: BeatEvent[] = []

  for (let beatIndex = 0; beatIndex < settings.meter.numerator; beatIndex += 1) {
    offsets.forEach((offset, subdivisionIndex) => {
      const isMainBeat = subdivisionIndex === 0
      events.push({
        beatIndex,
        subdivisionIndex,
        accent: isMainBeat ? (settings.meter.accents[beatIndex] ?? 'weak') : 'weak',
        isMainBeat,
        offsetBeats: beatIndex + offset,
      })
    })
  }

  return events
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}
