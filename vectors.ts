// Eigenvectors: Gauss–Jordan elimination over the field that contains the eigenvalue
// (Q, Q(√m) or approximate C), recording every row operation so the UI can show the work.
import { Frac, gcd, lcm, babs } from './frac'
import { Field, FracField, quadField, cxField, QF } from './field'
import { Lam, Group, lamApprox } from './roots'
import { Block } from './types'
import { Cx, cx, cabs } from './complex'
import { bmatrix, colVec, fracTex, fracParen, cxTex, fmtFloat } from './tex'

type Any = any

export function fieldFor(lam: Lam, scale: number, tolMult = 1): { F: Field<Any>; lamE: Any } {
  if (lam.kind === 'Q') return { F: FracField, lamE: lam.v }
  if (lam.kind === 'QF') return { F: quadField(lam.m), lamE: { a: lam.a, b: lam.b } as QF }
  return { F: cxField(1e-7 * Math.max(1, scale) * tolMult), lamE: cx(lam.re, lam.im) }
}

interface Step { op: string; M: Any[][] }
const clone = <T,>(M: T[][]) => M.map((r) => r.slice())

const simpleCoef = (s: string) => /^-?(\d+|\\frac\{\d+\}\{\d+\})$/.test(s)
const wrap = (s: string) => (simpleCoef(s) ? s : `\\left(${s}\\right)`)

export function rref<T>(F: Field<T>, M0: T[][], pickLargest: boolean) {
  const rows = M0.length, cols = M0[0].length
  let M = clone(M0)
  const clean = () => { M = M.map((r) => r.map((x) => (F.isZero(x) ? F.zero : x))) }
  clean()
  const steps: Step[] = []
  const pivots: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let pr = -1
    if (pickLargest) {
      let best = 0
      for (let i = r; i < rows; i++) { const a = F.abs(M[i][c]); if (!F.isZero(M[i][c]) && a > best) { best = a; pr = i } }
    } else for (let i = r; i < rows; i++) if (!F.isZero(M[i][c])) { pr = i; break }
    if (pr < 0) continue
    if (pr !== r) {
      ;[M[pr], M[r]] = [M[r], M[pr]]
      steps.push({ op: `R_{${r + 1}}\\leftrightarrow R_{${pr + 1}}`, M: clone(M) })
    }
    const p = M[r][c]
    if (!F.eq(p, F.one)) {
      const inv = F.div(F.one, p)
      M[r] = M[r].map((x) => F.div(x, p))
      M[r][c] = F.one
      clean()
      steps.push({ op: `R_{${r + 1}}\\leftarrow ${wrap(F.tex(inv))}\\,R_{${r + 1}}`, M: clone(M) })
    }
    for (let k = 0; k < rows; k++) {
      if (k === r) continue
      const f = M[k][c]
      if (F.isZero(f)) continue
      M[k] = M[k].map((x, j) => F.sub(x, F.mul(f, M[r][j])))
      M[k][c] = F.zero
      clean()
      let op: string
      const ap = F.approx(f)
      if (F.name === 'Q' && ap.re < 0) {
        const pos = F.neg(f)
        op = `R_{${k + 1}}\\leftarrow R_{${k + 1}}+${F.eq(pos, F.one) ? '' : wrap(F.tex(pos)) + '\\,'}R_{${r + 1}}`
      } else op = `R_{${k + 1}}\\leftarrow R_{${k + 1}}-${F.eq(f, F.one) ? '' : wrap(F.tex(f)) + '\\,'}R_{${r + 1}}`
      steps.push({ op, M: clone(M) })
    }
    pivots.push(c)
    r++
  }
  return { R: M, pivots, steps }
}

/** Linear combination a1 x1 + a2 x2 ... written with tidy signs; '0' when empty. */
function linComb<T>(F: Field<T>, items: { coef: T; name: string }[]): string {
  let out = ''
  for (const { coef, name } of items) {
    if (F.isZero(coef)) continue
    if (F.name === 'Q') {
      const f = coef as unknown as Frac
      const neg = f.n < 0n
      const a = f.abs()
      const body = (a.isOne() ? '' : fracTex(a)) + name
      out += out === '' ? (neg ? '-' : '') + body : (neg ? ' - ' : ' + ') + body
    } else {
      const body = F.eq(coef, F.one) ? name : `\\left(${F.tex(coef)}\\right)${name}`
      out += out === '' ? body : ' + ' + body
    }
  }
  return out || '0'
}

