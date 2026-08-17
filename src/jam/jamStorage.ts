import { z } from 'zod'
import {
  DEFAULT_JAM_SESSION,
  cloneJamSession,
  inferJamKey,
  resizeProgression,
  type JamSession,
} from './jamModel'

const mix = z.object({ volume: z.number().min(0).max(1), muted: z.boolean() })
const bars = z.union([z.literal(4), z.literal(8), z.literal(12)])
const section = z.object({
  id: z.enum(['A', 'B', 'C']),
  name: z.string().min(1).max(12),
  bars,
  progression: z.array(z.string().min(1)).min(1).max(12),
  fill: z.boolean(),
})
const v2Schema = z.object({
  bpm: z.number().min(40).max(220),
  meter: z.union([z.literal(3), z.literal(4)]),
  countInBars: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  key: z.enum(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']),
  mode: z.enum(['major', 'minor']),
  sections: z.array(section).min(1).max(3),
  style: z.enum(['rock', 'pop', 'ballad', 'shuffle']),
  mix: z.object({ drums: mix, bass: mix, guitar: mix }),
})
const v1Schema = z.object({
  bpm: z.number().min(40).max(220),
  meter: z.union([z.literal(3), z.literal(4)]),
  bars,
  progression: z.array(z.string().min(1)).min(1).max(12),
  style: z.enum(['rock', 'pop', 'ballad', 'shuffle']),
  mix: z.object({ drums: mix, bass: mix, guitar: mix }),
})

const V2_KEY = 'six-string-jam-v2'
const V1_KEY = 'six-string-jam-v1'

function normalize(session: JamSession): JamSession {
  return cloneJamSession({
    ...session,
    sections: session.sections.map((item) => ({ ...item, progression: resizeProgression(item.progression, item.bars) })),
  })
}

export function loadJamSession(storage: Storage = localStorage): JamSession {
  try {
    const v2Raw = storage.getItem(V2_KEY)
    if (v2Raw) {
      const parsed = v2Schema.safeParse(JSON.parse(v2Raw))
      if (parsed.success) return normalize(parsed.data)
      return cloneJamSession(DEFAULT_JAM_SESSION)
    }

    const v1Raw = storage.getItem(V1_KEY)
    if (!v1Raw) return cloneJamSession(DEFAULT_JAM_SESSION)
    const parsed = v1Schema.safeParse(JSON.parse(v1Raw))
    if (!parsed.success) return cloneJamSession(DEFAULT_JAM_SESSION)
    return normalize({
      bpm: parsed.data.bpm,
      meter: parsed.data.meter,
      countInBars: 0,
      key: inferJamKey(parsed.data.progression),
      mode: parsed.data.progression[0]?.includes('m') && !parsed.data.progression[0]?.includes('maj') ? 'minor' : 'major',
      sections: [{ id: 'A', name: '主段', bars: parsed.data.bars, progression: parsed.data.progression, fill: false }],
      style: parsed.data.style,
      mix: parsed.data.mix,
    })
  } catch {
    return cloneJamSession(DEFAULT_JAM_SESSION)
  }
}

export function saveJamSession(session: JamSession, storage: Storage = localStorage) {
  storage.setItem(V2_KEY, JSON.stringify(normalize(session)))
}
