import type { QuietCountProgram } from '../training/quietCount'
import type { TempoProgram } from '../training/tempoTrainer'

export type TrainerMode = 'off' | 'tempo' | 'quiet'

export interface TrainerConfig {
  mode: TrainerMode
  tempoProgram: TempoProgram
  quietProgram: QuietCountProgram
  sessionMinutes: number
}

export const DEFAULT_TRAINER_CONFIG: TrainerConfig = {
  mode: 'off',
  tempoProgram: {
    startBpm: 60,
    targetBpm: 100,
    stepBpm: 2,
    changeEveryBars: 8,
    targetBehavior: 'reverse',
    repetitions: 3,
  },
  quietProgram: {
    audibleBars: 2,
    silentBars: 1,
    repetitions: 'infinite',
    hideVisuals: true,
  },
  sessionMinutes: 0,
}
