import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import { SettingsSheet } from './SettingsSheet'

const baseProps = {
  open: true,
  activeTab: 'rhythm' as const,
  settings: DEFAULT_SETTINGS,
  onClose: vi.fn(),
  onTabChange: vi.fn(),
  onMeterChange: vi.fn(),
  onSubdivisionChange: vi.fn(),
  onAccentChange: vi.fn(),
  onSoundChange: vi.fn(),
  onVolumeChange: vi.fn(),
  onCountInChange: vi.fn(),
}

describe('SettingsSheet', () => {
  it('changes meter and preserves a direct accessible workflow', async () => {
    const user = userEvent.setup()
    const onMeterChange = vi.fn()
    render(<SettingsSheet {...baseProps} onMeterChange={onMeterChange} />)

    await user.selectOptions(screen.getByLabelText('拍号分子'), '6')
    expect(onMeterChange).toHaveBeenCalledWith(6, 4)
    expect(screen.getByRole('dialog', { name: '节拍器设置' })).toBeInTheDocument()
  })

  it('offers the full custom numerator range through 16', () => {
    render(<SettingsSheet {...baseProps} />)
    expect(screen.getByLabelText('拍号分子')).toContainHTML('<option value="16">16</option>')
  })
})
