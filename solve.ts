// Orchestrates the whole solution: parse → characteristic polynomial (two independent methods that must agree)
// → eigenvalues → eigenvectors → verification → cross-check with math.js → 5 display stages.
import { eigs, det as mjsDet } from 'mathjs'
import { Frac } from './frac'
import { parseEntry } from './parse'
import { Poly, padd, psub, pmul, pneg, trim, peval } from './poly'
import { bmatrix, vmatrix, fracTex, fracParen, polyTex, linearFactorTex, cxTex, fmtFloat } from './tex'
import { solveMonic, groupLams, Group, lamApprox } from './roots'
import { eigenspace, verifyVector } from './vectors'
import { Cx, cx, cabs, csub } from './complex'
import type { Block, Check, CellError, EigenvalueOut, SolveOutcome, SolveResult, Stage } from './types'
import { quadField } from './field'

export const MIN_N = 2
export const MAX_N = 5

// ---- exact linear algebra helpers ------------------------------------------
type FM = Frac[][]
const matMul = (X: FM, Y: FM): FM => X.map((r) => Y[0].map((_, j) => r.reduce((s, x, k) => s.add(x.mul(Y[k][j])), Frac.ZERO)))
const trace = (X: FM) => X.reduce((s, r, i) => s.add(r[i]), Frac.ZERO)

/** Laplace expansion along the first row, in polynomial arithmetic. */
function detPoly(M: Poly[][]): Poly {
  const n = M.length
  if (n === 1) return M[0][0]
  if (n === 2) return psub(pmul(M[0][0], M[1][1]), pmul(M[0][1], M[1][0]))
  let sum: Poly = [Frac.ZERO]
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map((r) => r.filter((_, c) => c !== j))
    const term = pmul(M[0][j], detPoly(minor))
    sum = j % 2 === 0 ? padd(sum, term) : psub(sum, term)
  }
  return trim(sum)
}

/** Faddeev–LeVerrier: coefficients of det(λI − A), exact. */
function faddeev(A: FM) {
  const n = A.length
  const I: FM = A.map((_, i) => A.map((__, j) => (i === j ? Frac.ONE : Frac.ZERO)))
  const c: Frac[] = Array(n + 1).fill(Frac.ZERO)
  c[n] = Frac.ONE
  let M: FM = A.map((r) => r.map(() => Frac.ZERO))
  const traces: { k: number; tr: Frac }[] = []
  for (let k = 1; k <= n; k++) {
    const AM = matMul(A, M)
    M = AM.map((r, i) => r.map((x, j) => x.add(I[i][j].mul(c[n - k + 1]))))
    const tr = trace(matMul(A, M))
    traces.push({ k, tr })
    c[n - k] = tr.neg().div(Frac.of(k))
  }
  return { m: trim(c), traces }
}

/** Exposed for the activity generators: monic characteristic polynomial coefficients (low→high). */
export function charPolyInts(A: number[][]): number[] {
  const F = A.map((r) => r.map((x) => Frac.of(x)))
  return faddeev(F).m.map((c) => c.toNumber())
}

// ---- display helpers -------------------------------------------------------
const lamMinus = (a: Frac) => (a.isZero() ? '-\\lambda' : `${fracTex(a)}-\\lambda`)
const polyPar = (p: Poly) => `\\left(${polyTex(p)}\\right)`
const sub = (i: number, j: number) => `a_{${i + 1}${j + 1}}`

function matrixKey(A: FM) { return `${A.length}|${A.flat().map((x) => x.toString()).join(',')}` }

