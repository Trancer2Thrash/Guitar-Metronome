import { useEffect, useRef, useState } from 'react'
import { TunerEngine, type TunerResult } from './tunerEngine'

export default function TunerPage() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'error'>('idle')
  const [result, setResult] = useState<TunerResult>({ frequency: 0, note: '-', cents: 0, active: false })
  const engine = useRef<TunerEngine | null>(null)

  useEffect(() => {
    return () => {
      engine.current?.stop()
    }
  }, [])

  async function start() {
    try {
      engine.current ??= new TunerEngine()
      setStatus('listening')
      await engine.current.start((r) => setResult(r))
    } catch {
      setStatus('error')
    }
  }

  function stop() {
    engine.current?.stop()
    setStatus('idle')
    setResult({ frequency: 0, note: '-', cents: 0, active: false })
  }

  return (
    <main className="tool-page tuner-page">
      <section className="tool-hero">
        <span className="tool-kicker">03 / TUNER</span>
        <p>弹奏单根琴弦，实时检测音高。</p>
      </section>
      <div className="tuner-display">
        <div className={`tuner-note ${result.active ? 'active' : ''}`}>{result.note}</div>
        <div className="tuner-freq">{result.active ? `${result.frequency} Hz` : '-'}</div>
        <div className="tuner-cents" style={{ color: Math.abs(result.cents) <= 5 ? '#4ade80' : '#fbbf24' }}>
          {result.active ? `${result.cents > 0 ? '+' : ''}${result.cents} cents` : ''}
        </div>
        <div className="tuner-meter">
          <div className="tuner-meter__center" />
          <div
            className="tuner-meter__needle"
            style={{ transform: `translateX(${Math.max(-50, Math.min(50, result.cents))}%)` }}
          />
        </div>
      </div>
      <div className="tuner-actions">
        {status === 'listening' ? (
          <button type="button" className="primary-action" onClick={stop}>停止调音</button>
        ) : (
          <button type="button" className="primary-action" onClick={start}>开始调音</button>
        )}
        {status === 'error' && <p className="tuner-error">无法访问麦克风，请检查权限设置。</p>}
      </div>
    </main>
  )
}