export interface SpaceVector { elems: Any[]; tex: string[]; approx: Cx[] }
export interface Space {
  blocks: Block[]
  vectors: SpaceVector[]
  geo: number
  F: Field<Any>
  lamE: Any
  failed: boolean
  tolNote?: string
}

/** Tidy a basis vector: clear denominators / fix sign without changing the direction. */
function tidy(F: Field<Any>, v: Any[]): { v: Any[]; changed: boolean } {
  if (F.name === 'N') return { v, changed: false }
  let out = v
  if (F.name === 'Q') {
    let L = 1n
    for (const x of v as Frac[]) L = lcm(L, x.d)
    let g = 0n
    for (const x of v as Frac[]) g = gcd(g, x.n * (L / x.d))
    const mult = new Frac(L, g || 1n)
    out = (v as Frac[]).map((x) => x.mul(mult))
  } else {
    let L = 1n
    for (const x of v as QF[]) L = lcm(lcm(L, x.a.d), x.b.d)
    const mult = new Frac(L)
    out = (v as QF[]).map((x) => ({ a: x.a.mul(mult), b: x.b.mul(mult) }))
  }
  const first = out.find((x) => !F.isZero(x))
  if (first) {
    const ap = F.approx(first)
    if (ap.re < -1e-12 || (Math.abs(ap.re) <= 1e-12 && ap.im < -1e-12 && F.name === 'Q')) out = out.map((x) => F.neg(x))
  }
  const changed = out.some((x, i) => !F.eq(x, v[i]))
  return { v: out, changed }
}