// ---- main entry ------------------------------------------------------------
export function solveMatrix(raw: string[][]): SolveOutcome {
  const n = raw.length
  if (n < MIN_N || n > MAX_N || raw.some((r) => r.length !== n))
    return { ok: false, message: `Choose a square matrix between ${MIN_N}×${MIN_N} and ${MAX_N}×${MAX_N}.`, cellErrors: [] }
  const cellErrors: CellError[] = []
  const A: FM = raw.map((row, r) => row.map((s, c) => {
    const p = parseEntry(s)
    if (!p.ok) { cellErrors.push({ r, c, msg: p.msg }); return Frac.ZERO }
    return p.value
  }))
  if (cellErrors.length) {
    const first = cellErrors[0]
    return { ok: false, message: `Row ${first.r + 1}, column ${first.c + 1}: ${first.msg}${cellErrors.length > 1 ? ` (${cellErrors.length - 1} more cell${cellErrors.length > 2 ? 's' : ''} need fixing too.)` : ''}`, cellErrors }
  }

  const checks: Check[] = []
  const warnings: string[] = []
  const An = A.map((r) => r.map((x) => x.toNumber()))
  const scale = Math.max(1, ...An.flat().map(Math.abs))

  // 1) characteristic polynomial, two ways ----------------------------------
  const polyMat: Poly[][] = A.map((row, i) => row.map((a, j) => (i === j ? [a, Frac.of(-1)] : [a])))
  const q = detPoly(polyMat)                       // det(A − λI)
  const { m, traces } = faddeev(A)                 // det(λI − A), monic
  const sign = n % 2 === 0 ? Frac.ONE : Frac.of(-1)
  const qFromM = m.map((c) => c.mul(sign))
  const polyAgree = trim(q).length === trim(qFromM).length && trim(q).every((c, i) => c.eq(trim(qFromM)[i]))
  checks.push({ label: 'Characteristic polynomial agrees between cofactor expansion and the Faddeev–LeVerrier method', ok: polyAgree })
  const detA = q[0]
  const trA = trace(A)

  // 2) eigenvalues -----------------------------------------------------------
  const solved = solveMonic(m)
  const groups: Group[] = groupLams(solved.lams)
  const totalMult = groups.reduce((s, g) => s + g.mult, 0)
  checks.push({ label: 'Eigenvalue multiplicities add up to n', ok: totalMult === n, detail: `${totalMult} of ${n}` })
  const sumL = groups.reduce((s, g) => s + g.approx.re * g.mult, 0)
  const prodL = groups.reduce((p, g) => { let r = p; for (let i = 0; i < g.mult; i++) r = { re: r.re * g.approx.re - r.im * g.approx.im, im: r.re * g.approx.im + r.im * g.approx.re }; return r }, cx(1))
  const tol = 1e-6 * (1 + scale ** n)
  checks.push({ label: 'Sum of eigenvalues equals the trace', ok: Math.abs(sumL - trA.toNumber()) < 1e-6 * (1 + Math.abs(trA.toNumber())) * (solved.approximate ? 100 : 1) })
  checks.push({ label: 'Product of eigenvalues equals the determinant', ok: Math.abs(prodL.re - detA.toNumber()) < tol * (solved.approximate ? 100 : 1) && Math.abs(prodL.im) < tol * (solved.approximate ? 100 : 1) })

  // independent cross-check with math.js
  try {
    const d = Number(mjsDet(An as any))
    checks.push({ label: 'math.js determinant matches the exact determinant', ok: Math.abs(d - detA.toNumber()) < 1e-6 * (1 + Math.abs(d)) })
  } catch { /* ignore */ }
  try {
    const res: any = eigs(An as any)
    const vals: any[] = Array.isArray(res.values) ? res.values : res.values.toArray()
    const act: Cx[] = vals.map((v) => (typeof v === 'number' ? cx(v) : cx(v.re, v.im)))
    const exp: Cx[] = groups.flatMap((g) => Array(g.mult).fill(g.approx))
    const rep = groups.some((g) => g.mult > 1)
    const tl = (rep ? 1e-3 : 1e-6) * (1 + scale)
    const used = new Set<number>()
    let worst = 0
    for (const e of exp) {
      let bi = -1, bd = Infinity
      act.forEach((a, i) => { if (!used.has(i)) { const dd = cabs(csub(a, e)); if (dd < bd) { bd = dd; bi = i } } })
      if (bi >= 0) used.add(bi)
      worst = Math.max(worst, bd)
    }
    checks.push({ label: 'math.js eigenvalue solver agrees', ok: act.length === exp.length && worst < tl, detail: `largest difference ${worst.toExponential(1)}` })
  } catch {
    checks.push({ label: 'math.js eigenvalue solver agrees', ok: true, skipped: true, detail: 'math.js could not handle this matrix (often a defective matrix); skipped' })
  }

  // 3) eigenvectors + 4) verification ---------------------------------------
  const spaces = groups.map((g, i) => eigenspace(A, g, i + 1, scale))
  const eigenvalues: EigenvalueOut[] = []
  const verifyBlocks: Block[] = []
  let allVerified = true
  let defectiveAny = false
  groups.forEach((g, gi) => {
    const sp = spaces[gi]
    const vecOut = sp.vectors.map((vec, vi) => {
      const nm = sp.vectors.length === 1 ? `\\mathbf v_{${gi + 1}}` : `\\mathbf v_{${gi + 1},${vi + 1}}`
      verifyBlocks.push({ t: 'h', text: `Check $\\lambda_{${gi + 1}}=${g.tex}$ with $${nm}$` })
      const v = verifyVector(A, sp.F, sp.lamE, vec.elems, nm, g.tex)
      verifyBlocks.push(...v.blocks)
      if (!v.ok) allVerified = false
      return { tex: vec.tex, approx: vec.approx, verified: v.ok }
    })
    if (sp.failed) { allVerified = false; verifyBlocks.push({ t: 'h', text: `$\\lambda_{${gi + 1}}=${g.tex}$` }, { t: 'note', tone: 'warn', text: 'No eigenvector could be reliably computed for this eigenvalue, so there is nothing to verify.' }) }
    const defective = !sp.failed && sp.geo < g.mult
    if (defective) defectiveAny = true
    eigenvalues.push({
      tex: g.tex, approx: g.approx, algMult: g.mult, geoMult: sp.geo, defective,
      exact: g.lam.kind !== 'N', isComplex: Math.abs(g.approx.im) > 1e-12, vectors: vecOut,
    })
  })
  checks.push({ label: 'Every eigenvector satisfies Av = λv', ok: allVerified })
  if (solved.approximate) warnings.push('Some eigenvalues are approximate (decimals), so eigenvectors for them are approximate too.')
  if (defectiveAny) warnings.push('This matrix is defective: at least one eigenvalue has fewer independent eigenvectors than its multiplicity, so it cannot be diagonalized.')
  if (!polyAgree) warnings.push('Internal check failed: the two characteristic-polynomial methods disagree. Please report this matrix.')

  // ---- stages ---------------------------------------------------------------
  const matrixTex = bmatrix(A.map((r) => r.map(fracTex)))
  const stages: Stage[] = []

  // Stage 1
  const s1: Block[] = []
  s1.push({ t: 'p', text: `You entered a $${n}\\times${n}$ matrix:` })
  s1.push({ t: 'math', tex: `A=${matrixTex}` })
  s1.push({ t: 'p', text: 'An **eigenvector** of $A$ is a non-zero vector that $A$ only stretches or flips, never turns. The stretch factor is its **eigenvalue** $\\lambda$:' })
  s1.push({ t: 'math', tex: 'A\\mathbf v=\\lambda\\mathbf v,\\qquad \\mathbf v\\neq\\mathbf 0' })
  s1.push({ t: 'math', tex: `\\operatorname{tr}(A)=${A.map((r, i) => fracParen(r[i])).join('+')}=${fracTex(trA)},\\qquad \\det(A)=${fracTex(detA)}` })
  s1.push({ t: 'p', text: `These two numbers are useful checks later: the eigenvalues must add up to the trace and multiply to the determinant. An $${n}\\times${n}$ matrix has exactly $${n}$ eigenvalues when we count multiplicity (and allow complex numbers).` })
  const sym = A.every((r, i) => r.every((x, j) => x.eq(A[j][i])))
  const upper = A.every((r, i) => r.every((x, j) => j >= i || x.isZero()))
  const lower = A.every((r, i) => r.every((x, j) => j <= i || x.isZero()))
  if (A.every((r, i) => r.every((x, j) => i === j || x.isZero()))) s1.push({ t: 'note', tone: 'tip', text: 'This is a diagonal matrix, so the eigenvalues are simply the diagonal entries.' })
  else if (upper || lower) s1.push({ t: 'note', tone: 'tip', text: `This matrix is ${upper ? 'upper' : 'lower'} triangular, so its eigenvalues are the diagonal entries. We still run the full method to practise it and to find the eigenvectors.` })
  else if (sym) s1.push({ t: 'note', tone: 'tip', text: 'This matrix is symmetric. A real symmetric matrix always has real eigenvalues, and eigenvectors that belong to different eigenvalues are perpendicular.' })
  stages.push({ id: 1, title: 'Matrix detected', blurb: 'What you entered and what we are looking for', blocks: s1 })

  // Stage 2
  const s2: Block[] = []
  s2.push({ t: 'p', text: 'If $A\\mathbf v=\\lambda\\mathbf v$ then $(A-\\lambda I)\\mathbf v=\\mathbf 0$ has a non-zero solution. That only happens when $A-\\lambda I$ is singular, i.e. when its determinant is zero:' })
  s2.push({ t: 'math', tex: '\\det(A-\\lambda I)=0' })
  const AmL = A.map((r, i) => r.map((a, j) => (i === j ? lamMinus(a) : fracTex(a))))
  s2.push({ t: 'p', text: 'Subtract $\\lambda$ from each diagonal entry:' })
  s2.push({ t: 'math', tex: `A-\\lambda I=${bmatrix(A.map((r) => r.map(fracTex)))}-\\lambda${bmatrix(A.map((r, i) => r.map((_, j) => (i === j ? '1' : '0'))))}=${bmatrix(AmL)}` })
  const entry = (i: number, j: number): Poly => polyMat[i][j]
  const fac = (p: Poly) => `\\left(${polyTex(p)}\\right)`
  const diagFac = (i: number) => `(${lamMinus(A[i][i])})`
  if (n === 2) {
    s2.push({ t: 'p', text: 'Expand the $2\\times2$ determinant (main diagonal product minus the other diagonal product):' })
    const same = A[0][0].eq(A[1][1])
    const first = same ? `${diagFac(0)}^{2}` : `${diagFac(0)}${diagFac(1)}`
    const bc = A[0][1].mul(A[1][0])
    s2.push({ t: 'math', tex: `\\det(A-\\lambda I)=${vmatrix(AmL.map((r) => r))}=${first}-(${fracTex(A[0][1])})(${fracTex(A[1][0])})` })
    const prod = pmul(entry(0, 0), entry(1, 1))
    s2.push({ t: 'math', tex: `=${polyPar(prod)}-(${fracTex(bc)})` })
    s2.push({ t: 'math', tex: `=${polyTex(q)}` })
    s2.push({ t: 'note', tone: 'tip', text: 'Shortcut for any $2\\times2$ matrix: $\\det(A-\\lambda I)=\\lambda^2-\\operatorname{tr}(A)\\,\\lambda+\\det(A)$.' })
  } else if (n === 3) {
    s2.push({ t: 'p', text: 'Expand along the first row (cofactor expansion), using the signs $+,-,+$:' })
    const minorM = (j: number) => AmL.slice(1).map((r) => r.filter((_, c) => c !== j))
    const mt = (j: number) => vmatrix(minorM(j))
    s2.push({ t: 'math', tex: `\\det(A-\\lambda I)=${diagFac(0)}${mt(0)}-${fracParen(A[0][1])}${mt(1)}+${fracParen(A[0][2])}${mt(2)}` })
    const minorPoly = (j: number) => detPoly(polyMat.slice(1).map((r) => r.filter((_, c) => c !== j)))
    const m2expr = (j: number) => {
      const sm = polyMat.slice(1).map((r) => r.filter((_, c) => c !== j))
      return `${fac(sm[0][0])}${fac(sm[1][1])}-${fac(sm[0][1])}${fac(sm[1][0])}`
    }
    s2.push({ t: 'p', text: 'Evaluate each $2\\times2$ minor:' })
    const lines = [0, 1, 2].map((j) => `${mt(j)}&=${m2expr(j)}=${polyTex(minorPoly(j))}`)
    s2.push({ t: 'math', tex: `\\begin{aligned}${lines.join('\\\\')}\\end{aligned}` })
    s2.push({ t: 'p', text: 'Put the three pieces back together and multiply out:' })
    s2.push({ t: 'math', tex: `\\det(A-\\lambda I)=${diagFac(0)}${fac(minorPoly(0))}-${fracParen(A[0][1])}${fac(minorPoly(1))}+${fracParen(A[0][2])}${fac(minorPoly(2))}` })
    s2.push({ t: 'math', tex: `=${polyTex(q)}` })
  } else {
    s2.push({ t: 'p', text: `For a $${n}\\times${n}$ matrix, expanding by hand takes many terms. The engine computes the polynomial two independent ways: by cofactor expansion along the first row, and with the Faddeev–LeVerrier method, which finds each coefficient from traces. They must give the same polynomial (this is one of the checks at the end).` })
    const cl = traces.map(({ k, tr }) => `c_{${n - k}}&=-\\tfrac{1}{${k}}\\operatorname{tr}(AM_{${k}})=-\\tfrac{1}{${k}}(${fracTex(tr)})=${fracTex(m[n - k])}`)
    s2.push({ t: 'math', tex: `\\begin{aligned}${cl.join('\\\\')}\\end{aligned}` })
    s2.push({ t: 'p', text: `Here $M_1=I$ and $M_{k}=AM_{k-1}+c_{${n}-k+1}I$. The coefficients give $\\det(\\lambda I-A)=\\lambda^{${n}}+c_{${n - 1}}\\lambda^{${n - 1}}+\\dots+c_0$.` })
    s2.push({ t: 'math', tex: `\\det(A-\\lambda I)=${polyTex(q)}` })
  }
  s2.push({ t: 'p', text: 'This is the **characteristic polynomial** of $A$.' })
  if (n % 2 === 1) s2.push({ t: 'p', text: `Because $n=${n}$ is odd, $\\det(A-\\lambda I)$ starts with $-\\lambda^{${n}}$. Multiplying by $-1$ does not change the roots and gives a cleaner monic equation:` })
  s2.push({ t: 'math', tex: `${polyTex(m)}=0` })
  s2.push({ t: 'note', tone: 'good', text: `Sanity check: setting $\\lambda=0$ gives $\\det(A)=${fracTex(detA)}$, which matches the constant term, and the $\\lambda^{${n - 1}}$ coefficient reflects $\\operatorname{tr}(A)=${fracTex(trA)}$.` })
  stages.push({ id: 2, title: 'Find the characteristic equation', blurb: 'Expand det(A − λI)', blocks: s2 })

  // Stage 3
  const s3: Block[] = []
  s3.push({ t: 'p', text: 'The eigenvalues are the roots of the characteristic equation:' })
  s3.push({ t: 'math', tex: `${polyTex(m)}=0` })
  s3.push(...solved.blocks)
  // factorisation
  if (!solved.approximate) {
    const parts: string[] = []
    const doneQF = new Set<number>()
    groups.forEach((g, i) => {
      const e = g.mult > 1 ? `^{${g.mult}}` : ''
      if (g.lam.kind === 'Q') parts.push(`${linearFactorTex(g.lam.v)}${e}`)
      else if (g.lam.kind === 'QF' && !doneQF.has(i)) {
        const L = g.lam
        const j = groups.findIndex((h, k) => k !== i && h.lam.kind === 'QF' && h.lam.m === L.m && h.lam.a.eq(L.a) && h.lam.b.eq(L.b.neg()))
        if (j >= 0) {
          doneQF.add(j)
          const fq: Poly = [L.a.mul(L.a).sub(L.b.mul(L.b).mul(new Frac(L.m))), L.a.mul(Frac.of(-2)), Frac.ONE]
          parts.push(`\\left(${polyTex(fq)}\\right)${e}`)
        }
      }
    })
    if (parts.length) s3.push({ t: 'math', tex: `${polyTex(m)}=${parts.join('')}=0` })
  }
  s3.push({ t: 'h', text: 'The eigenvalues' })
  groups.forEach((g, i) => {
    const kind = g.lam.kind === 'Q' ? (g.lam.v.isInt() ? 'a real integer' : 'a real rational number') : g.lam.kind === 'QF' ? (g.lam.m < 0n ? 'a complex number (it comes with its conjugate)' : 'an irrational real number') : Math.abs(g.approx.im) > 1e-12 ? 'a complex number (approximate)' : 'a real number (approximate)'
    const mult = g.mult > 1 ? ` It appears ${g.mult} times as a root, so its **algebraic multiplicity** is ${g.mult}.` : ' It appears once, so its algebraic multiplicity is 1.'
    const dec = g.lam.kind === 'QF' ? ` (≈ $${cxTex(g.approx.re, g.approx.im)}$)` : ''
    s3.push({ t: 'math', tex: `\\lambda_{${i + 1}}=${g.tex}` })
    s3.push({ t: 'p', text: `$\\lambda_{${i + 1}}$ is ${kind}${dec}.${mult}` })
  })
  s3.push({ t: 'note', tone: 'good', text: `Check: the eigenvalues add up to ${fmtFloat(sumL)} and the trace is ${fmtFloat(trA.toNumber())}; they multiply to ${cxTex(prodL.re, prodL.im)} and the determinant is ${fmtFloat(detA.toNumber())}. ${checks.find((c) => c.label.startsWith('math.js eigenvalue') && !c.skipped && c.ok) ? 'An independent solver (math.js) found the same eigenvalues.' : ''}` })
  stages.push({ id: 3, title: 'Solve for eigenvalues', blurb: 'Find the roots of the characteristic equation', blocks: s3 })

  // Stage 4
  const s4: Block[] = []
  s4.push({ t: 'p', text: 'For each eigenvalue, solve the homogeneous system $(A-\\lambda I)\\mathbf v=\\mathbf 0$. We use Gauss–Jordan row reduction and read the solution from the reduced matrix.' })
  spaces.forEach((sp) => s4.push(...sp.blocks))
  stages.push({ id: 4, title: 'Find eigenvectors', blurb: 'Solve (A − λI)v = 0 for each λ', blocks: s4 })

  // Stage 5
  const s5: Block[] = [{ t: 'p', text: 'The definition says $A\\mathbf v$ and $\\lambda\\mathbf v$ must be the same vector. Compute both sides for every eigenvector found:' }, ...verifyBlocks]
  s5.push(allVerified && groups.length
    ? { t: 'result', ok: true, text: 'Every eigenpair checks out: $A\\mathbf v=\\lambda\\mathbf v$ holds for all of them.' }
    : { t: 'result', ok: false, text: 'At least one eigenpair could not be verified. See the notes above.' })
  stages.push({ id: 5, title: 'Verify the answer', blurb: 'Confirm A·v = λ·v', blocks: s5 })

  const result: SolveResult = {
    n, matrixTex, charPolyTex: polyTex(q), charEqTex: `${polyTex(m)}=0`, eigenvalues, stages, checks,
    warnings, allVerified, exact: !solved.approximate, key: matrixKey(A), trace: trA.toNumber(), det: detA.toNumber(),
  }
  return { ok: true, result }
}
