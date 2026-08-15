import { clampBpm } from '../rhythm/meter'

export type TargetBehavior = 'stop' | 'hold' | 'restart' | 'reverse'
export type Repetitions = number | 'infinite'
export type TempoSessionStatus = 'running' | 'holding' | 'completed' | 'paused'

export interface TempoProgram {
  startBpm: number
  targetBpm: number
  stepBpm: number
  changeEveryBars: number
  targetBehavior: TargetBehavior
  repetitions: Repetitions
}

export interface TempoSession {
  program: TempoProgram
  status: TempoSessionStatus
  currentBpm: number
  direction: 1 | -1
  processedBars: number
  nextChangeAtBar: number
  completedRepetitions: number
  stageIndex: number
  statusBeforePause?: Exclude<TempoSessionStatus, 'paused'>
}

export function validateTempoProgram(program: TempoProgram): string | null {
  if (program.startBpm === program.targetBpm) return '起始 BPM 和目标 BPM 必须不同。'
  if (program.stepBpm < 1 || program.stepBpm > 20) return '每次变化量必须在 1–20 BPM 之间。'
  if (!Number.isInteger(program.changeEveryBars) || program.changeEveryBars < 1) return '阶段小节数必须至少为 1。'
  if (program.repetitions !== 'infinite' && (!Number.isInteger(program.repetitions) || program.repetitions < 1 || program.repetitions > 99)) {
    return '循环次数必须在 1–99 之间。'
  }
  return null
}

export function createTempoSession(program: TempoProgram): TempoSession {
  const error = validateTempoProgram(program)
  if (error) throw new Error(error)
  const normalized: TempoProgram = {
    ...program,
    startBpm: clampBpm(program.startBpm),
    targetBpm: clampBpm(program.targetBpm),
    stepBpm: Math.round(program.stepBpm),
    changeEveryBars: Math.round(program.changeEveryBars),
  }
  return {
    program: normalized,
    status: 'running',
    currentBpm: normalized.startBpm,
    direction: normalized.targetBpm > normalized.startBpm ? 1 : -1,
    processedBars: 0,
    nextChangeAtBar: normalized.changeEveryBars,
    completedRepetitions: 0,
    stageIndex: 0,
  }
}

function reached(value: number, target: number, direction: 1 | -1): boolean {
  return direction === 1 ? value >= target : value <= target
}

function repetitionsComplete(session: TempoSession, completed: number): boolean {
  return session.program.repetitions !== 'infinite' && completed >= session.program.repetitions
}

function changeStage(session: TempoSession): TempoSession {
  const destination = session.direction === 1
    ? Math.max(session.program.startBpm, session.program.targetBpm)
    : Math.min(session.program.startBpm, session.program.targetBpm)
  const candidate = session.currentBpm + session.program.stepBpm * session.direction
  const currentBpm = reached(candidate, destination, session.direction) ? destination : candidate
  const next: TempoSession = { ...session, currentBpm, stageIndex: session.stageIndex + 1 }

  if (!reached(currentBpm, destination, session.direction)) return next

  switch (session.program.targetBehavior) {
    case 'stop':
      return { ...next, status: 'completed', completedRepetitions: 1 }
    case 'hold':
      return { ...next, status: 'holding', completedRepetitions: 1 }
    case 'restart': {
      const completed = session.completedRepetitions + 1
      if (repetitionsComplete(session, completed)) return { ...next, status: 'completed', completedRepetitions: completed }
      return {
        ...next,
        currentBpm: session.program.startBpm,
        completedRepetitions: completed,
        direction: session.program.targetBpm > session.program.startBpm ? 1 : -1,
      }
    }
    case 'reverse': {
      const atOriginalStart = currentBpm === session.program.startBpm && session.direction !== (session.program.targetBpm > session.program.startBpm ? 1 : -1)
      const completed = atOriginalStart ? session.completedRepetitions + 1 : session.completedRepetitions
      if (atOriginalStart && repetitionsComplete(session, completed)) {
        return { ...next, status: 'completed', completedRepetitions: completed }
      }
      return { ...next, direction: session.direction === 1 ? -1 : 1, completedRepetitions: completed }
    }
  }
}

export function advanceTempoStage(session: TempoSession, totalCompletedBars: number): TempoSession {
  if (session.status !== 'running' || totalCompletedBars <= session.processedBars) return session
  let next = { ...session, processedBars: totalCompletedBars }
  while (next.status === 'running' && totalCompletedBars >= next.nextChangeAtBar) {
    next = changeStage(next)
    next = { ...next, nextChangeAtBar: next.nextChangeAtBar + next.program.changeEveryBars }
  }
  return next
}

export function pauseTempoSession(session: TempoSession): TempoSession {
  if (session.status === 'paused' || session.status === 'completed') return session
  return { ...session, statusBeforePause: session.status, status: 'paused' }
}

export function resumeTempoSession(session: TempoSession): TempoSession {
  if (session.status !== 'paused') return session
  return { ...session, status: session.statusBeforePause ?? 'running', statusBeforePause: undefined }
}
