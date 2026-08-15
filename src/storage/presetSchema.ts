import { z } from 'zod'

export const BeatAccentSchema = z.enum(['strong', 'medium', 'weak', 'mute'])
export const SubdivisionSchema = z.enum(['quarter', 'eighth', 'triplet', 'sixteenth', 'swing'])
export const ClickSoundSchema = z.enum(['classic', 'woodblock', 'sticks'])

export const MeterSchema = z.object({
  numerator: z.number().int().min(1).max(16),
  denominator: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16)]),
  accents: z.array(BeatAccentSchema).min(1).max(16),
}).refine((meter) => meter.accents.length === meter.numerator, {
  message: '重音数量必须与拍号分子一致。',
  path: ['accents'],
})

export const MetronomeSettingsSchema = z.object({
  bpm: z.number().int().min(20).max(400),
  meter: MeterSchema,
  subdivision: SubdivisionSchema,
  sound: ClickSoundSchema,
  volume: z.number().min(0).max(1),
  countInBars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)]),
})

export const TempoProgramSchema = z.object({
  startBpm: z.number().int().min(20).max(400),
  targetBpm: z.number().int().min(20).max(400),
  stepBpm: z.number().int().min(1).max(20),
  changeEveryBars: z.number().int().min(1).max(128),
  targetBehavior: z.enum(['stop', 'hold', 'restart', 'reverse']),
  repetitions: z.union([z.literal('infinite'), z.number().int().min(1).max(99)]),
}).refine((program) => program.startBpm !== program.targetBpm, {
  message: '起始 BPM 和目标 BPM 必须不同。',
  path: ['targetBpm'],
})

const RandomSilentBarsSchema = z.object({
  min: z.number().int().min(1).max(128),
  max: z.number().int().min(1).max(128),
}).refine((value) => value.min <= value.max, {
  message: '随机静音范围的最小值不能大于最大值。',
  path: ['max'],
})

export const QuietCountProgramSchema = z.object({
  audibleBars: z.number().int().min(1).max(128),
  silentBars: z.union([z.number().int().min(1).max(128), RandomSilentBarsSchema]),
  repetitions: z.union([z.literal('infinite'), z.number().int().min(1).max(99)]),
  hideVisuals: z.boolean(),
})

export const PresetSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(40),
  kind: z.enum(['standard', 'tempo', 'quiet']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  settings: MetronomeSettingsSchema,
  tempoProgram: TempoProgramSchema.optional(),
  quietProgram: QuietCountProgramSchema.optional(),
}).superRefine((preset, context) => {
  if (preset.kind === 'tempo' && !preset.tempoProgram) {
    context.addIssue({ code: 'custom', path: ['tempoProgram'], message: '速度训练预设缺少训练参数。' })
  }
  if (preset.kind === 'quiet' && !preset.quietProgram) {
    context.addIssue({ code: 'custom', path: ['quietProgram'], message: '静音训练预设缺少训练参数。' })
  }
})

export const PresetExportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  presets: z.array(PresetSchema).max(100),
})

export type Preset = z.infer<typeof PresetSchema>
export type PresetExport = z.infer<typeof PresetExportSchema>
