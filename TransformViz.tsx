import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Icon } from './ui'

export type M2 = [[number, number], [number, number]]
const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))

/** Eigen-decomposition of a real 2×2 matrix for display purposes. */
export function eig2(m: M2) {
  const [[a, b], [c, d]] = m
  const tr = a + d, det = a * d - b * c
  const disc = (tr * tr) / 4 - det
  if (disc < -1e-9) return { real: false as const, re: tr / 2, im: Math.sqrt(-disc), vals: [] as number[], vecs: [] as [number, number][] }
  const s = Math.sqrt(Math.max(disc, 0))
  const vals = s < 1e-9 ? [tr / 2] : [tr / 2 + s, tr / 2 - s]
  const vecs = vals.map((l): [number, number] => {
    if (Math.abs(b) > 1e-9) return [b, l - a]
    if (Math.abs(c) > 1e-9) return [l - d, c]
    return Math.abs(l - a) < 1e-9 ? [1, 0] : [0, 1]
  })
  // a matrix that is a multiple of I has every direction as an eigenvector; show the axes
  if (s < 1e-9 && Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9) return { real: true as const, vals: [vals[0], vals[0]], vecs: [[1, 0], [0, 1]] as [number, number][], re: 0, im: 0 }
  return { real: true as const, vals, vecs, re: 0, im: 0 }
}

const PRESETS: { name: string; m: M2 }[] = [
  { name: 'Sample', m: [[2, 1], [1, 2]] },
  { name: 'Stretch', m: [[2, 0], [0, 0.5]] },
  { name: 'Shear', m: [[1, 1], [0, 1]] },
  { name: 'Rotation', m: [[0, -1], [1, 0]] },
  { name: 'Flip', m: [[1, 0], [0, -1]] },
]

