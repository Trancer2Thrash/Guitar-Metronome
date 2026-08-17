import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { audioSession } from './audio/AudioSession'
import { FocusMode } from './components/FocusMode'
import { PresetPanel } from './components/PresetPanel'
import { QuickSettings } from './components/QuickSettings'
import { SettingsSheet, type SettingsTab } from './components/SettingsSheet'
import { StringPulse } from './components/StringPulse'
import { TempoControls } from './components/TempoControls'
import { TrainerPanel } from './components/TrainerPanel'
import { TransportButton } from './components/TransportButton'
import type { TrainerConfig } from './domain/trainer'
import { useMetronome } from './hooks/useMetronome'
import { createMeter } from './rhythm/meter'
import { useWakeLock } from './hooks/useWakeLock'
import type { PracticeSong } from './practice/practiceSongs'
import type { Preset } from './storage/presetSchema'

const ChordPage = lazy(() => import('./chords/ChordPage'))
const JamPage = lazy(() => import('./jam/JamPage'))
const PracticeLibrary = lazy(() => import('./practice/PracticeLibrary'))

type Route = 'metronome' | 'chords' | 'jam'

function readRoute(): Route {
  const value = window.location.hash.replace('#/', '')
  return value === 'chords' || value === 'jam' ? value : 'metronome'
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const metronome = useMetronome({ keyboardEnabled: route === 'metronome' })
  const stopMetronome = useRef(metronome.actions.stop)
  const wakeLock = useWakeLock(metronome.runtime.status === 'playing')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('rhythm')
  const [focusOpen, setFocusOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  useEffect(() => {
    const update = () => { setRoute(readRoute()); setLibraryOpen(false) }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => { stopMetronome.current = metronome.actions.stop })
  useEffect(() => audioSession.register('metronome', () => stopMetronome.current()), [])
  useEffect(() => {
    if (route !== 'metronome') {
      metronome.actions.stop()
      audioSession.release('metronome')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  const playMetronome = () => { audioSession.acquire('metronome'); void metronome.actions.play() }
  const pauseMetronome = () => { metronome.actions.pause(); audioSession.release('metronome') }
  const openSettings = (tab: SettingsTab) => { setActiveTab(tab); setSettingsOpen(true) }
  const loadPreset = (preset: Preset) => {
    metronome.actions.loadSettings(preset.settings)
    const trainer: TrainerConfig = {
      ...metronome.trainer,
      mode: preset.kind === 'tempo' ? 'tempo' : preset.kind === 'quiet' ? 'quiet' : 'off',
      ...(preset.tempoProgram ? { tempoProgram: preset.tempoProgram } : {}),
      ...(preset.quietProgram ? { quietProgram: preset.quietProgram } : {}),
    }
    metronome.actions.setTrainerConfig(trainer)
    setSettingsOpen(false)
  }
  const applyPracticeSong = (song: PracticeSong, bpm: number) => {
    metronome.actions.loadSettings({ ...metronome.settings, bpm, meter: createMeter(song.meter, 4) })
    setLibraryOpen(false)
  }

  return <div className={`app-shell app-shell--${route}`}>
    <header className="app-header">
      <div className="brand"><span className="brand__mark" aria-hidden="true">VI</span><span className="brand__copy"><h1>六弦练习室</h1><span>Six String Practice Lab</span></span></div>
      <nav className="module-nav" aria-label="练习工具"><a aria-current={route === 'metronome' ? 'page' : undefined} className={route === 'metronome' ? 'active' : ''} href="#/metronome"><span>01</span>Metronome</a><a aria-current={route === 'chords' ? 'page' : undefined} className={route === 'chords' ? 'active' : ''} href="#/chords"><span>02</span>Chord</a><a aria-current={route === 'jam' ? 'page' : undefined} className={route === 'jam' ? 'active' : ''} href="#/jam"><span>03</span>Jam Loop</a></nav>
      {route === 'metronome' && <div className="header-actions"><button className="icon-button" type="button" aria-label="打开练习曲目" onClick={() => setLibraryOpen(true)}><span aria-hidden="true">≡</span><span className="icon-button__label">曲目</span></button><button className="icon-button" type="button" aria-label="进入专注模式" onClick={() => setFocusOpen(true)}><span aria-hidden="true">⌗</span><span className="icon-button__label">专注</span></button><button className="icon-button" type="button" aria-label="打开设置" onClick={() => openSettings('rhythm')}><span aria-hidden="true">☷</span><span className="icon-button__label">设置</span></button></div>}
    </header>

    {route === 'metronome' ? <>
      <main className="metronome-stage"><div className="stage-heading"><div><span className="stage-heading__index">01 / PULSE</span><p>六根琴弦构成练习标尺，强弱拍在同一条时间线上推进。</p></div><div className="stage-heading__status">当前小节<strong>{metronome.runtime.barNumber.toString().padStart(2, '0')}</strong></div></div>{metronome.runtime.error && <div className="error-banner" role="alert">{metronome.runtime.error}</div>}<div className="practice-phase" aria-live="polite">{metronome.phaseLabel}</div><StringPulse meter={metronome.settings.meter} activeBeat={metronome.runtime.beatIndex} hideVisuals={metronome.hideVisuals} /><TempoControls bpm={metronome.settings.bpm} onBpmChange={metronome.actions.setBpm} onTap={() => metronome.actions.tap()} /><QuickSettings settings={metronome.settings} trainerMode={metronome.trainer.mode} onOpen={openSettings} /></main>
      <footer className="transport-dock"><div className="transport-meta"><strong>{formatDuration(metronome.runtime.elapsedSeconds)}</strong>本次练习 · {wakeLock === 'active' ? '屏幕常亮' : '本地运行'}</div><div className="transport-center"><button className="reset-button" type="button" onClick={() => void metronome.actions.reset()} aria-label="Reset 重置节拍进度"><span aria-hidden="true">↺</span>Reset</button><TransportButton status={metronome.runtime.status} onPlay={playMetronome} onPause={pauseMetronome} /></div><div className="transport-meta transport-meta--right"><strong>{metronome.settings.meter.numerator}/{metronome.settings.meter.denominator}</strong>空格播放 · T 键测速</div></footer>
      <SettingsSheet open={settingsOpen} activeTab={activeTab} settings={metronome.settings} onClose={() => setSettingsOpen(false)} onTabChange={setActiveTab} onMeterChange={metronome.actions.setMeter} onSubdivisionChange={metronome.actions.setSubdivision} onAccentChange={metronome.actions.setAccent} onSoundChange={metronome.actions.setSound} onVolumeChange={metronome.actions.setVolume} onCountInChange={metronome.actions.setCountInBars} trainerContent={<TrainerPanel key={JSON.stringify(metronome.trainer)} value={metronome.trainer} onChange={metronome.actions.setTrainerConfig} />} presetContent={<PresetPanel store={metronome.store} settings={metronome.settings} trainer={metronome.trainer} onLoad={loadPreset} />} />
      <FocusMode open={focusOpen} settings={metronome.settings} runtime={metronome.runtime} hideVisuals={metronome.hideVisuals} phaseLabel={metronome.phaseLabel} onExit={() => setFocusOpen(false)} onPlay={playMetronome} onPause={pauseMetronome} onVolumeChange={metronome.actions.setVolume} />
      {libraryOpen && <Suspense fallback={<div className="practice-library-backdrop"><div className="tool-loading">正在装载曲目…</div></div>}><PracticeLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} onApply={applyPracticeSong} /></Suspense>}
    </> : <Suspense fallback={<main className="tool-loading">正在装载练习工具…</main>}>{route === 'chords' ? <ChordPage /> : <JamPage />}</Suspense>}
  </div>
}
