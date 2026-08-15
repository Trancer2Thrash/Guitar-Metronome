import { useEffect, useReducer, useRef, useState } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import { BeatScheduler } from '../audio/BeatScheduler'
import type { ScheduledVisualBeat } from '../domain/metronome'
import {
  type BeatAccent,
  type ClickSound,
  type MeterDenominator,
  type MetronomeSettings,
  type Subdivision,
} from '../domain/metronome'
import { clampBpm, createMeter, cycleAccent as nextAccent } from '../rhythm/meter'
import { TapTempoTracker } from '../rhythm/tapTempo'
import { createPresetStore, type PresetStore } from '../storage/presetStore'

export type TransportStatus = 'stopped' | 'playing' | 'paused'

export interface MetronomeRuntime {
  status: TransportStatus
  beatIndex: number
  subdivisionIndex: number
  barNumber: number
  elapsedSeconds: number
  error: string | null
}

export interface MetronomeEngine {
  start(settings: MetronomeSettings): Promise<void>
  resume(): Promise<void>
  pause(): Promise<void>
  stop(): void
  updateSettings(settings: MetronomeSettings): void
  drainVisualEvents(): ScheduledVisualBeat[]
  now(): number
  dispose(): Promise<void>
}

class BrowserMetronomeEngine implements MetronomeEngine {
  private readonly audio = new AudioEngine()
  private readonly scheduler = new BeatScheduler({ clock: this.audio, sink: this.audio })
  private worker: Worker | null = null
  private fallbackTimer: number | null = null

  async start(settings: MetronomeSettings): Promise<void> {
    await this.audio.ensureReady()
    this.audio.configure(settings)
    this.scheduler.start(settings)
    this.startTicker()
  }

  async resume(): Promise<void> {
    await this.audio.ensureReady()
    this.scheduler.resume()
    this.startTicker()
  }

  async pause(): Promise<void> {
    this.stopTicker()
    this.scheduler.pause()
    await this.audio.suspend()
  }

  stop(): void {
    this.stopTicker()
    this.scheduler.stop()
    this.audio.stop()
  }

  updateSettings(settings: MetronomeSettings): void {
    this.audio.configure(settings)
    this.scheduler.updateSettings(settings)
  }

  drainVisualEvents(): ScheduledVisualBeat[] {
    return this.scheduler.drainVisualEvents(this.audio.now())
  }

  now(): number {
    return this.audio.now()
  }

  async dispose(): Promise<void> {
    this.stopTicker()
    this.worker?.terminate()
    this.worker = null
    this.scheduler.dispose()
    await this.audio.dispose()
  }

  private startTicker(): void {
    if (this.worker || this.fallbackTimer !== null) return
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../audio/scheduler.worker.ts', import.meta.url), { type: 'module' })
      this.worker.addEventListener('message', () => this.scheduler.tick())
      this.worker.postMessage({ type: 'start', intervalMs: 25 })
      return
    }
    this.fallbackTimer = window.setInterval(() => this.scheduler.tick(), 25)
  }

  private stopTicker(): void {
    if (this.worker) this.worker.postMessage({ type: 'stop' })
    if (this.fallbackTimer !== null) window.clearInterval(this.fallbackTimer)
    this.fallbackTimer = null
  }
}

interface ControllerState {
  settings: MetronomeSettings
  runtime: MetronomeRuntime
}

type ControllerAction =
  | { type: 'settings'; settings: MetronomeSettings }
  | { type: 'status'; status: TransportStatus; error?: string | null }
  | { type: 'visual'; event?: ScheduledVisualBeat; elapsedSeconds: number }
  | { type: 'reset' }

const initialRuntime: MetronomeRuntime = {
  status: 'stopped',
  beatIndex: 0,
  subdivisionIndex: 0,
  barNumber: 1,
  elapsedSeconds: 0,
  error: null,
}

function reducer(state: ControllerState, action: ControllerAction): ControllerState {
  switch (action.type) {
    case 'settings': return { ...state, settings: action.settings }
    case 'status': return {
      ...state,
      runtime: { ...state.runtime, status: action.status, error: action.error ?? null },
    }
    case 'visual': return {
      ...state,
      runtime: {
        ...state.runtime,
        beatIndex: action.event?.beatIndex ?? state.runtime.beatIndex,
        subdivisionIndex: action.event?.subdivisionIndex ?? state.runtime.subdivisionIndex,
        barNumber: action.event?.barNumber ?? state.runtime.barNumber,
        elapsedSeconds: action.elapsedSeconds,
      },
    }
    case 'reset': return { ...state, runtime: initialRuntime }
  }
}

const createDefaultEngine = () => new BrowserMetronomeEngine()
const defaultNowMs = () => performance.now()

