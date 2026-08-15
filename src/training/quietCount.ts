export type QuietBars = number | { min: number; max: number }
export type QuietPhase = 'audible' | 'silent' | 'completed' | 'paused'

export interface QuietCountProgram {
  audibleBars: number
  silentBars: QuietBars
  repetitions: number | 'infinite'
  hideVisuals: boolean
}

export interface QuietCountSession {
  program: QuietCountProgram
  phase: QuietPhase
  processedBars: number
  phaseStartedAtBar: number
  currentSilentBars: number
  completedRepetitions: number
  random: () => number
  phaseBeforePause?: Exclude<QuietPhase, 'paused'>
}

function chooseSilentBars(value: QuietBars, random: () => number): number {
  if (typeof value === 'number') return Math.max(1, Math.round(value))
  const min = Math.max(1, Math.round(Math.min(value.min, value.max)))
  const max = Math.max(min, Math.round(Math.max(value.min, value.max)))
  return min + Math.floor(random() * (max - min + 1))
}

export function createQuietCountSession(program: QuietCountProgram, random: () => number = Math.random): QuietCountSession {
  if (!Number.isInteger(program.audibleBars) || program.audibleBars < 1) throw new Error('有声小节数必须至少为 1。')
  return {
    program,
    phase: 'audible',
    processedBars: 0,
    phaseStartedAtBar: 0,
    currentSilentBars: typeof program.silentBars === 'number' ? Math.max(1, Math.round(program.silentBars)) : 0,
    completedRepetitions: 0,
    random,
  }
}

export function advanceQuietCount(session: QuietCountSession, totalCompletedBars: number): QuietCountSession {
  if (session.phase === 'paused' || session.phase === 'completed' || totalCompletedBars <= session.processedBars) return session
  let next = { ...session, processedBars: totalCompletedBars }

  while (next.phase !== 'completed') {
    const phaseLength = next.phase === 'audible' ? next.program.audibleBars : next.currentSilentBars
    if (totalCompletedBars < next.phaseStartedAtBar + phaseLength) break

    if (next.phase === 'audible') {
      next = {
        ...next,
        phase: 'silent',
        phaseStartedAtBar: next.phaseStartedAtBar + phaseLength,
        currentSilentBars: chooseSilentBars(next.program.silentBars, next.random),
      }
      continue
    }

    const completed = next.completedRepetitions + 1
    const done = next.program.repetitions !== 'infinite' && completed >= next.program.repetitions
    next = {
      ...next,
      phase: done ? 'completed' : 'audible',
      phaseStartedAtBar: next.phaseStartedAtBar + phaseLength,
      completedRepetitions: completed,
    }
    if (done) break
  }
  return next
}

export function pauseQuietCount(session: QuietCountSession): QuietCountSession {
  if (session.phase === 'paused' || session.phase === 'completed') return session
  return { ...session, phaseBeforePause: session.phase, phase: 'paused' }
}

export function resumeQuietCount(session: QuietCountSession): QuietCountSession {
  if (session.phase !== 'paused') return session
  return { ...session, phase: session.phaseBeforePause ?? 'audible', phaseBeforePause: undefined }
}
