const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface TunerResult {
  frequency: number
  note: string
  cents: number
  active: boolean
}

export class TunerEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private rafId: number | null = null
  private buffer: Float32Array | null = null
  private running = false

  async start(onUpdate: (result: TunerResult) => void) {
    if (this.running) return
    this.running = true
    this.audioContext = new AudioContext()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    this.source = this.audioContext.createMediaStreamSource(stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.source.connect(this.analyser)
    this.buffer = new Float32Array(this.analyser.fftSize)

    const tick = () => {
      if (!this.analyser || !this.buffer || !this.running) return
      const buf = this.buffer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.analyser.getFloatTimeDomainData(buf as any)
      const frequency = this.detectPitch(buf)
      const result = frequency > 0 ? this.analyze(frequency) : { frequency: 0, note: '-', cents: 0, active: false }
      onUpdate(result)
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.source?.mediaStream.getTracks().forEach((track) => track.stop())
    void this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.source = null
    this.buffer = null
  }

  private analyze(frequency: number): TunerResult {
    const noteNum = 12 * Math.log2(frequency / 440) + 69
    const midi = Math.round(noteNum)
    const cents = Math.round((noteNum - midi) * 100)
    const note = NOTE_NAMES[midi % 12]!
    return { frequency: Math.round(frequency * 10) / 10, note, cents, active: true }
  }

  private detectPitch(buffer: Float32Array): number {
    const sampleRate = this.audioContext?.sampleRate ?? 44100
    const n = buffer.length

    // Autocorrelation
    const autocorr = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < n - i; j++) {
        sum += buffer[j]! * buffer[j + i]!
      }
      autocorr[i] = sum
    }

    // Find first peak after zero crossing
    let r1 = 0
    let r2 = 0
    let found = false
    for (let i = 1; i < n - 1; i++) {
      if (!found && autocorr[i]! < 0 && autocorr[i - 1]! >= 0) {
        r1 = i
        found = true
        continue
      }
      if (found && i > r1 + 1 && autocorr[i]! > autocorr[i - 1]! && autocorr[i]! > autocorr[i + 1]!) {
        r2 = i
        break
      }
    }

    if (r2 <= r1) return 0
    return sampleRate / (r2 - r1)
  }
}
