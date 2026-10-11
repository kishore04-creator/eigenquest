import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Frac } from '../engine'
import { parseEntry } from '../engine/parse'
import { Tex, RichText, CheckMark } from '../components/Tex'
import { Icon, ProgressBar, SectionTitle, Stars } from '../components/ui'
import { actions, getProgress, todayStr, useProgress } from '../lib/store'
import { burst } from '../lib/confetti'
import { mulberry32 } from '../lib/gen'
import { ActivityId } from '../lib/gamify'
import { makeA, makeB, makeC, makeDetective, dailyDetective, matTex, MCRound, FillRound, Detective } from '../lib/activities'

const rnd = () => mulberry32((Math.random() * 4294967296) >>> 0)

interface Payout { score: number; bonus: number; stars: number; extra: number }
function payout(activity: ActivityId, base: number, hints: number, wrongs: number, extra = 0, why = 'Challenge complete'): Payout {
  const hintCost = Math.max(2, Math.round(base * 0.2)), wrongCost = Math.max(1, Math.round(base * 0.15))
  const score = Math.max(1, base - hints * hintCost - wrongs * wrongCost)
  const stars = wrongs === 0 && hints === 0 ? 3 : wrongs <= 1 && hints <= 1 ? 2 : 1
  actions.answer(true, activity, hints > 0)
  const bonus = Math.min(10, Math.max(0, (getProgress().streak - 1) * 2))
  actions.award(score + bonus + extra, why)
  actions.addStars(stars)
  burst(stars === 3)
  return { score, bonus, stars, extra }
}

function HintBox({ hints, used, onUse, cost }: { hints: string[]; used: number; onUse: () => void; cost: number }) {
  return (
    <div className="flex flex-col gap-2">
      {hints.slice(0, used).map((h, i) => <div key={i} className="rounded-2xl px-4 py-3" style={{ background: 'var(--tip-bg)' }}><strong style={{ color: 'var(--violet)' }}>Hint {i + 1}. </strong><RichText text={h} /></div>)}
      {used < hints.length && <button className="btn btn-ghost btn-sm self-start" onClick={onUse}><Icon name="bulb" size={16} />Reveal hint (−{cost} XP)</button>}
    </div>
  )
}

function ResultCard({ p, explain, onNext, nextLabel = 'Next challenge' }: { p: Payout; explain?: string; onNext?: () => void; nextLabel?: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--good-bg)' }}>
      <div className="flex flex-wrap items-center gap-3"><CheckMark /><div className="font-extrabold text-xl" style={{ color: 'var(--good)' }}>Correct!</div><Stars n={p.stars} />
        <span className="chip">+{p.score + p.bonus + p.extra} XP{p.bonus ? ` (incl. +${p.bonus} streak)` : ''}</span></div>
      {explain && <div><RichText text={explain} /></div>}
      {onNext && <button className="btn btn-primary self-start" onClick={onNext}>{nextLabel}<Icon name="arrowR" size={18} /></button>}
    </motion.div>
  )
}

