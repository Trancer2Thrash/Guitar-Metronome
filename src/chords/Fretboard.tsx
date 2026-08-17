import type { ChordDefinition } from './chordData'
export function Fretboard({ chord, compact=false }: { chord: ChordDefinition; compact?: boolean }) {
 const fretted=chord.frets.filter((f):f is number=>typeof f==='number'&&f>0); const base=Math.max(1,Math.min(...fretted,1)); const width=compact?150:260, height=compact?190:320; const left=28, top=38, gridW=width-48, gridH=height-62; const stringX=(i:number)=>left+(gridW/5)*i; const fretY=(f:number)=>top+(gridH/5)*(f-base+0.5)
 return <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chord.name} 和弦指板图`}>
  <text x={width/2} y="18" textAnchor="middle" className="fretboard__name">{chord.name}</text>
  {Array.from({length:6},(_,i)=><line key={`f${i}`} x1={left} x2={left+gridW} y1={top+(gridH/5)*i} y2={top+(gridH/5)*i} className={i===0&&base===1?'fretboard__nut':'fretboard__fret'}/>)}
  {Array.from({length:6},(_,i)=><line key={`s${i}`} x1={stringX(i)} x2={stringX(i)} y1={top} y2={top+gridH} className="fretboard__string"/>)}
  {base>1&&<text x="5" y={fretY(base)+4} className="fretboard__base">{base}fr</text>}
  {chord.frets.map((f,i)=>f===null?<text key={i} x={stringX(i)} y="32" textAnchor="middle" className="fretboard__marker">×</text>:f===0?<circle key={i} cx={stringX(i)} cy="27" r="5" className="fretboard__open"/>:<g key={i}><circle cx={stringX(i)} cy={fretY(f)} r={compact?7:10} className="fretboard__dot"/><text x={stringX(i)} y={fretY(f)+4} textAnchor="middle" className="fretboard__finger">{chord.fingers[i]??''}</text></g>)}
  {chord.barre&&<line x1={stringX(chord.barre.fromString)} x2={stringX(chord.barre.toString)} y1={fretY(chord.barre.fret)} y2={fretY(chord.barre.fret)} className="fretboard__barre"/>}
 </svg>
}
