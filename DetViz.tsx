import { useState } from 'react'
const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(2))
/** The determinant as signed area: the unit square is mapped to a parallelogram. */
export function DetViz() {
  const [m, setM] = useState<[number, number, number, number]>([2, 1, 0.5, 1.5])
  const [a, b, c, d] = m
  const det = a * d - b * c
  const set = (i: number, v: number) => setM((cur) => { const n = [...cur] as typeof m; n[i] = v; return n })
  const R = 5
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--math-bg)', border: '1px solid var(--line)' }}>
        <svg viewBox={`${-1} ${-R + 0.5} ${R + 1} ${R}`} className="block w-full" style={{ aspectRatio: '1.2 / 1', maxHeight: 320 }} role="img" aria-label={`Unit square mapped to a parallelogram with area ${fmt(Math.abs(det))}`}>
          <g transform="scale(1,-1)">
            <rect x={0} y={0} width={1} height={1} fill="none" stroke="var(--muted)" strokeDasharray="0.1 0.1" strokeWidth={0.04} />
            <polygon points={`0,0 ${a},${c} ${a + b},${c + d} ${b},${d}`} fill={det >= 0 ? 'color-mix(in oklab, var(--cyan) 30%, transparent)' : 'color-mix(in oklab, var(--pink) 30%, transparent)'} stroke={det >= 0 ? 'var(--cyan)' : 'var(--pink)'} strokeWidth={0.06} />
            <line x1={0} y1={0} x2={a} y2={c} stroke="var(--orange)" strokeWidth={0.08} /><line x1={0} y1={0} x2={b} y2={d} stroke="var(--violet)" strokeWidth={0.08} />
          </g>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {(['a', 'b', 'c', 'd'] as const).map((k, i) => (
          <label key={k} className="flex items-center gap-2 text-sm min-w-0"><span className="font-bold w-5">{k}</span>
            <input id={`dv-${k}`} type="range" min={-2} max={3} step={0.5} value={m[i]} onChange={(e) => set(i, +e.target.value)} className="flex-1 min-w-0" aria-label={`Entry ${k}`} />
            <span className="w-9 text-right tabular-nums">{fmt(m[i])}</span></label>
        ))}
      </div>
      <p className="m-0 text-sm" aria-live="polite">det = ad − bc = <strong>{fmt(det)}</strong>. The parallelogram has area <strong>{fmt(Math.abs(det))}</strong>{det < 0 ? ' and the sign is negative because the picture is flipped (mirrored).' : det === 0 ? ': it collapsed to a line, so the matrix is singular.' : '.'}</p>
    </div>
  )
}
