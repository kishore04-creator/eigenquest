import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { solveMatrix, SolveResult, MAX_N } from '../engine'
import { parseEntry } from '../engine/parse'
import { fracTex, bmatrix, colVec } from '../engine/tex'
import { Tex, Blocks, CheckMark, RichText } from '../components/Tex'
import { Icon, SectionTitle } from '../components/ui'
import { actions, useProgress } from '../lib/store'
import { burst } from '../lib/confetti'
import { genIntEig, mulberry32 } from '../lib/gen'

export const SAMPLES: { name: string; note: string; m: number[][] }[] = [
  { name: 'Textbook 2×2', note: 'Real eigenvalues 3 and 1', m: [[2, 1], [1, 2]] },
  { name: 'Rotation by 90°', note: 'Complex eigenvalues ±i', m: [[0, -1], [1, 0]] },
  { name: 'Defective 2×2', note: 'Repeated eigenvalue, one eigenvector', m: [[2, 1], [0, 2]] },
  { name: 'Repeated, not defective', note: 'Eigenvalue 3 with two eigenvectors', m: [[3, 0], [0, 3]] },
  { name: 'Golden ratio', note: 'Irrational eigenvalues', m: [[1, 1], [1, 0]] },
  { name: 'Symmetric 3×3', note: 'Eigenvalues 2 and 2 ± √2', m: [[2, -1, 0], [-1, 2, -1], [0, -1, 2]] },
  { name: 'Triangular 3×3', note: 'Eigenvalues on the diagonal', m: [[2, 1, 4], [0, 3, 5], [0, 0, -1]] },
  { name: 'Complex pair 3×3', note: 'One real, two complex eigenvalues', m: [[0, -1, 0], [1, 0, 0], [0, 0, 2]] },
  { name: 'Jordan block 3×3', note: 'Eigenvalue 2 three times, one eigenvector', m: [[2, 1, 0], [0, 2, 1], [0, 0, 2]] },
  { name: 'Cubic with no rational root', note: 'Numerical (approximate) solution', m: [[0, 1, 0], [0, 0, 1], [1, 1, 0]] },
  { name: 'Block 4×4', note: 'Real and complex eigenvalues together', m: [[2, 1, 0, 0], [1, 2, 0, 0], [0, 0, 0, -1], [0, 0, 1, 0]] },
  { name: 'Mixed 5×5', note: 'Repeated eigenvalue with a Jordan block', m: [[4, 1, 0, 0, 0], [0, 4, 0, 0, 0], [0, 0, 3, 2, 0], [0, 0, 2, 3, 0], [1, 0, 0, 0, -2]] },
]
const SAMPLE_KEY = '2|2,1,1,2'
const toStr = (m: number[][]) => m.map((r) => r.map(String))

export interface Preset { matrix: string[][]; autoSolve?: boolean; nonce: number }

/** Previews whatever is typed as a proper matrix (invalid cells show as red question marks). */
function previewTex(cells: string[][]) {
  return bmatrix(cells.map((r) => r.map((s) => { const p = parseEntry(s); return p.ok ? fracTex(p.value) : s.trim() === '' ? '\\square' : '\\color{#e11d48}{?}' })))
}

