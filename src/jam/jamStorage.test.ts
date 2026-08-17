import { describe, expect, it } from 'vitest'
import { DEFAULT_JAM_SESSION } from './jamModel'
import { loadJamSession, saveJamSession } from './jamStorage'
class MemoryStorage implements Storage { private data=new Map<string,string>();get length(){return this.data.size}clear(){this.data.clear()}getItem(k:string){return this.data.get(k)??null}key(i:number){return [...this.data.keys()][i]??null}removeItem(k:string){this.data.delete(k)}setItem(k:string,v:string){this.data.set(k,v)} }
describe('jam storage',()=>{it('round trips valid sessions',()=>{const storage=new MemoryStorage();saveJamSession({...DEFAULT_JAM_SESSION,bpm:132},storage);expect(loadJamSession(storage).bpm).toBe(132)});it('falls back safely for corrupt data',()=>{const storage=new MemoryStorage();storage.setItem('six-string-jam-v1','{"bpm":999}');expect(loadJamSession(storage)).toEqual(DEFAULT_JAM_SESSION)})})
