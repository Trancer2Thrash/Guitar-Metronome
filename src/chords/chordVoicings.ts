import type { ChordDefinition } from './chordData'
import { OPEN_MIDI, ROOT_PITCH_CLASS } from './tuning'

export interface ChordVoicing {
  id: string
  label: string
  frets: Array<number | null>
  fingers: Array<number | null>
  barre?: ChordDefinition['barre']
  midi: Array<number | null>
}

const cache = new Map<string, ChordVoicing[]>()

function midiFor(frets: Array<number | null>) {
  return frets.map((fret, index) => fret === null ? null : OPEN_MIDI[index]! + fret)
}

function rootAndQuality(name: string) {
  const ascii = name.replace('♯', '#').replace('♭', 'b')
  const match = ascii.match(/^([A-G](?:#|b)?)(.*)$/)
  return match ? { root: match[1]!, quality: match[2]! } : null
}

function movableFret(pitchClass: number, openPitchClass: number) {
  const fret = (pitchClass - openPitchClass + 12) % 12
  return fret === 0 ? 12 : fret
}

function voicing(id: string, label: string, frets: Array<number | null>, fingers: Array<number | null>, barre?: ChordDefinition['barre']): ChordVoicing {
  return { id, label, frets, fingers, midi: midiFor(frets), ...(barre ? { barre } : {}) }
}

function shapeQuality(quality: string): 'major' | 'minor' | 'seven' | 'maj7' | 'min7' | 'power' | null {
  if (quality === '') return 'major'
  if (quality === 'm') return 'minor'
  if (quality === '7') return 'seven'
  if (quality === 'maj7') return 'maj7'
  if (quality === 'm7') return 'min7'
  if (quality === '5') return 'power'
  return null
}

function generatedShapes(chord: ChordDefinition): ChordVoicing[] {
  const parsed = rootAndQuality(chord.name)
  if (!parsed) return []
  const pitchClass = ROOT_PITCH_CLASS[parsed.root]
  const quality = shapeQuality(parsed.quality)
  if (pitchClass === undefined || !quality) return []
  const e = movableFret(pitchClass, 4)
  const a = movableFret(pitchClass, 9)

  if (quality === 'power') {
    return [
      voicing(`${chord.id}-e-power`, `6 弦根音 · ${e} 品`, [e, e + 2, e + 2, null, null, null], [1, 3, 4, null, null, null]),
      voicing(`${chord.id}-a-power`, `5 弦根音 · ${a} 品`, [null, a, a + 2, a + 2, null, null], [null, 1, 3, 4, null, null]),
    ]
  }

  const eFrets: Record<Exclude<typeof quality, 'power'>, number[]> = {
    major: [e, e + 2, e + 2, e + 1, e, e],
    minor: [e, e + 2, e + 2, e, e, e],
    seven: [e, e + 2, e, e + 1, e, e],
    maj7: [e, e + 2, e + 1, e + 1, e, e],
    min7: [e, e + 2, e, e, e, e],
  }
  const aFrets: Record<Exclude<typeof quality, 'power'>, Array<number | null>> = {
    major: [null, a, a + 2, a + 2, a + 2, a],
    minor: [null, a, a + 2, a + 2, a + 1, a],
    seven: [null, a, a + 2, a, a + 2, a],
    maj7: [null, a, a + 2, a + 1, a + 2, a],
    min7: [null, a, a + 2, a, a + 1, a],
  }
  return [
    voicing(`${chord.id}-a-shape`, `A 型 · ${a} 品`, aFrets[quality], [null, 1, 3, 3, 3, 1], { fret: a, fromString: 1, toString: 5 }),
    voicing(`${chord.id}-e-shape`, `E 型 · ${e} 品`, eFrets[quality], [1, 3, 4, 2, 1, 1], { fret: e, fromString: 0, toString: 5 }),
  ]
}

export function getChordVoicings(chord: ChordDefinition): ChordVoicing[] {
  const existing = cache.get(chord.id)
  if (existing) return existing
  const primary = voicing(`${chord.id}-primary`, '常用把位', [...chord.frets], [...chord.fingers], chord.barre)
  const seen = new Set<string>()
  const result = [primary, ...generatedShapes(chord)].filter((item) => {
    const key = item.frets.map((fret) => fret ?? 'x').join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  cache.set(chord.id, result)
  return result
}

export function toPlayableChord(chord: ChordDefinition, selected: ChordVoicing): ChordDefinition {
  return {
    ...chord,
    frets: [...selected.frets],
    fingers: [...selected.fingers],
    midi: [...selected.midi],
    barre: selected.barre,
  }
}