export function Solver({ preset }: { preset?: Preset }) {
  const reduce = useReducedMotion()
  const progress = useProgress()
  const [size, setSize] = useState(2)
  const [cells, setCells] = useState<string[][]>(toStr(SAMPLES[0].m))
  const [lastLoaded, setLastLoaded] = useState<string[][]>(toStr(SAMPLES[0].m))
  const [errMsg, setErrMsg] = useState('')
  const [bad, setBad] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<SolveResult | null>(null)
  const [stage, setStage] = useState(0)
  const [reached, setReached] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)

  const load = (m: string[][]) => { setSize(m.length); setCells(m.map((r) => r.slice())); setLastLoaded(m.map((r) => r.slice())); setErrMsg(''); setBad(new Set()) }

  const resize = (n: number) => {
    setCells((cur) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cur[i]?.[j] ?? (i === j ? '1' : '0'))))
    setSize(n); setErrMsg(''); setBad(new Set())
  }

  const reward = (res: SolveResult) => {
    const isNew = !progress.solved.includes(res.key)
    if (!isNew) return
    const complex = res.eigenvalues.some((e) => e.isComplex), defective = res.eigenvalues.some((e) => e.defective)
    const cheap = progress.solved.length >= 30
    const xp = cheap ? 5 : 20 + (res.n >= 3 ? 10 : 0) + (complex || defective ? 10 : 0)
    actions.markSolved(res.key, { n: res.n, complex, defective, sample: res.key === SAMPLE_KEY })
    actions.award(xp, 'Matrix solved', `solve:${res.key}`)
  }

  const unlock = (res: SolveResult, idx: number) => {
    // idx is 0-based stage index; XP is paid once per matrix per stage
    actions.award(progress.solved.length > 30 ? 1 : 4, `Step ${idx + 1} unlocked`, `step:${res.key}:${idx + 1}`)
    if (idx === 4 && res.allVerified) {
      if (!progress.awarded.includes(`verify:${res.key}`)) { actions.markVerified(); burst(true) }
      actions.award(10, 'Answer verified', `verify:${res.key}`)
    }
  }

  const onSolve = (override?: string[][]) => {
    const src = override ?? cells
    const out = solveMatrix(src)
    if (!out.ok) {
      setErrMsg(out.message); setResult(null)
      setBad(new Set(out.cellErrors.map((c) => `${c.r}-${c.c}`)))
      const first = out.cellErrors[0]
      if (first) document.getElementById(`cell-${first.r}-${first.c}`)?.focus()
      return
    }
    setErrMsg(''); setBad(new Set()); setResult(out.result); setStage(0); setReached(0); setShowAll(false)
    reward(out.result); unlock(out.result, 0)
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 60)
  }

  useEffect(() => {
    if (!preset) return
    load(preset.matrix)
    if (preset.autoSolve) onSolve(preset.matrix)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce])

  const goStage = (i: number) => {
    if (!result) return
    const idx = Math.max(0, Math.min(4, i))
    setStage(idx)
    if (idx > reached) { setReached(idx); }
    for (let k = 0; k <= idx; k++) unlock(result, k)
  }
  const toggleAll = () => {
    if (!result) return
    const next = !showAll
    setShowAll(next)
    if (next) { setReached(4); for (let k = 0; k < 5; k++) unlock(result, k) }
  }
  const tryAgain = () => { setStage(0); setReached(0); setShowAll(false); document.getElementById('cell-0-0')?.focus(); inputRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }) }

  const randomNice = () => {
    const n = size
    const g = genIntEig(n, mulberry32((Math.random() * 1e9) | 0), { lo: -3, hi: 5, maxEntry: 9 })
    load(toStr(g.A)); setResult(null)
  }
  const randomAny = () => {
    load(Array.from({ length: size }, () => Array.from({ length: size }, () => String(Math.floor(Math.random() * 11) - 5)))); setResult(null)
  }
  const clearAll = () => { setCells(Array.from({ length: size }, () => Array.from({ length: size }, () => ''))); setErrMsg(''); setBad(new Set()); setResult(null); setTimeout(() => document.getElementById('cell-0-0')?.focus(), 0) }
  const resetAll = () => { load(lastLoaded); setResult(null) }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const mv = (rr: number, cc: number) => { e.preventDefault(); document.getElementById(`cell-${rr}-${cc}`)?.focus() }
    if (e.key === 'Enter') { e.preventDefault(); onSolve() }
    else if (e.key === 'ArrowDown' && r < size - 1) mv(r + 1, c)
    else if (e.key === 'ArrowUp' && r > 0) mv(r - 1, c)
    else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length && c < size - 1) mv(r, c + 1)
    else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && c > 0) mv(r, c - 1)
  }

  const preview = useMemo(() => previewTex(cells), [cells])
  const stagesToShow = result ? (showAll ? result.stages : [result.stages[stage]]) : []
  const finished = !!result && (showAll || reached >= 4)

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title={<>Matrix <span className="grad-text">Solver</span></>} sub="Type any square matrix (2×2 up to 5×5). You will get every step of the solution, not just the answer." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
        <section className="glass p-5 flex flex-col gap-4 min-w-0" ref={inputRef} aria-label="Matrix input">
          <div role="radiogroup" aria-label="Matrix size" className="flex flex-wrap gap-2">
            {Array.from({ length: MAX_N - 1 }, (_, k) => k + 2).map((n) => (
              <button key={n} role="radio" aria-checked={size === n} className={`btn btn-sm ${size === n ? 'btn-primary' : 'btn-ghost'}`} onClick={() => resize(n)}>{n}×{n}</button>
            ))}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {cells.map((row, r) => row.map((val, c) => (
              <input key={`${r}-${c}`} id={`cell-${r}-${c}`} className="cell" type="text" inputMode="text" autoComplete="off" spellCheck={false}
                aria-label={`Row ${r + 1}, column ${c + 1}`} aria-invalid={bad.has(`${r}-${c}`)} value={val}
                onChange={(e) => { const v = e.target.value; setCells((cur) => cur.map((rr, i) => rr.map((x, j) => (i === r && j === c ? v : x)))); if (bad.size) setBad(new Set()); if (errMsg) setErrMsg('') }}
                onFocus={(e) => e.currentTarget.select()} onKeyDown={(e) => onKey(e, r, c)} />
            )))}
          </div>
          <div className="math-block text-center" aria-label="Matrix preview"><Tex math={`A=${preview}`} display /></div>
          <AnimatePresence>
            {errMsg && (
              <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>
                {errMsg}
              </motion.div>
            )}
          </AnimatePresence>
          <button className="btn btn-primary btn-lg w-full" onClick={() => onSolve()}><Icon name="bolt" />Solve My Matrix</button>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost btn-sm" onClick={randomNice}><Icon name="dice" size={16} />Random (nice answers)</button>
            <button className="btn btn-ghost btn-sm" onClick={randomAny}><Icon name="dice" size={16} />Random (any)</button>
            <button className="btn btn-ghost btn-sm" onClick={clearAll}><Icon name="eraser" size={16} />Clear</button>
            <button className="btn btn-ghost btn-sm" onClick={resetAll}><Icon name="reset" size={16} />Reset</button>
          </div>
          <div>
            <label htmlFor="sample-pick" className="block font-bold mb-1">Load a sample matrix</label>
            <select id="sample-pick" className="field w-full" value="" onChange={(e) => { const s = SAMPLES[+e.target.value]; if (s) { load(toStr(s.m)); setResult(null) } }}>
              <option value="" disabled>Choose a sample…</option>
              {SAMPLES.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.m.length}×{s.m.length}): {s.note}</option>)}
            </select>
          </div>
          <p className="m-0 text-sm muted">Accepted entries: integers, decimals (<code>-1.5</code>) and fractions (<code>3/4</code>). Press Enter in any cell to solve.</p>
        </section>

        <section className="min-w-0" ref={playerRef} aria-label="Solution">
          {!result ? (
            <div className="glass p-8 text-center flex flex-col items-center gap-3">
              <div className="display text-6xl grad-text font-extrabold" aria-hidden="true">λ</div>
              <h3 className="m-0 text-2xl font-bold">Your solution appears here</h3>
              <p className="m-0 muted max-w-md">Press <strong>Solve My Matrix</strong>. The steps unlock one level at a time and you earn XP for each one, plus a bonus when the answer is verified.</p>
              <button className="btn btn-primary" onClick={() => onSolve()}>Solve the matrix on the left</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <StageNav result={result} stage={stage} reached={reached} showAll={showAll} onGo={goStage} />
              {result.warnings.map((w, i) => <div key={i} className="rounded-2xl px-4 py-3" style={{ background: 'var(--warn-bg)', color: 'var(--fg)' }}><strong style={{ color: 'var(--warn)' }}>Heads up. </strong>{w}</div>)}
              <AnimatePresence mode="popLayout" initial={false}>
                {stagesToShow.map((s) => (
                  <motion.article key={s.id + (showAll ? 'all' : '')} layout={!reduce} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }} className="glass p-5 sm:p-6 min-w-0">
                    <header className="flex items-center gap-3 mb-4">
                      <span className="grid place-items-center w-11 h-11 rounded-full text-white display text-xl font-extrabold shrink-0" style={{ background: 'linear-gradient(135deg,var(--btn-from),var(--btn-to))' }}>{s.id}</span>
                      <div className="min-w-0"><h3 className="m-0 text-2xl font-extrabold">Step {s.id}: {s.title}</h3><div className="text-sm muted">{s.blurb}</div></div>
                    </header>
                    <Blocks blocks={s.blocks} />
                  </motion.article>
                ))}
              </AnimatePresence>
              <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Step controls">
                <button className="btn btn-ghost" onClick={() => goStage(stage - 1)} disabled={showAll || stage === 0}><Icon name="arrowL" size={18} />Previous Step</button>
                <button className="btn btn-primary" onClick={() => goStage(stage + 1)} disabled={showAll || stage === 4}>Next Step<Icon name="arrowR" size={18} /></button>
                <button className="btn btn-ghost" onClick={toggleAll} aria-pressed={showAll}><Icon name="list" size={18} />{showAll ? 'Show One Step' : 'Show All Steps'}</button>
                <button className="btn btn-ghost" onClick={tryAgain}><Icon name="reset" size={18} />Try Again</button>
              </div>
              {finished && <FinalAnswer result={result} />}
              <Checks result={result} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StageNav({ result, stage, reached, showAll, onGo }: { result: SolveResult; stage: number; reached: number; showAll: boolean; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Solution levels" className="glass px-3 py-3 overflow-x-auto tab-scroll">
      <ol className="m-0 p-0 list-none flex items-stretch gap-2 min-w-max">
        {result.stages.map((s, i) => {
          const open = showAll || i <= reached
          const cur = !showAll && i === stage
          return (
            <li key={s.id}>
              <button className="flex items-center gap-2 rounded-2xl px-3 py-2 text-left font-bold border" disabled={!open} aria-current={cur ? 'step' : undefined} onClick={() => onGo(i)}
                style={{ background: cur ? 'linear-gradient(100deg,var(--btn-from),var(--btn-to))' : 'var(--glass-strong)', color: cur ? '#fff' : open ? 'var(--fg)' : 'var(--muted)', borderColor: 'var(--line)', opacity: open ? 1 : 0.65, cursor: open ? 'pointer' : 'not-allowed' }}>
                {open ? <span className="display text-lg">{s.id}</span> : <Icon name="lock" size={16} />}
                <span className="text-sm whitespace-nowrap">{s.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function FinalAnswer({ result }: { result: SolveResult }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass p-5 sm:p-6" aria-label="Final answer" style={{ borderColor: 'var(--good)' }}>
      <div className="flex items-center gap-3 mb-3"><CheckMark ok={result.allVerified} /><h3 className="m-0 text-2xl font-extrabold">Final answer</h3></div>
      <div className="grid gap-3">
        {result.eigenvalues.map((e, i) => (
          <div key={i} className="glass-flat p-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Tex math={`\\lambda_{${i + 1}}=${e.tex}`} />
              {e.algMult > 1 && <span className="chip">multiplicity {e.algMult}</span>}
              {e.isComplex && <span className="chip">complex</span>}
              {!e.exact && <span className="chip" style={{ color: 'var(--warn)' }}>approximate</span>}
              {e.defective && <span className="chip" style={{ color: 'var(--warn)' }}>defective: {e.geoMult} eigenvector{e.geoMult > 1 ? 's' : ''}</span>}
            </div>
            <div className="flex flex-wrap gap-3 items-center overflow-x-auto">
              {e.vectors.map((v, k) => <Tex key={k} math={`\\mathbf v_{${e.vectors.length > 1 ? `${i + 1},${k + 1}` : i + 1}}=${colVec(v.tex)}`} />)}
              {!e.vectors.length && <span className="muted text-sm">No eigenvector could be computed reliably.</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 text-sm muted"><RichText text="Any non-zero multiple of an eigenvector is also correct. Eigenvectors are only determined up to scaling." /></p>
    </motion.section>
  )
}

function Checks({ result }: { result: SolveResult }) {
  const ok = result.checks.every((c) => c.ok)
  return (
    <details className="glass-flat px-4 py-3">
      <summary className="cursor-pointer font-bold">{ok ? 'All' : 'Some'} engine checks {ok ? 'passed' : 'need attention'} ({result.checks.filter((c) => c.ok).length}/{result.checks.length})</summary>
      <ul className="m-0 mt-2 ps-0 list-none flex flex-col gap-1">
        {result.checks.map((c, i) => (
          <li key={i} className="flex gap-2 items-start text-sm"><span aria-hidden="true" style={{ color: c.ok ? 'var(--good)' : 'var(--bad)', fontWeight: 800 }}>{c.skipped ? '–' : c.ok ? '✓' : '✗'}</span><span>{c.label}{c.detail ? <span className="muted"> ({c.detail})</span> : null}</span></li>
        ))}
      </ul>
    </details>
  )
}
