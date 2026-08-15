import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransportButton } from './TransportButton'

describe('TransportButton', () => {
  it('shows the next transport action and invokes it', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    const { rerender } = render(<TransportButton status="stopped" onPlay={onPlay} onPause={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '开始节拍' }))
    expect(onPlay).toHaveBeenCalledTimes(1)

    rerender(<TransportButton status="playing" onPlay={onPlay} onPause={vi.fn()} />)
    expect(screen.getByRole('button', { name: '暂停节拍' })).toBeInTheDocument()
  })
})
