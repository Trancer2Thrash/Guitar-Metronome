export const VISIBLE_FRETS = 5

export function getFretboardBaseFret(frets: Array<number | null>): number {
  const fretted = frets.filter((fret): fret is number => typeof fret === 'number' && fret > 0)
  if (fretted.length === 0) return 1
  const lowestFret = Math.min(...fretted)
  const highestFret = Math.max(...fretted)
  const hasOpenString = frets.includes(0)
  return highestFret > VISIBLE_FRETS || (!hasOpenString && lowestFret >= 3) ? lowestFret : 1
}
