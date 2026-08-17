import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { findChord } from './chordData'
import { Fretboard } from './Fretboard'

describe('Fretboard', () => {
  it('renders muted and open string markers', () => {
    const chord = findChord('C')!
    const { container, getByRole } = render(<Fretboard chord={chord} />)
    expect(getByRole('img', { name: 'C 和弦指板图' })).toBeInTheDocument()
    expect(container.querySelectorAll('.fretboard__marker')).toHaveLength(1)
    expect(container.querySelectorAll('.fretboard__open')).toHaveLength(2)
  })

  it('renders a barre for barre chords', () => {
    const chord = findChord('F')!
    const { container } = render(<Fretboard chord={chord} />)
    expect(container.querySelector('.fretboard__barre')).toBeInTheDocument()
  })
})