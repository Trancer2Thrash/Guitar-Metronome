import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import { DEFAULT_TRAINER_CONFIG } from '../domain/trainer'
import type { Preset } from '../storage/presetSchema'
import type { PresetStore } from '../storage/presetStore'
import { PresetPanel } from './PresetPanel'

function fakeStore(): PresetStore {
  let presets: Preset[] = []
  return {
    list: vi.fn(() => presets),
    save: vi.fn((preset) => { presets = [preset]; return preset }),
    remove: vi.fn((id) => { presets = presets.filter((preset) => preset.id !== id) }),
    loadLastSettings: vi.fn(() => DEFAULT_SETTINGS),
    saveLastSettings: vi.fn(),
    exportJson: vi.fn(() => '{"schemaVersion":1,"exportedAt":"2026-08-15T12:00:00.000Z","presets":[]}'),
    importJson: vi.fn(() => []),
  }
}

describe('PresetPanel', () => {
  it('saves a named preset with the current settings', async () => {
    const user = userEvent.setup()
    const store = fakeStore()
    render(<PresetPanel store={store} settings={DEFAULT_SETTINGS} trainer={DEFAULT_TRAINER_CONFIG} onLoad={vi.fn()} />)

    await user.type(screen.getByLabelText('预设名称'), '音阶热身')
    await user.click(screen.getByRole('button', { name: '保存预设' }))

    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ name: '音阶热身', settings: DEFAULT_SETTINGS }))
    expect(screen.getByText('音阶热身')).toBeInTheDocument()
  })

  it('shows invalid import errors without replacing current presets', async () => {
    const user = userEvent.setup()
    const store = fakeStore()
    vi.mocked(store.importJson).mockImplementation(() => { throw new Error('导入文件格式或数据无效。') })
    render(<PresetPanel store={store} settings={DEFAULT_SETTINGS} trainer={DEFAULT_TRAINER_CONFIG} onLoad={vi.fn()} />)

    const file = new File(['{"bad":true}'], 'bad.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('导入预设文件'), file)

    expect(screen.getByRole('alert')).toHaveTextContent(/导入文件格式/)
  })
})
