import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_TRAINER_CONFIG } from '../domain/trainer'
import { TrainerPanel } from './TrainerPanel'

describe('TrainerPanel', () => {
  it('shows a validated tempo progression summary', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TrainerPanel value={DEFAULT_TRAINER_CONFIG} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '速度训练' }))
    expect(screen.getByText(/60 → 100 BPM/)).toBeInTheDocument()
    expect(screen.getByText(/每 8 小节/)).toBeInTheDocument()
  })

  it('reports equal start and target tempos as invalid', async () => {
    const user = userEvent.setup()
    render(<TrainerPanel value={DEFAULT_TRAINER_CONFIG} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '速度训练' }))

    const target = screen.getByLabelText('目标 BPM')
    await user.clear(target)
    await user.type(target, '60')

    expect(screen.getByRole('alert')).toHaveTextContent(/必须不同/)
  })
})