export interface UseMetronomeOptions {
  engineFactory?: () => MetronomeEngine
  storage?: Storage
  nowMs?: () => number
}

export function useMetronome({
  engineFactory = createDefaultEngine,
  storage = window.localStorage,
  nowMs = defaultNowMs,
}: UseMetronomeOptions = {}) {
  const [store] = useState<PresetStore>(() => createPresetStore(storage))
  const [engine] = useState<MetronomeEngine>(() => engineFactory())
  const [tapTracker] = useState(() => new TapTempoTracker())
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    settings: store.loadLastSettings(),
    runtime: initialRuntime,
  }))
  const startedAtRef = useRef(0)
  const accumulatedMsRef = useRef(0)

  function applySettings(settings: MetronomeSettings): void {
    dispatch({ type: 'settings', settings })
    store.saveLastSettings(settings)
    engine.updateSettings(settings)
  }

  async function play(): Promise<void> {
    const activeEngine = engine
    if (state.runtime.status === 'playing') return
    try {
      if (state.runtime.status === 'paused') await activeEngine.resume()
      else {
        accumulatedMsRef.current = 0
        await activeEngine.start(state.settings)
      }
      startedAtRef.current = nowMs()
      dispatch({ type: 'status', status: 'playing' })
    } catch (error) {
      dispatch({ type: 'status', status: 'stopped', error: error instanceof Error ? error.message : '无法启动音频。' })
    }
  }

  async function pause(): Promise<void> {
    if (state.runtime.status !== 'playing') return
    accumulatedMsRef.current += nowMs() - startedAtRef.current
    await engine.pause()
    dispatch({ type: 'status', status: 'paused' })
  }

  function stop(): void {
    engine.stop()
    accumulatedMsRef.current = 0
    dispatch({ type: 'reset' })
  }

  function setBpm(bpm: number): void {
    applySettings({ ...state.settings, bpm: clampBpm(bpm) })
  }

  function tap(timestampMs = nowMs()): number | null {
    const bpm = tapTracker.tap(timestampMs)
    if (bpm !== null) setBpm(bpm)
    return bpm
  }

  function setMeter(numerator: number, denominator: MeterDenominator): void {
    applySettings({ ...state.settings, meter: createMeter(numerator, denominator) })
  }

  function setSubdivision(subdivision: Subdivision): void {
    applySettings({ ...state.settings, subdivision })
  }

  function cycleAccent(beatIndex: number): void {
    const settings = state.settings
    const accents = [...settings.meter.accents]
    accents[beatIndex] = nextAccent(accents[beatIndex] ?? 'weak')
    applySettings({ ...settings, meter: { ...settings.meter, accents } })
  }

  function setAccent(beatIndex: number, accent: BeatAccent): void {
    const settings = state.settings
    const accents = [...settings.meter.accents]
    accents[beatIndex] = accent
    applySettings({ ...settings, meter: { ...settings.meter, accents } })
  }

  function setSound(sound: ClickSound): void {
    applySettings({ ...state.settings, sound })
  }

  function setVolume(volume: number): void {
    applySettings({ ...state.settings, volume: Math.min(1, Math.max(0, volume)) })
  }

  function setCountInBars(countInBars: MetronomeSettings['countInBars']): void {
    applySettings({ ...state.settings, countInBars })
  }

  useEffect(() => {
    if (state.runtime.status !== 'playing') return
    const requestFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(nowMs()), 16)
    const cancelFrame = window.cancelAnimationFrame
      ? window.cancelAnimationFrame.bind(window)
      : window.clearTimeout.bind(window)
    let frame = 0

    const update = () => {
      const events = engine.drainVisualEvents() ?? []
      const latest = events.at(-1)
      const elapsedSeconds = (accumulatedMsRef.current + nowMs() - startedAtRef.current) / 1000
      dispatch({ type: 'visual', event: latest, elapsedSeconds })
      frame = requestFrame(update)
    }
    frame = requestFrame(update)
    return () => cancelFrame(frame)
  }, [engine, nowMs, state.runtime.status])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && state.runtime.status === 'playing') void pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (state.runtime.status === 'playing') void pause()
        else void play()
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        const amount = event.shiftKey ? 5 : 1
        setBpm(state.settings.bpm + (event.key === 'ArrowUp' ? amount : -amount))
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        tap()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => () => { void engine.dispose() }, [engine])

  return {
    settings: state.settings,
    runtime: state.runtime,
    store,
    actions: {
      play,
      pause,
      stop,
      setBpm,
      tap,
      setMeter,
      setSubdivision,
      cycleAccent,
      setAccent,
      setSound,
      setVolume,
      setCountInBars,
    },
  }
}
