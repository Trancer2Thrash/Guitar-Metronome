import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TempoControls } from './TempoControls'

describe('TempoControls', () => {
  it('changes tempo with precise step buttons and the labeled input', async () => {
    const user = userEvent.setup()
    const onBpmChange = vi.fn()
    render(<TempoControls bpm={96} onBpmChange={onBpmChange} onTap={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '提高 1 BPM' }))
    expect(onBpmChange).toHaveBeenCalledWith(97)

    await user.clear(screen.getByLabelText('BPM'))
    await user.type(screen.getByLabelText('BPM'), '128')
    expect(onBpmChange).toHaveBeenLastCalledWith(128)
  })

  it('exposes tap tempo as a direct action', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    render(<TempoControls bpm={96} onBpmChange={vi.fn()} onTap={onTap} />)

    await user.click(screen.getByRole('button', { name: 'Tap Tempo' }))
    expect(onTap).toHaveBeenCalledTimes(1)
  })
})