export function eigenspace(A: Frac[][], g: Group, idx: number, scale: number): Space {
  const n = A.length
  const blocks: Block[] = []
  const lamLabel = g.lam.kind === 'N' ? g.tex : g.tex
  // pick the field; for approximate eigenvalues loosen the tolerance step by step if nothing is found
  let attempt = 0
  const mults = g.lam.kind === 'N' ? [1, 100, 10000] : [1]
  let F!: Field<Any>, lamE: Any, R: Any[][] = [], pivots: number[] = [], steps: Step[] = [], B: Any[][] = []
  for (attempt = 0; attempt < mults.length; attempt++) {
    ;({ F, lamE } = fieldFor(g.lam, scale, mults[attempt]))
    B = A.map((row, i) => row.map((a, j) => F.sub(F.fromFrac(a), i === j ? lamE : F.zero)))
    ;({ R, pivots, steps } = rref(F, B, F.name === 'N'))
    if (n - pivots.length >= 1) break
  }
  const free = Array.from({ length: n }, (_, j) => j).filter((j) => !pivots.includes(j))
  const par = (s: string, neg: boolean) => (neg || s.includes('\\frac') || s.includes(' ') ? `\\left(${s}\\right)` : s)
  const lamParen = par(F.tex(lamE), F.approx(lamE).re < 0 || F.name !== 'Q')

  blocks.push({ t: 'h', text: `Eigenvalue $\\lambda=${lamLabel}$` + (g.mult > 1 ? ` (algebraic multiplicity ${g.mult})` : '') })
  blocks.push({ t: 'p', text: 'Substitute this value of $\\lambda$ into $A-\\lambda I$ (it only changes the diagonal):' })
  const sub = A.map((row, i) => row.map((a, j) => (i === j ? `${fracTex(a)}-${lamParen}` : fracTex(a))))
  const subVal = B.map((row) => row.map((x) => F.tex(x)))
  blocks.push({ t: 'math', tex: `A-\\lambda I=${bmatrix(sub)}=${bmatrix(subVal)}` })
  blocks.push({ t: 'p', text: 'We need every non-zero $\\mathbf v$ with $(A-\\lambda I)\\mathbf v=\\mathbf 0$. The right-hand side is all zeros and stays zero during row operations, so we row-reduce the coefficient matrix only.' })
  if (F.name === 'N') blocks.push({ t: 'note', tone: 'warn', text: 'This eigenvalue is approximate, so the row reduction below uses decimals (shown rounded to 4 places). Entries smaller than the numerical tolerance are treated as zero.' })
  else if (F.name === 'QF') blocks.push({ t: 'note', tone: 'info', text: `The arithmetic below is exact, using numbers of the form $a+b${(g.lam as Any).m > 0n ? `\\sqrt{${(g.lam as Any).m}}` : (g.lam as Any).m === -1n ? 'i' : `\\sqrt{${-(g.lam as Any).m}}\\,i`}$.` })

  if (steps.length === 0) blocks.push({ t: 'math', tex: bmatrix(subVal) + '\\quad\\text{(already in reduced form)}' })
  else {
    blocks.push({ t: 'math', tex: bmatrix(subVal) })
    for (const s of steps) blocks.push({ t: 'math', tex: `\\xrightarrow{\\,${s.op}\\,}\\;${bmatrix(s.M.map((r) => r.map((x) => F.tex(x))))}` })
  }
  const failed = free.length === 0
  if (failed) {
    blocks.push({ t: 'note', tone: 'warn', text: 'Row reduction found no free variable, so this computation could not find a non-zero eigenvector for this eigenvalue. For approximate eigenvalues this means the numerical tolerance was too strict to decide reliably; try a nearby exact matrix or fewer decimals.' })
    return { blocks, vectors: [], geo: 0, F, lamE, failed: true }
  }
  if (attempt > 0 && F.name === 'N') blocks.push({ t: 'note', tone: 'warn', text: 'The numerical tolerance had to be loosened to find this eigenvector because the eigenvalue is only approximate.' })

  // read the solution off the reduced matrix
  const tn = (j: number) => (free.length === 1 ? 't' : `t_{${j + 1}}`)
  blocks.push({ t: 'p', text: `Columns ${free.map((f) => `$${f + 1}$`).join(', ')} ${free.length === 1 ? 'has' : 'have'} no pivot, so ${free.map((f) => `$v_{${f + 1}}$`).join(', ')} ${free.length === 1 ? 'is a free variable' : 'are free variables'}. Free variables can take any value; call ${free.length === 1 ? `it $${tn(0)}$` : 'them ' + free.map((_, j) => `$${tn(j)}$`).join(', ')}. Each pivot variable is then determined by its row:` })
  const eqRows = pivots.map((pc, k) => {
    const lhs = linComb(F, [{ coef: F.one, name: `v_{${pc + 1}}` }, ...free.map((f) => ({ coef: R[k][f], name: `v_{${f + 1}}` }))])
    const rhs = linComb(F, free.map((f, j) => ({ coef: F.neg(R[k][f]), name: tn(j) })))
    return `${lhs}&=0\\;\\Rightarrow\\; v_{${pc + 1}}=${rhs}`
  })
  const freeRows = free.map((f, j) => `v_{${f + 1}}&=${tn(j)}`)
  blocks.push({ t: 'math', tex: `\\begin{aligned}${[...eqRows, ...freeRows].join('\\\\')}\\end{aligned}` })

  // basis vectors: one per free variable (set it to 1, others to 0)
  const raw: Any[][] = free.map((f) => {
    const v: Any[] = Array(n).fill(F.zero)
    v[f] = F.one
    pivots.forEach((pc, k) => { v[pc] = F.neg(R[k][f]) })
    return v
  })
  const vectors: SpaceVector[] = []
  const nameFor = (j: number) => (free.length === 1 ? `\\mathbf v_{${idx}}` : `\\mathbf v_{${idx},${j + 1}}`)
  if (free.length > 1)
    blocks.push({ t: 'math', tex: `\\mathbf v=${free.map((_, j) => `${tn(j)}${colVec(raw[j].map((x: Any) => F.tex(x)))}`).join('+')}` })
  raw.forEach((v, j) => {
    const { v: tv, changed } = tidy(F, v)
    const shown = changed ? tv : v
    blocks.push({ t: 'p', text: free.length === 1 ? `Choose ${tn(0)}$=1$ (any non-zero value works):` : `Set ${tn(j)}$=1$ and the other free variables to $0$:` })
    blocks.push({ t: 'math', tex: `${nameFor(j)}=${colVec(v.map((x: Any) => F.tex(x)))}` })
    if (changed) {
      blocks.push({ t: 'p', text: F.name === 'Q' ? 'Multiplying by a non-zero number to clear fractions (and make the first entry positive) gives an equivalent, tidier eigenvector:' : 'Scaling to clear fractions gives an equivalent eigenvector:' })
      blocks.push({ t: 'math', tex: `${nameFor(j)}=${colVec(tv.map((x: Any) => F.tex(x)))}` })
    }
    vectors.push({ elems: shown, tex: shown.map((x: Any) => F.tex(x)), approx: shown.map((x: Any) => F.approx(x)) })
  })
  blocks.push({ t: 'note', tone: 'tip', text: 'Any non-zero scalar multiple of an eigenvector is also an eigenvector for the same eigenvalue, so different books may print different (but equivalent) answers.' })

  // multiplicity analysis
  const geo = free.length
  if (g.mult === 1 && geo === 1) {
    blocks.push({ t: 'p', text: 'The eigenvalue is simple (algebraic multiplicity 1), so it has exactly one independent eigenvector direction.' })
  } else if (geo === g.mult) {
    blocks.push({ t: 'note', tone: 'good', text: `Algebraic multiplicity ${g.mult} and geometric multiplicity ${geo} (the number of free variables) match, so this eigenvalue has ${geo} independent eigenvector${geo > 1 ? 's' : ''}.` })
  } else if (geo < g.mult) {
    blocks.push({ t: 'note', tone: 'warn', text: `Algebraic multiplicity is ${g.mult} but only ${geo} independent eigenvector${geo > 1 ? 's' : ''} exist (geometric multiplicity ${geo}). This eigenvalue is defective, so $A$ is not diagonalizable.${F.name === 'N' ? ' Because the eigenvalue is approximate, this conclusion depends on the numerical tolerance.' : ''}` })
  } else {
    blocks.push({ t: 'note', tone: 'warn', text: `More free variables (${geo}) than the multiplicity (${g.mult}) were found. This can only happen from numerical tolerance, so treat the extra vectors with caution.` })
  }
  return { blocks, vectors, geo, F, lamE, failed: false }
}

