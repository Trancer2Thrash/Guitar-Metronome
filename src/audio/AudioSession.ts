export type AudioSessionOwner = 'metronome' | 'chords' | 'jam'
type StopPlayback = () => void

export class AudioSessionManager {
  private currentOwner: AudioSessionOwner | null = null
  private stoppers = new Map<AudioSessionOwner, StopPlayback>()

  get owner() { return this.currentOwner }

  register(owner: AudioSessionOwner, stop: StopPlayback) {
    this.stoppers.set(owner, stop)
    return () => {
      if (this.stoppers.get(owner) === stop) this.stoppers.delete(owner)
      if (this.currentOwner === owner) this.currentOwner = null
    }
  }

  acquire(owner: AudioSessionOwner) {
    if (this.currentOwner && this.currentOwner !== owner) this.stoppers.get(this.currentOwner)?.()
    this.currentOwner = owner
  }

  release(owner: AudioSessionOwner) {
    if (this.currentOwner === owner) this.currentOwner = null
  }
}

export const audioSession = new AudioSessionManager()