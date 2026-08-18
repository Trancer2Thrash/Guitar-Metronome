import type { ChordDefinition } from './chordData'
import { getFretboardBaseFret, VISIBLE_FRETS } from './fretboardGeometry'

export function Fretboard({ chord }: { chord: ChordDefinition }) {
  const baseFret = getFretboardBaseFret(chord.frets)
  const width = 260
  const height = 320
  const left = 28
  const top = 38
  const gridWidth = width - 48
  const gridHeight = height - 62
  const stringX = (index: number) => left + (gridWidth / 5) * index
  const fretY = (fret: number) => top + (gridHeight / VISIBLE_FRETS) * (fret - baseFret + 0.5)

  return (
    <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chord.name} 和弦指板图`}>
      <text x={width / 2} y="18" textAnchor="middle" className="fretboard__name">{chord.name}</text>

      {Array.from({ length: VISIBLE_FRETS + 1 }, (_, index) => (
        <line
          key={`f${index}`}
          x1={left}
          x2={left + gridWidth}
          y1={top + (gridHeight / VISIBLE_FRETS) * index}
          y2={top + (gridHeight / VISIBLE_FRETS) * index}
          className={index === 0 && baseFret === 1 ? 'fretboard__nut' : 'fretboard__fret'}
        />
      ))}
      {Array.from({ length: 6 }, (_, index) => (
        <line key={`s${index}`} x1={stringX(index)} x2={stringX(index)} y1={top} y2={top + gridHeight} className="fretboard__string" />
      ))}

      {baseFret > 1 && <text x="5" y={fretY(baseFret) + 4} className="fretboard__base">{baseFret}fr</text>}
      {chord.frets.map((fret, index) => {
        if (fret === null) {
          return <text key={index} x={stringX(index)} y="32" textAnchor="middle" className="fretboard__marker">×</text>
        }
        if (fret === 0) {
          return <circle key={index} cx={stringX(index)} cy="27" r="5" className="fretboard__open" />
        }
        return null
      })}

      {chord.barre && (
        <line
          x1={stringX(chord.barre.fromString)}
          x2={stringX(chord.barre.toString)}
          y1={fretY(chord.barre.fret)}
          y2={fretY(chord.barre.fret)}
          className="fretboard__barre"
        />
      )}
      {chord.frets.map((fret, index) => fret !== null && fret > 0 ? (
        <g key={index}>
          <circle cx={stringX(index)} cy={fretY(fret)} r={10} className="fretboard__dot" />
          <text x={stringX(index)} y={fretY(fret) + 4} textAnchor="middle" className="fretboard__finger">{chord.fingers[index] ?? ''}</text>
        </g>
      ) : null)}
    </svg>
  )
}


