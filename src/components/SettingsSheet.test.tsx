import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import { SettingsSheet } from './SettingsSheet'

describe('SettingsSheet', () => {
  it('changes meter and preserves a direct accessible workflow', async () => {
    const user = userEvent.setup()
    const onMeterChange = vi.fn()
    render(
      <SettingsSheet
        open
        activeTab="rhythm"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onTabChange={vi.fn()}
        onMeterChange={onMeterChange}
        onSubdivisionChange={vi.fn()}
        onAccentChange={vi.fn()}
        onSoundChange={vi.fn()}
        onVolumeChange={vi.fn()}
        onCountInChange={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('拍号分子'), '6')
    expect(onMeterChange).toHaveBeenCalledWith(6, 4)
    expect(screen.getByRole('dialog', { name: '节拍器设置' })).toBeInTheDocument()
  })
})
