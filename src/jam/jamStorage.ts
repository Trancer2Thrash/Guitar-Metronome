import { z } from 'zod'
import { DEFAULT_JAM_SESSION, type JamSession } from './jamModel'
const mix=z.object({volume:z.number().min(0).max(1),muted:z.boolean()})
const schema=z.object({bpm:z.number().min(40).max(220),meter:z.union([z.literal(3),z.literal(4)]),bars:z.union([z.literal(4),z.literal(8),z.literal(12)]),progression:z.array(z.string()).min(1).max(12),style:z.enum(['rock','pop','ballad','shuffle']),mix:z.object({drums:mix,bass:mix,guitar:mix})})
const KEY='six-string-jam-v1'
export function loadJamSession(storage:Storage=localStorage):JamSession {try{const raw=storage.getItem(KEY);if(!raw)return DEFAULT_JAM_SESSION;const parsed=schema.safeParse(JSON.parse(raw));return parsed.success?{...parsed.data,progression:parsed.data.progression.slice(0,parsed.data.bars)}:DEFAULT_JAM_SESSION}catch{return DEFAULT_JAM_SESSION}}
export function saveJamSession(session:JamSession,storage:Storage=localStorage){storage.setItem(KEY,JSON.stringify(session))}
