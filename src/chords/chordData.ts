export type ChordCategory = 'Major' | 'Minor' | '7th' | 'Sus / Add' | 'Power'
export interface Barre { fret: number; fromString: number; toString: number }
export interface ChordDefinition {
  id: string; name: string; category: ChordCategory; frets: Array<number | null>; fingers: Array<number | null>
  barre?: Barre; notes: string[]; intervals: string[]; midi: Array<number | null>
}
import { OPEN_MIDI, ROOT_PITCH_CLASS } from './tuning'
const NOTE_NAMES_SHARP = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const NOTE_NAMES_FLAT = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B']
const ROOTS = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B']
const ROOTS_SHARP = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const ENHARMONIC: Record<string,string> = { 'C#':'D♭','Db':'D♭','D#':'E♭','Eb':'E♭','E#':'F','Fb':'E','F#':'G♭','Gb':'G♭','G#':'A♭','Ab':'A♭','A#':'B♭','Bb':'B♭','B#':'C','Cb':'B' }
const ENHARMONIC_SHARP: Record<string,string> = { 'Db':'C♯','C#':'C♯','Eb':'D♯','D#':'D♯','Fb':'E','E#':'F','Gb':'F♯','F#':'F♯','Ab':'G♯','G#':'G♯','Bb':'A♯','A#':'A♯','Cb':'B','B#':'C' }
function prefersSharps(name: string): boolean { const ascii = name.replace('♯','#').replace('♭','b'); const m = ascii.match(/^([A-G](?:#|b)?)/); return m ? m[1]!.includes('#') : false }
export function noteNameFor(pitch: number, chordName: string): string { return prefersSharps(chordName) ? NOTE_NAMES_SHARP[pitch%12]! : NOTE_NAMES_FLAT[pitch%12]! }
const qualityIntervals: Record<string,string[]> = { major:['1','3','5'], minor:['1','♭3','5'], seven:['1','3','5','♭7'], maj7:['1','3','5','7'], min7:['1','♭3','5','♭7'], sus:['1','4','5'], add:['1','3','5','9'], power:['1','5'] }
function midiFor(frets: Array<number|null>) { return frets.map((fret,i)=>fret===null?null:OPEN_MIDI[i]!+fret) }
function notesFor(midi: Array<number|null>, chordName: string) { return [...new Set(midi.filter((n):n is number=>n!==null).map(n=>noteNameFor(n, chordName)))] }
function chord(id:string,name:string,category:ChordCategory,frets:Array<number|null>,fingers:Array<number|null>,quality:string,barre?:Barre):ChordDefinition {
 const midi=midiFor(frets); return {id,name,category,frets,fingers,notes:notesFor(midi, name),intervals:qualityIntervals[quality]??qualityIntervals.major!,midi,...(barre?{barre}:{})}
}
const raw: Array<[string,string,ChordCategory,Array<number|null>,Array<number|null>,string,Barre?]> = [
 ['C','C','Major',[null,3,2,0,1,0],[null,3,2,null,1,null],'major'],['D','D','Major',[null,null,0,2,3,2],[null,null,null,1,3,2],'major'],['E','E','Major',[0,2,2,1,0,0],[null,2,3,1,null,null],'major'],['F','F','Major',[1,3,3,2,1,1],[1,3,4,2,1,1],'major',{fret:1,fromString:0,toString:5}],['G','G','Major',[3,2,0,0,0,3],[2,1,null,null,null,3],'major'],['A','A','Major',[null,0,2,2,2,0],[null,null,1,2,3,null],'major'],['Bb','B♭','Major',[null,1,3,3,3,1],[null,1,2,3,4,1],'major',{fret:1,fromString:1,toString:5}],['B','B','Major',[null,2,4,4,4,2],[null,1,2,3,4,1],'major',{fret:2,fromString:1,toString:5}],
 ['Am','Am','Minor',[null,0,2,2,1,0],[null,null,2,3,1,null],'minor'],['Bm','Bm','Minor',[null,2,4,4,3,2],[null,1,3,4,2,1],'minor',{fret:2,fromString:1,toString:5}],['Cm','Cm','Minor',[null,3,5,5,4,3],[null,1,3,4,2,1],'minor',{fret:3,fromString:1,toString:5}],['C#m','C♯m','Minor',[null,4,6,6,5,4],[null,1,3,4,2,1],'minor',{fret:4,fromString:1,toString:5}],['Dm','Dm','Minor',[null,null,0,2,3,1],[null,null,null,2,3,1],'minor'],['Em','Em','Minor',[0,2,2,0,0,0],[null,2,3,null,null,null],'minor'],['F#m','F♯m','Minor',[2,4,4,2,2,2],[1,3,4,1,1,1],'minor',{fret:2,fromString:0,toString:5}],['Gm','Gm','Minor',[3,5,5,3,3,3],[1,3,4,1,1,1],'minor',{fret:3,fromString:0,toString:5}],
 ['A7','A7','7th',[null,0,2,0,2,3],[null,null,1,null,2,3],'seven'],['B7','B7','7th',[null,2,1,2,0,2],[null,2,1,3,null,4],'seven'],['C7','C7','7th',[null,3,2,3,1,0],[null,3,2,4,1,null],'seven'],['D7','D7','7th',[null,null,0,2,1,2],[null,null,null,2,1,3],'seven'],['E7','E7','7th',[0,2,0,1,0,0],[null,2,null,1,null,null],'seven'],['F7','F7','7th',[1,3,1,2,1,1],[1,3,1,2,1,1],'seven',{fret:1,fromString:0,toString:5}],['G7','G7','7th',[3,2,0,0,0,1],[3,2,null,null,null,1],'seven'],
 ['Amaj7','Amaj7','7th',[null,0,2,1,2,0],[null,null,2,1,3,null],'maj7'],['Bmaj7','Bmaj7','7th',[null,2,4,3,4,2],[null,1,3,2,4,1],'maj7',{fret:2,fromString:1,toString:5}],['Cmaj7','Cmaj7','7th',[null,3,2,0,0,0],[null,3,2,null,null,null],'maj7'],['Dmaj7','Dmaj7','7th',[null,null,0,2,2,2],[null,null,null,1,2,3],'maj7'],['Emaj7','Emaj7','7th',[0,2,1,1,0,0],[null,3,1,2,null,null],'maj7'],['Fmaj7','Fmaj7','7th',[null,null,3,2,1,0],[null,null,3,2,1,null],'maj7'],['Gmaj7','Gmaj7','7th',[3,2,0,0,0,2],[3,2,null,null,null,1],'maj7'],
 ['Am7','Am7','7th',[null,0,2,0,1,0],[null,null,2,null,1,null],'min7'],['Bm7','Bm7','7th',[null,2,4,2,3,2],[null,1,3,1,2,1],'min7',{fret:2,fromString:1,toString:5}],['Cm7','Cm7','7th',[null,3,5,3,4,3],[null,1,3,1,2,1],'min7',{fret:3,fromString:1,toString:5}],['Dm7','Dm7','7th',[null,null,0,2,1,1],[null,null,null,2,1,1],'min7'],['Em7','Em7','7th',[0,2,0,0,0,0],[null,2,null,null,null,null],'min7'],['F#m7','F♯m7','7th',[2,4,2,2,2,2],[1,3,1,1,1,1],'min7',{fret:2,fromString:0,toString:5}],['Gm7','Gm7','7th',[3,5,3,3,3,3],[1,3,1,1,1,1],'min7',{fret:3,fromString:0,toString:5}],
 ['Asus2','Asus2','Sus / Add',[null,0,2,2,0,0],[null,null,1,2,null,null],'sus'],['Asus4','Asus4','Sus / Add',[null,0,2,2,3,0],[null,null,1,2,3,null],'sus'],['Dsus2','Dsus2','Sus / Add',[null,null,0,2,3,0],[null,null,null,1,3,null],'sus'],['Dsus4','Dsus4','Sus / Add',[null,null,0,2,3,3],[null,null,null,1,2,3],'sus'],['Esus4','Esus4','Sus / Add',[0,2,2,2,0,0],[null,1,2,3,null,null],'sus'],['Cadd9','Cadd9','Sus / Add',[null,3,2,0,3,0],[null,2,1,null,3,null],'add'],['Gadd9','Gadd9','Sus / Add',[3,2,0,2,0,3],[2,1,null,3,null,4],'add'],['Dadd9','Dadd9','Sus / Add',[null,null,0,2,3,0],[null,null,null,1,2,null],'add'],
 ['E5','E5','Power',[0,2,2,null,null,null],[null,1,2,null,null,null],'power'],['A5','A5','Power',[null,0,2,2,null,null],[null,null,1,2,null,null],'power'],['G5','G5','Power',[3,5,5,null,null,null],[1,3,4,null,null,null],'power'],['C5','C5','Power',[null,3,5,5,null,null],[null,1,3,4,null,null],'power'],['D5','D5','Power',[null,null,0,2,3,null],[null,null,null,1,2,null],'power'],['F5','F5','Power',[1,3,3,null,null,null],[1,3,4,null,null,null],'power']
]
export const CHORDS = raw.map(args=>chord(...args))
export const CHORD_CATEGORIES: ChordCategory[] = ['Major','Minor','7th','Sus / Add','Power']
export function normalizeChordName(name:string):string { return name.trim().replace(/♯/g,'#').replace(/♭/g,'b') }
const chordLookup = new Map<string,ChordDefinition>()
CHORDS.forEach((item)=>{ chordLookup.set(normalizeChordName(item.id),item); chordLookup.set(normalizeChordName(item.name),item) })
export function findChord(name:string):ChordDefinition|undefined { return chordLookup.get(normalizeChordName(name)) }
export function transposeChordName(name:string,semitones:number):string { const ascii=name.replace('♯','#').replace('♭','b'); const m=ascii.match(/^([A-G](?:#|b)?)(.*)$/); if(!m)return name; const useSharps = prefersSharps(name); const root=useSharps ? (ENHARMONIC_SHARP[m[1]!]??m[1]!) : (ENHARMONIC[m[1]!]??m[1]!); const rootIndex = (useSharps ? ROOTS_SHARP : ROOTS).indexOf(root); if(rootIndex<0)return name; return (useSharps ? ROOTS_SHARP : ROOTS)[(rootIndex+semitones%12+12)%12]!+m[2]! }

const GENERATED_INTERVALS: Array<[RegExp, number[]]> = [
 [/maj7$/,[0,4,7,11,12]], [/m7$/,[0,3,7,10,12]], [/7$/,[0,4,7,10,12]],
 [/sus2$/,[0,2,7,12]], [/sus4$/,[0,5,7,12]], [/add9$/,[0,4,7,14]], [/5$/,[0,7,12]], [/m$/,[0,3,7,12]], [/$/,[0,4,7,12]],
]
const resolvedMidiCache = new Map<string,number[]>()
export function resolveChordMidi(name:string):number[] {
 const cacheKey=normalizeChordName(name)
 const cached=resolvedMidiCache.get(cacheKey);if(cached)return [...cached]
 const known=findChord(name)?.midi.filter((midi):midi is number=>midi!==null)
 if(known?.length){resolvedMidiCache.set(cacheKey,known);return [...known]}
 const ascii=name.trim().replace('♯','#').replace('♭','b');const match=ascii.match(/^([A-G](?:#|b)?)(.*)$/)
 if(!match)return []
 const pitchClass=ROOT_PITCH_CLASS[match[1]!];if(pitchClass===undefined)return []
 const root=40+(pitchClass-4+12)%12;const suffix=match[2]!
 const intervals=GENERATED_INTERVALS.find(([pattern])=>pattern.test(suffix))?.[1]??GENERATED_INTERVALS.at(-1)![1]
 const resolved=intervals.map(interval=>root+interval);resolvedMidiCache.set(cacheKey,resolved);return [...resolved]
}