/** Live picture of what a 2×2 matrix does: grid, unit circle, and a sweeping vector v with its image A·v. */
export function TransformViz({ initial = [[2, 1], [1, 2]], editable = true, compact = false }: { initial?: M2; editable?: boolean; compact?: boolean }) {
  const reduce = useReducedMotion()
  const [m, setM] = useState<M2>(initial)
  const [playing, setPlaying] = useState(!reduce)
  const [phi, setPhi] = useState(0.5)
  const raf = useRef(0)
  const last = useRef(0)
  useEffect(() => {
    if (!playing) return
    const tick = (t: number) => {
      if (last.current) setPhi((p) => (p + ((t - last.current) / 1000) * 0.55) % (Math.PI * 2))
      last.current = t
      raf.current = requestAnimationFrame(tick)
    }
    last.current = 0
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing])

  const e = useMemo(() => eig2(m), [m])
  const ap = (p: [number, number]): [number, number] => [m[0][0] * p[0] + m[0][1] * p[1], m[1][0] * p[0] + m[1][1] * p[1]]
  const v: [number, number] = [Math.cos(phi) * 1.5, Math.sin(phi) * 1.5]
  const Av = ap(v)
  const cross = (v[0] * Av[1] - v[1] * Av[0]) / (Math.hypot(...v) * Math.hypot(...Av) || 1)
  const aligned = Math.abs(cross) < 0.05 && Math.hypot(...Av) > 0.05
  const R = 6
  const clampP = (p: [number, number]) => p
  // transformed grid
  const lines: React.ReactElement[] = []
  for (let k = -5; k <= 5; k++) {
    const p1 = ap([k, -5]), p2 = ap([k, 5]), q1 = ap([-5, k]), q2 = ap([5, k])
    lines.push(<line key={'v' + k} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="var(--blue)" strokeOpacity={k === 0 ? 0.7 : 0.28} strokeWidth={k === 0 ? 0.06 : 0.025} />)
    lines.push(<line key={'h' + k} x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} stroke="var(--cyan)" strokeOpacity={k === 0 ? 0.7 : 0.28} strokeWidth={k === 0 ? 0.06 : 0.025} />)
  }
  const circ = Array.from({ length: 73 }, (_, i) => { const t = (i / 72) * Math.PI * 2; const p = ap([Math.cos(t), Math.sin(t)]); return `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}` }).join('') + 'Z'
  const arrow = (to: [number, number], color: string, w = 0.09) => {
    const L = Math.hypot(...to) || 1, ux = to[0] / L, uy = to[1] / L, h = 0.32
    const bx = to[0] - ux * h, by = to[1] - uy * h
    return (
      <g stroke={color} fill={color}>
        <line x1={0} y1={0} x2={bx} y2={by} strokeWidth={w} strokeLinecap="round" />
        <polygon points={`${to[0]},${to[1]} ${bx - uy * h * 0.5},${by + ux * h * 0.5} ${bx + uy * h * 0.5},${by - ux * h * 0.5}`} stroke="none" />
      </g>
    )
  }
  const sliders: { key: string; r: 0 | 1; c: 0 | 1 }[] = [{ key: 'a', r: 0, c: 0 }, { key: 'b', r: 0, c: 1 }, { key: 'c', r: 1, c: 0 }, { key: 'd', r: 1, c: 1 }]
  const setCell = (r: 0 | 1, c: 0 | 1, val: number) => setM((cur) => { const n: M2 = [[...cur[0]], [...cur[1]]] as M2; n[r][c] = val; return n })

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--math-bg)', border: '1px solid var(--line)' }}>
        <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} role="img" className="block w-full" style={{ aspectRatio: '1 / 1', maxHeight: compact ? 380 : 470 }}
          aria-label={`Animation of the matrix [${fmt(m[0][0])}, ${fmt(m[0][1])}; ${fmt(m[1][0])}, ${fmt(m[1][1])}] transforming a rotating vector`}>
          <g transform="scale(1,-1)">
            {Array.from({ length: 13 }, (_, i) => i - 6).map((k) => (
              <g key={k}><line x1={k} y1={-R} x2={k} y2={R} stroke="var(--line)" strokeWidth={0.02} /><line x1={-R} y1={k} x2={R} y2={k} stroke="var(--line)" strokeWidth={0.02} /></g>
            ))}
            {lines}
            <circle r={1} fill="none" stroke="var(--muted)" strokeWidth={0.03} strokeDasharray="0.12 0.12" />
            <path d={circ} fill="color-mix(in oklab, var(--violet) 14%, transparent)" stroke="var(--violet)" strokeWidth={0.06} />
            {e.real && e.vecs.map((ev, i) => {
              const L = Math.hypot(...ev) || 1
              return <line key={i} x1={(-ev[0] / L) * 9} y1={(-ev[1] / L) * 9} x2={(ev[0] / L) * 9} y2={(ev[1] / L) * 9} stroke="var(--pink)" strokeWidth={0.07} strokeDasharray="0.3 0.2" />
            })}
            {aligned && <circle cx={Av[0]} cy={Av[1]} r={0.45} fill="none" stroke="var(--pink)" strokeWidth={0.07} />}
            {arrow(clampP(Av), aligned ? 'var(--pink)' : 'var(--orange)')}
            {arrow(v, 'var(--cyan)')}
          </g>
        </svg>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="chip"><i style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--cyan)' }} /> v</span>
          <span className="chip"><i style={{ width: 10, height: 10, borderRadius: 99, background: aligned ? 'var(--pink)' : 'var(--orange)' }} /> A·v</span>
          {e.real && <span className="chip"><i style={{ width: 14, height: 0, borderTop: '3px dashed var(--pink)' }} /> eigen-directions</span>}
        </div>
        <div className="absolute right-3 bottom-3 chip" style={{ background: aligned ? 'var(--good-bg)' : 'var(--glass-strong)', color: aligned ? 'var(--good)' : 'var(--muted)' }} aria-live="polite">
          {aligned ? 'A·v points along v: eigenvector!' : 'A·v is turned away from v'}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}><Icon name={playing ? 'clock' : 'play'} size={16} />{playing ? 'Pause sweep' : 'Play sweep'}</button>
        <label className="flex items-center gap-2 text-sm muted min-w-0 flex-1" style={{ minWidth: 160 }}>Angle of v
          <input id="tv-angle" type="range" min={0} max={6.283} step={0.01} value={phi} onChange={(ev) => { setPlaying(false); setPhi(+ev.target.value) }} className="flex-1 min-w-0" aria-label="Angle of vector v" />
        </label>
      </div>
      {!compact && <div className="text-sm">
        {e.real ? <>Eigenvalues of this matrix: <strong>{e.vals.map(fmt).join(', ')}</strong>. The dashed pink lines are the eigen-directions: vectors on them are only stretched or flipped.</>
          : <>Eigenvalues: <strong>{fmt(e.re)} ± {fmt(e.im)}i</strong> (complex). The matrix turns every direction, so no real vector keeps its direction.</>}
      </div>}
      {editable && (
        <div className="glass-flat p-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.name} className="btn btn-ghost btn-sm" onClick={() => setM(p.m)}>{p.name}</button>)}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {sliders.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm min-w-0">
                <span className="font-bold w-6 shrink-0">{s.key}</span>
                <input id={`tv-${s.key}`} type="range" min={-3} max={3} step={0.5} value={m[s.r][s.c]} onChange={(ev) => setCell(s.r, s.c, +ev.target.value)} className="flex-1 min-w-0" aria-label={`Matrix entry ${s.key}`} />
                <span className="w-10 text-right tabular-nums">{fmt(m[s.r][s.c])}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