/** Multiple-choice board used by activities A, B and the last stage of D/E/Daily. */
function MCBoard({ round, onCorrect, onWrong, done }: { round: MCRound; onCorrect: () => void; onWrong: () => void; done: boolean }) {
  const [tried, setTried] = useState<Set<string>>(new Set())
  const click = (id: string, correct: boolean) => {
    if (done || tried.has(id)) return
    setTried((s) => new Set(s).add(id))
    correct ? onCorrect() : onWrong()
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer choices">
        {round.options.map((o) => {
          const wrong = tried.has(o.id) && !o.correct
          const right = done && o.correct
          return (
            <div key={o.id} className="flex flex-col gap-2 min-w-0">
              <button className="glass-flat px-4 py-3 text-left flex items-center justify-center min-h-16 overflow-x-auto" onClick={() => click(o.id, o.correct)} disabled={done || wrong} aria-label={`Choice ${o.tex.replace(/\\[a-z]+/g, ' ')}`}
                style={{ borderColor: right ? 'var(--good)' : wrong ? 'var(--bad)' : 'var(--line)', borderWidth: 2, background: right ? 'var(--good-bg)' : wrong ? 'var(--bad-bg)' : undefined, cursor: done || wrong ? 'default' : 'pointer' }}>
                <Tex math={o.tex} display />
              </button>
              {(wrong || right) && <div className="text-sm px-1" style={{ color: right ? 'var(--good)' : 'var(--bad)' }}><RichText text={o.why} /></div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatrixCard({ A, label = 'A' }: { A: number[][]; label?: string }) {
  return <div className="math-block text-center"><Tex math={`${label}=${matTex(A)}`} display /></div>
}

// ---- Activities A & B ---------------------------------------------------------------
function MCPlay({ id, make, base, title }: { id: 'A' | 'B'; make: (r: ReturnType<typeof rnd>) => MCRound; base: number; title: string }) {
  const [round, setRound] = useState(() => make(rnd()))
  const [n, setN] = useState(0)
  const [hints, setHints] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [res, setRes] = useState<Payout | null>(null)
  const next = () => { setRound(make(rnd())); setN((x) => x + 1); setHints(0); setWrongs(0); setRes(null) }
  return (
    <div className="flex flex-col gap-4" key={n}>
      <h3 className="m-0 text-2xl font-extrabold">{title}</h3>
      <MatrixCard A={round.matrix} />
      <p className="m-0 text-lg font-semibold"><RichText text={round.prompt} /></p>
      <MCBoard round={round} done={!!res} onCorrect={() => setRes(payout(id, base, hints, wrongs, 0, `Activity ${id}`))} onWrong={() => { setWrongs((w) => w + 1); actions.answer(false, id, hints > 0) }} />
      {!res && <HintBox hints={round.hints} used={hints} cost={Math.max(2, Math.round(base * 0.2))} onUse={() => { setHints((h) => h + 1); actions.useHint() }} />}
      {wrongs > 0 && !res && <div className="muted text-sm">Wrong tries cost {Math.max(1, Math.round(base * 0.15))} XP each and reset your streak. Read the explanation under the choice you tried.</div>}
      {res && <ResultCard p={res} explain={round.explain} onNext={next} />}
    </div>
  )
}

// ---- Activity C ----------------------------------------------------------------------------
const toFrac = (a: number | [number, number]) => (typeof a === 'number' ? Frac.of(a) : new Frac(BigInt(a[0]), BigInt(a[1])))
function FillPlay() {
  const [round, setRound] = useState<FillRound>(() => makeC(rnd()))
  const [n, setN] = useState(0)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [hints, setHints] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [res, setRes] = useState<Payout | null>(null)
  const [gaveUp, setGaveUp] = useState(false)
  const [msg, setMsg] = useState<Record<string, 'ok' | 'bad' | 'err'>>({})
  const [errText, setErrText] = useState('')
  const next = () => { setRound(makeC(rnd())); setN((x) => x + 1); setVals({}); setHints(0); setWrongs(0); setRes(null); setGaveUp(false); setMsg({}); setErrText('') }
  const check = () => {
    const m: Record<string, 'ok' | 'bad' | 'err'> = {}
    let all = true, anyErr = ''
    for (const b of round.blanks) {
      const p = parseEntry(vals[b.id] ?? '')
      if (!p.ok) { m[b.id] = 'err'; all = false; anyErr = p.msg; continue }
      if (p.value.eq(toFrac(b.answer))) m[b.id] = 'ok'; else { m[b.id] = 'bad'; all = false }
    }
    setMsg(m); setErrText(anyErr)
    if (all) setRes(payout('C', 15, hints, wrongs, 0, 'Activity C'))
    else if (!anyErr) { setWrongs((w) => w + 1); actions.answer(false, 'C', hints > 0) }
  }
  const giveUp = () => { setGaveUp(true); actions.answer(false, 'C', hints > 0) }
  return (
    <div className="flex flex-col gap-4" key={n}>
      <h3 className="m-0 text-2xl font-extrabold">Complete the missing step</h3>
      <MatrixCard A={round.matrix} />
      <p className="m-0 text-lg font-semibold"><RichText text={round.prompt} /></p>
      <div className="math-block"><Tex math={round.exprTex} display /></div>
      <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => { e.preventDefault(); if (!res && !gaveUp) check() }}>
        {round.blanks.map((b) => (
          <label key={b.id} className="flex flex-col gap-1 font-bold">
            <span>Value for {b.label}</span>
            <input id={`fill-${b.id}-${n}`} className="field w-36 text-center text-lg" inputMode="text" autoComplete="off" value={vals[b.id] ?? ''} disabled={!!res || gaveUp}
              onChange={(e) => setVals((v) => ({ ...v, [b.id]: e.target.value }))}
              aria-invalid={msg[b.id] === 'bad' || msg[b.id] === 'err'} style={{ borderColor: msg[b.id] === 'ok' ? 'var(--good)' : msg[b.id] === 'bad' || msg[b.id] === 'err' ? 'var(--bad)' : undefined }} />
            {msg[b.id] === 'ok' && <span className="text-sm" style={{ color: 'var(--good)' }}>Correct</span>}
            {msg[b.id] === 'bad' && <span className="text-sm" style={{ color: 'var(--bad)' }}>Not this one. Re-check the arithmetic.</span>}
          </label>
        ))}
        <button className="btn btn-primary" type="submit" disabled={!!res || gaveUp}>Check answer</button>
      </form>
      {errText && <div role="alert" className="rounded-2xl px-4 py-3" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>{errText}</div>}
      {!res && !gaveUp && <HintBox hints={round.hints} used={hints} cost={3} onUse={() => { setHints((h) => h + 1); actions.useHint() }} />}
      {!res && !gaveUp && wrongs >= 2 && <button className="btn btn-ghost btn-sm self-start" onClick={giveUp}>Show the solution (no XP)</button>}
      {gaveUp && <div className="rounded-2xl p-4" style={{ background: 'var(--info-bg)' }}><RichText text={round.explain} /><div className="mt-3"><button className="btn btn-primary" onClick={next}>Try a new one</button></div></div>}
      {res && <ResultCard p={res} explain={round.explain} onNext={next} />}
    </div>
  )
}

// ---- Activities D, E (boss) and the Daily Challenge ------------------------------------
const linFac = (e: number) => (e === 0 ? '\\lambda' : e < 0 ? `(\\lambda+${-e})` : `(\\lambda-${e})`)
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

function DetectivePlay({ mode }: { mode: 'D' | 'E' | 'daily' }) {
  const today = todayStr()
  const dailyDone = getProgress().daily.lastDone === today
  const make = (): Detective => (mode === 'daily' ? dailyDetective(today) : makeDetective(rnd(), mode === 'D' ? 2 : 3))
  const base = mode === 'D' ? 40 : mode === 'E' ? 120 : 60
  const [data, setData] = useState<Detective>(make)
  const [n, setN] = useState(0)
  const [stage, setStage] = useState(0)
  const [vals, setVals] = useState<string[]>([])
  const [fb, setFb] = useState('')
  const [stageOk, setStageOk] = useState(false)
  const [hints, setHints] = useState([0, 0, 0])
  const [wrongs, setWrongs] = useState(0)
  const [res, setRes] = useState<Payout | null>(null)
  const [dailyNew, setDailyNew] = useState(false)
  // boss timer
  const [timed, setTimed] = useState(true)
  const [limit, setLimit] = useState(240)
  const [started, setStarted] = useState(mode !== 'E')
  const [left, setLeft] = useState(240)
  const [over, setOver] = useState(false)
  const endAt = useRef(0)
  useEffect(() => {
    if (mode !== 'E' || !started || !timed || res || over) return
    endAt.current = Date.now() + left * 1000
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0) { setOver(true); actions.answer(false, 'E', false); clearInterval(id) }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timed, res, over, mode])

  const reset = (fresh: boolean, startNow = false) => {
    if (fresh) setData(make())
    setN((x) => x + 1); setStage(0); setVals([]); setFb(''); setStageOk(false); setHints([0, 0, 0]); setWrongs(0); setRes(null); setOver(false)
    setStarted(mode !== 'E' || startNow); setLeft(limit)
  }
  const totalHints = hints.reduce((a, b) => a + b, 0)
  const nIn = stage === 0 ? data.n : data.n
  const labels = data.n === 2 ? ['c_1', 'c_0'] : ['c_2', 'c_1', 'c_0']
  const hintCost = Math.max(2, Math.round(base * 0.12))

  const stageHints: string[][] = [
    ['For an $n\\times n$ matrix the monic characteristic polynomial is $\\lambda^n-(\\operatorname{tr}A)\\lambda^{n-1}+\\dots$. The first coefficient is minus the trace.', `The trace of this matrix is $${data.trace}$. The constant term is $(-1)^n\\det(A)=${data.coeffs[data.coeffs.length - 1]}$ up to your arithmetic, so compute $\\det(A)$ carefully.`],
    ['Factor the polynomial, or look for integer roots that divide the constant term.', `The roots add up to the trace, $${data.trace}$.`],
    data.vecRound.hints,
  ]
  const polyExpr = data.n === 2 ? '\\lambda^{2}+(\\,c_1\\,)\\lambda+(\\,c_0\\,)=0' : '\\lambda^{3}+(\\,c_2\\,)\\lambda^{2}+(\\,c_1\\,)\\lambda+(\\,c_0\\,)=0'
  const polyTexFull = (() => { const c = data.coeffs; const terms = [`\\lambda^{${data.n}}`]; c.forEach((x, i) => { const p = data.n - 1 - i; if (x !== 0) terms.push(`${x < 0 ? '-' : '+'}${Math.abs(x) === 1 && p > 0 ? '' : Math.abs(x)}${p === 0 ? '' : p === 1 ? '\\lambda' : `\\lambda^{${p}}`}`) }); return terms.join('') })()

  const finish = (wr: number) => {
    const extra = mode === 'E' && timed ? Math.round((left / limit) * 50) : 0
    let dailyExtra = 0
    if (mode === 'daily') { const first = actions.completeDaily(today); dailyExtra = first ? 40 : 0; setDailyNew(first) }
    const b = mode === 'daily' && dailyDone ? 10 : base
    const p = payout(mode, b, totalHints, wr, extra + dailyExtra, mode === 'E' ? 'Boss defeated' : mode === 'daily' ? 'Daily Challenge' : 'Matrix Detective')
    if (mode === 'E') actions.bossWin(timed)
    setRes(p)
  }
  const bad = (text: string) => { setFb(text); setWrongs((w) => w + 1); actions.answer(false, mode, totalHints > 0) }

  const check = () => {
    if (over) return
    if (stage === 0) {
      const ps = data.coeffs.map((_, i) => parseEntry(vals[i] ?? ''))
      const err = ps.find((p) => !p.ok)
      if (err && !err.ok) { setFb(err.msg); return }
      const ok = ps.every((p, i) => p.ok && p.value.eq(Frac.of(data.coeffs[i])))
      if (ok) { setFb(''); setStageOk(true) }
      else {
        const c1 = ps[0].ok ? ps[0].value : null
        bad(c1 && c1.eq(Frac.of(data.trace)) && data.trace !== 0 ? `The sign of $c_${data.n - 1}$ is off: it is minus the trace, not the trace.` : 'Not quite. Check the trace, the sums of 2×2 minors (3×3 only) and the determinant, and watch the signs.')
      }
    } else if (stage === 1) {
      const ps = Array.from({ length: data.n }, (_, i) => parseEntry(vals[i] ?? ''))
      const err = ps.find((p) => !p.ok)
      if (err && !err.ok) { setFb(err.msg); return }
      const got = ps.map((p) => (p.ok ? p.value : Frac.ZERO)).sort((a, b) => a.cmp(b)).map(String)
      const want = [...data.eigs].sort((a, b) => a - b).map(String)
      const hits = want.filter((w) => { const i = got.indexOf(w); if (i >= 0) { got.splice(i, 1); return true } return false }).length
      if (hits === data.n) { setFb(''); setStageOk(true) }
      else bad(`${hits} of ${data.n} are correct. Plug a guess into the polynomial: a true eigenvalue makes it equal 0.`)
    }
  }
  const nextStage = () => { setStage((s) => s + 1); setVals([]); setFb(''); setStageOk(false) }
  const expl = [
    `Here $c_{${data.n - 1}}=-\\operatorname{tr}(A)=${-data.trace}$ and the constant term is ${data.coeffs[data.coeffs.length - 1]}: $${polyTexFull}=0$.`,
    `$${polyTexFull}=${data.eigs.map(linFac).join('')}$, so the eigenvalues are ${data.eigs.map((e) => `$${e}$`).join(', ')}.`,
  ]

  const title = mode === 'D' ? 'Matrix Detective' : mode === 'E' ? 'Eigenvalue Boss Challenge' : `Daily Challenge · ${today}`
  return (
    <div className="flex flex-col gap-4" key={n}>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h3 className="m-0 text-2xl font-extrabold">{title}</h3>
        {mode === 'daily' && <span className="chip">{dailyDone ? 'Completed today: replays give less XP' : 'Bonus +40 XP for finishing today'}</span>}
      </div>
      {mode === 'E' && !started && (
        <div className="glass-flat p-4 flex flex-col gap-3">
          <p className="m-0">A 3×3 matrix with three distinct eigenvalues. Find its characteristic polynomial, its eigenvalues and one eigenvector. Finish with time to spare for a bonus of up to +50 XP.</p>
          <label className="flex items-center gap-2 font-bold"><input id="boss-timed" type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> Use a timer (untimed practice is fine)</label>
          {timed && <label className="flex items-center gap-2 font-bold">Time limit
            <select id="boss-limit" className="field" value={limit} onChange={(e) => { setLimit(+e.target.value); setLeft(+e.target.value) }}>
              <option value={120}>2 minutes</option><option value={240}>4 minutes</option><option value={420}>7 minutes</option></select></label>}
          <button className="btn btn-primary btn-lg self-start" onClick={() => { setLeft(limit); setStarted(true) }}><Icon name="bolt" />Start the fight</button>
        </div>
      )}
      {started && (
        <>
          {mode === 'E' && timed && !res && (
            <div className="flex items-center gap-3" role="timer" aria-label="Time left"><Icon name="clock" /><span className="display text-2xl font-extrabold tabular-nums" style={{ color: left < 30 ? 'var(--bad)' : undefined }}>{fmtClock(left)}</span><ProgressBar className="flex-1" pct={(left / limit) * 100} label="Time left" /></div>
          )}
          <MatrixCard A={data.matrix} />
          <ol className="m-0 p-0 list-none flex gap-2" aria-label="Detective stages">
            {['Characteristic polynomial', 'Eigenvalues', 'Eigenvector'].map((s, i) => (
              <li key={s} className="chip" aria-current={i === stage ? 'step' : undefined} style={{ background: i < stage || (res && i === 2) ? 'var(--good-bg)' : i === stage ? 'var(--tip-bg)' : undefined, opacity: i > stage ? 0.6 : 1 }}>{i < stage || (res && i === 2) ? '✓ ' : ''}{s}</li>))}
          </ol>
          {over && !res ? (
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--bad-bg)' }}>
              <div className="font-extrabold text-xl" style={{ color: 'var(--bad)' }}>Time is up!</div>
              <div><RichText text={`The polynomial is $${polyTexFull}=0$ with eigenvalues ${data.eigs.map((e) => `$${e}$`).join(', ')}.`} /></div>
              <div className="flex gap-2 flex-wrap"><button className="btn btn-primary" onClick={() => reset(true)}>Try a new boss</button><button className="btn btn-ghost" onClick={() => { setTimed(false); reset(false, true) }}>Retry untimed</button></div>
            </div>
          ) : stage < 2 ? (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-lg font-semibold">{stage === 0 ? 'Stage 1. Write the characteristic polynomial (monic form) by filling in the coefficients.' : `Stage 2. Solve the equation and enter all ${data.n} eigenvalues, in any order.`}</p>
              {stage === 0 && <div className="math-block"><Tex math={polyExpr} display /></div>}
              {stage === 1 && <div className="math-block"><Tex math={`${polyTexFull}=0`} display /></div>}
              <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => { e.preventDefault(); if (!stageOk) check() }}>
                {Array.from({ length: nIn }, (_, i) => (
                  <label key={i} className="flex flex-col gap-1 font-bold"><span>{stage === 0 ? <Tex math={labels[i]} /> : <Tex math={`\\lambda_{${i + 1}}`} />}</span>
                    <input id={`det-${stage}-${i}`} className="field w-28 text-center text-lg" autoComplete="off" value={vals[i] ?? ''} disabled={stageOk}
                      onChange={(e) => setVals((v) => { const c = v.slice(); c[i] = e.target.value; return c })} /></label>))}
                <button className="btn btn-primary" type="submit" disabled={stageOk}>Check</button>
              </form>
              {fb && <div role="alert" className="rounded-2xl px-4 py-3" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}><RichText text={fb} /></div>}
              {stageOk && (<div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--good-bg)' }}><div className="flex items-center gap-3"><CheckMark size={36} /><strong style={{ color: 'var(--good)' }}>Stage {stage + 1} cleared</strong></div><RichText text={expl[stage]} /><button className="btn btn-primary self-start" onClick={nextStage}>Next stage<Icon name="arrowR" size={18} /></button></div>)}
              {!stageOk && <HintBox hints={stageHints[stage]} used={hints[stage]} cost={hintCost} onUse={() => { setHints((h) => h.map((x, i) => (i === stage ? x + 1 : x))); actions.useHint() }} />}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-lg font-semibold"><RichText text={`Stage 3. ${data.vecRound.prompt}`} /></p>
              <MCBoard round={data.vecRound} done={!!res} onCorrect={() => finish(wrongs)} onWrong={() => { setWrongs((w) => w + 1); actions.answer(false, mode, totalHints > 0) }} />
              {!res && <HintBox hints={stageHints[2]} used={hints[2]} cost={hintCost} onUse={() => { setHints((h) => h.map((x, i) => (i === 2 ? x + 1 : x))); actions.useHint() }} />}
              {res && <ResultCard p={res} explain={data.vecRound.explain + (mode === 'daily' && dailyNew ? ' Daily bonus earned. Come back tomorrow to extend your streak.' : '')} onNext={() => reset(mode !== 'daily')} nextLabel={mode === 'daily' ? 'Replay for practice' : mode === 'E' ? 'Fight another boss' : 'Next case'} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- Arena ---------------------------------------------------------------------------------
const CARDS: { id: ActivityId; name: string; blurb: string; xp: string }[] = [
  { id: 'A', name: 'A · Find the Eigenvalue', blurb: 'Pick the number that makes det(A − λI) = 0.', xp: 'up to 10 XP' },
  { id: 'B', name: 'B · Match the Eigenvector', blurb: 'Choose the vector that A only stretches.', xp: 'up to 15 XP' },
  { id: 'C', name: 'C · Complete the Missing Step', blurb: 'Fill in a blank in the working.', xp: 'up to 15 XP' },
  { id: 'D', name: 'D · Matrix Detective', blurb: 'Three connected stages for a 2×2 matrix.', xp: 'up to 40 XP' },
  { id: 'E', name: 'E · Eigenvalue Boss', blurb: 'A 3×3 matrix. Timer optional.', xp: 'up to 170 XP' },
  { id: 'daily', name: 'Daily Challenge', blurb: 'A new matrix every day. Keep the streak alive.', xp: '60 XP + 40 bonus' },
]

export function Practice({ initial }: { initial?: ActivityId | null }) {
  const p = useProgress()
  const [active, setActive] = useState<ActivityId | null>(initial ?? null)
  const [confirm, setConfirm] = useState<ActivityId | null>(null)
  useEffect(() => { if (initial) setActive(initial) }, [initial])
  const today = todayStr()
  const dailyDone = p.daily.lastDone === today
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title={<>Practice <span className="grad-text">Arena</span></>} sub="Every question is generated fresh and checked by arithmetic, so you can replay as often as you like. Hints and wrong tries cost a little XP; a clean run earns three stars." />
      <div className="flex flex-wrap gap-2 items-center">
        <span className="chip"><Icon name="flame" size={16} /> Streak {p.streak}</span><span className="chip">Best {p.bestStreak}</span><span className="chip">{p.xp} XP</span><span className="chip"><Stars n={Math.min(3, p.stars)} /> {p.stars} stars</span>
      </div>
      {!active ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => {
            const s = p.activity[c.id]
            return (
              <div key={c.id} className="glass p-5 flex flex-col gap-3 min-w-0">
                <h3 className="m-0 text-xl font-extrabold">{c.name}</h3>
                <p className="m-0 muted flex-1">{c.blurb}</p>
                <div className="flex flex-wrap gap-2 text-sm"><span className="chip">{c.xp}</span><span className="chip">{s.correct} solved</span>{c.id === 'daily' && <span className="chip">{dailyDone ? 'Done today' : 'Not done yet'} · streak {p.daily.streak}</span>}</div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={() => setActive(c.id)}>{s.rounds ? 'Play again' : 'Play'}</button>
                  {s.rounds > 0 && (confirm === c.id
                    ? <><button className="btn btn-ghost btn-sm" onClick={() => { actions.resetActivity(c.id); setConfirm(null) }}>Yes, reset stats</button><button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Cancel</button></>
                    : <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(c.id)}><Icon name="reset" size={16} />Reset</button>)}
                </div>
              </div>)
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button className="btn btn-ghost btn-sm self-start" onClick={() => setActive(null)}><Icon name="arrowL" size={16} />All activities</button>
          <section className="glass p-5 sm:p-6 min-w-0" aria-label="Activity">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                {active === 'A' && <MCPlay id="A" make={makeA} base={10} title="Find the eigenvalue" />}
                {active === 'B' && <MCPlay id="B" make={makeB} base={15} title="Match the eigenvector" />}
                {active === 'C' && <FillPlay />}
                {active === 'D' && <DetectivePlay mode="D" />}
                {active === 'E' && <DetectivePlay mode="E" />}
                {active === 'daily' && <DetectivePlay mode="daily" />}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      )}
    </div>
  )
}
export { useMemo }
