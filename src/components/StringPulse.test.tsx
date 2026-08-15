import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StringPulse } from './StringPulse'

describe('StringPulse', () => {
  it('marks the current numbered beat while keeping six string lines', () => {
    const { container } = render(
      <StringPulse
        meter={{ numerator: 4, denominator: 4, accents: ['strong', 'weak', 'medium', 'mute'] }}
        activeBeat={2}
        hideVisuals={false}
      />,
    )

    expect(screen.getByText('3')).toHaveAttribute('aria-current', 'true')
    expect(container.querySelectorAll('.string-pulse__string')).toHaveLength(6)
    expect(screen.getByRole('img', { name: /4\/4 拍号/ })).toBeInTheDocument()
  })

  it('removes the active indication during hidden Quiet Count bars', () => {
    render(
      <StringPulse
        meter={{ numerator: 3, denominator: 4, accents: ['strong', 'weak', 'weak'] }}
        activeBeat={1}
        hideVisuals
      />,
    )

    expect(screen.getByText('2')).not.toHaveAttribute('aria-current')
  })
})