// ---- verification: A v = λ v ------------------------------------------------
export function verifyVector(A: Frac[][], F: Field<Any>, lamE: Any, v: Any[], name: string, lamTex: string): { blocks: Block[]; ok: boolean; residual: number } {
  const n = A.length
  const blocks: Block[] = []
  const Av = A.map((row) => row.reduce((acc: Any, a, j) => F.add(acc, F.mul(F.fromFrac(a), v[j])), F.zero))
  const lv = v.map((x) => F.mul(lamE, x))
  let ok: boolean
  let residual = 0
  const vNorm = Math.max(1e-300, ...v.map((x) => F.abs(x)))
  const aScale = Math.max(1, ...A.flat().map((x) => Math.abs(x.toNumber())))
  if (F.name === 'N') {
    residual = Math.max(...Av.map((x, i) => cabs({ re: (x as Cx).re - (lv[i] as Cx).re, im: (x as Cx).im - (lv[i] as Cx).im })))
    ok = residual <= 1e-6 * aScale * vNorm
  } else {
    ok = Av.every((x, i) => F.eq(x, lv[i]))
    residual = 0
  }
  const vT = colVec(v.map((x) => F.tex(x)))
  if (F.name === 'Q') {
    const term = (a: Frac, x: Frac) => `${fracParen(a)}\\cdot${fracParen(x)}`
    const rowsExpr = A.map((row) => [row.map((a, j) => term(a, v[j] as Frac)).join('+')])
    blocks.push({ t: 'math', tex: `A${name}=${bmatrix(A.map((r) => r.map(fracTex)))}${vT}=${bmatrix(rowsExpr)}=${colVec(Av.map((x) => F.tex(x)))}` })
    blocks.push({ t: 'math', tex: `\\lambda${name}=${fracParen(lamE as Frac)}${vT}=${bmatrix(v.map((x) => [`${fracParen(lamE as Frac)}\\cdot${fracParen(x as Frac)}`]))}=${colVec(lv.map((x) => F.tex(x)))}` })
  } else {
    blocks.push({ t: 'math', tex: `A${name}=${colVec(Av.map((x) => F.tex(x)))}` })
    blocks.push({ t: 'math', tex: `\\lambda${name}=\\left(${lamTex}\\right)${vT}=${colVec(lv.map((x) => F.tex(x)))}` })
  }
  const same = ok
  if (F.name === 'N') {
    blocks.push({ t: 'result', ok, text: ok ? `The two vectors agree to within ${residual.toExponential(1)} (rounding error), so $A${name}=\\lambda${name}$ holds numerically.` : `The vectors differ by ${residual.toExponential(1)}, which is more than rounding error. Do not trust this vector.` })
  } else {
    blocks.push({ t: 'result', ok: same, text: same ? `$A${name}$ and $\\lambda${name}$ are exactly equal, so $A${name}=\\lambda${name}$ is verified.` : `$A${name}$ and $\\lambda${name}$ differ, so this vector is not valid.` })
  }
  return { blocks, ok, residual }
}
export { fmtFloat, cxTex, lamApprox, babs }
