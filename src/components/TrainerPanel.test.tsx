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

  it('can run a tempo program indefinitely', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TrainerPanel value={DEFAULT_TRAINER_CONFIG} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '速度训练' }))
    await user.click(screen.getByRole('checkbox', { name: '速度训练无限循环' }))

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      tempoProgram: expect.objectContaining({ repetitions: 'infinite' }),
    }))
    expect(screen.queryByLabelText('速度训练循环次数')).not.toBeInTheDocument()
    expect(screen.getByText(/60 → 100 BPM.*无限循环/)).toBeInTheDocument()
  })

  it('supports random silent-bar ranges in Quiet Count', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TrainerPanel value={DEFAULT_TRAINER_CONFIG} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Quiet Count' }))
    await user.selectOptions(screen.getByLabelText('静音模式'), 'random')
    await user.clear(screen.getByLabelText('最少静音小节'))
    await user.type(screen.getByLabelText('最少静音小节'), '2')
    await user.clear(screen.getByLabelText('最多静音小节'))
    await user.type(screen.getByLabelText('最多静音小节'), '5')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      quietProgram: expect.objectContaining({ silentBars: { min: 2, max: 5 } }),
    }))
    expect(screen.getByText(/2–5 小节静音/)).toBeInTheDocument()
  })

  it('can set a finite Quiet Count repetition count', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TrainerPanel value={DEFAULT_TRAINER_CONFIG} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Quiet Count' }))
    await user.click(screen.getByRole('checkbox', { name: 'Quiet Count 无限循环' }))
    const repetitions = screen.getByLabelText('Quiet Count 循环次数')
    await user.clear(repetitions)
    await user.type(repetitions, '4')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      quietProgram: expect.objectContaining({ repetitions: 4 }),
    }))
  })
})
