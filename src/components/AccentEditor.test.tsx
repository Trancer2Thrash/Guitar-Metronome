import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccentEditor } from './AccentEditor'

describe('AccentEditor', () => {
  it('cycles an individual beat through the accent sequence', async () => {
    const user = userEvent.setup()
    const onAccentChange = vi.fn()
    render(
      <AccentEditor
        meter={{ numerator: 4, denominator: 4, accents: ['strong', 'weak', 'medium', 'mute'] }}
        onAccentChange={onAccentChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '第 2 拍：弱拍' }))
    expect(onAccentChange).toHaveBeenCalledWith(1, 'mute')
  })

  it('restores the recommended accent pattern for the selected meter', async () => {
    const user = userEvent.setup()
    const onAccentChange = vi.fn()
    render(
      <AccentEditor
        meter={{ numerator: 4, denominator: 4, accents: ['mute', 'mute', 'mute', 'mute'] }}
        onAccentChange={onAccentChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '恢复推荐重音' }))
    expect(onAccentChange.mock.calls).toEqual([[0, 'strong'], [1, 'weak'], [2, 'medium'], [3, 'weak']])
  })
})
