import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHORDS, findChord } from './chordData'
import { Fretboard } from './Fretboard'
import { getFretboardBaseFret } from './fretboardGeometry'
import { getChordVoicings, toPlayableChord } from './chordVoicings'

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

  it('labels a movable third-position voicing from its actual base fret', () => {
    const chord = findChord('C')!
    const movableVoicing = getChordVoicings(chord).find((voicing) => voicing.label.startsWith('A 型'))!
    const { getByText } = render(<Fretboard chord={toPlayableChord(chord, movableVoicing)} />)

    expect(getByText('3fr')).toBeInTheDocument()
  })

  it('keeps high-position voicings inside the visible five-fret window', () => {
    const chord = findChord('E')!
    const highVoicing = getChordVoicings(chord).find((voicing) => voicing.label.startsWith('A 型'))!
    const { container, getByText } = render(<Fretboard chord={toPlayableChord(chord, highVoicing)} />)

    expect(getByText('7fr')).toBeInTheDocument()
    const viewBoxBottom = 320
    const dots = [...container.querySelectorAll<SVGCircleElement>('.fretboard__dot')]
    expect(dots).not.toHaveLength(0)
    expect(dots.every((dot) => Number(dot.getAttribute('cy')) >= 38 && Number(dot.getAttribute('cy')) <= viewBoxBottom - 24)).toBe(true)
    const barre = container.querySelector<SVGLineElement>('.fretboard__barre')!
    expect(Number(barre.getAttribute('y1'))).toBeGreaterThanOrEqual(38)
    expect(Number(barre.getAttribute('y1'))).toBeLessThanOrEqual(viewBoxBottom - 24)
  })
  it('fits every built-in voicing into the rendered fret range', () => {
    CHORDS.forEach((chord) => {
      getChordVoicings(chord).forEach((voicing) => {
        const baseFret = getFretboardBaseFret(voicing.frets)
        const visibleFrets = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0)
        visibleFrets.forEach((fret) => {
          expect(fret, `${chord.name} ${voicing.label}`).toBeGreaterThanOrEqual(baseFret)
          expect(fret, `${chord.name} ${voicing.label}`).toBeLessThan(baseFret + 5)
        })
        if (voicing.barre) {
          expect(voicing.barre.fret, `${chord.name} ${voicing.label} barre`).toBeGreaterThanOrEqual(baseFret)
          expect(voicing.barre.fret, `${chord.name} ${voicing.label} barre`).toBeLessThan(baseFret + 5)
        }
      })
    })
  })
})


