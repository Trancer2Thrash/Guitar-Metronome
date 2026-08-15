import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/metronome'
import { FocusMode } from './FocusMode'

describe('FocusMode', () => {
  it('shows stage-sized practice information and exits', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    render(
      <FocusMode
        open
        settings={DEFAULT_SETTINGS}
        runtime={{ status: 'playing', beatIndex: 1, subdivisionIndex: 0, barNumber: 8, elapsedSeconds: 75, error: null }}
        hideVisuals={false}
        phaseLabel="自由练习"
        onExit={onExit}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: '专注练习模式' })).toHaveTextContent('96')
    expect(screen.getByText('第 8 小节')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '退出专注模式' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
