// Solving the characteristic equation: exact when possible (rational roots, exact quadratic factors,
// quadratic formula with simplified radicals), numeric only as a clearly-labelled last resort.
import { Frac, babs } from './frac'
import { Poly, deg, peval, divLinear, pdivmod, intCoeffs } from './poly'
import { fracTex, fracParen, polyTex, evalTex, linearFactorTex, cxTex } from './tex'
import { polyRoots, ratApprox, cpEval } from './numeric'
import { quadField } from './field'
import type { Block } from './types'
import { Cx, cx, cabs, csub } from './complex'

export type Lam =
  | { kind: 'Q'; v: Frac }
  | { kind: 'QF'; m: bigint; a: Frac; b: Frac }   // a + b·sqrt(m)
  | { kind: 'N'; re: number; im: number }          // approximate
export interface Group { lam: Lam; mult: number; tex: string; approx: Cx }

export const lamApprox = (l: Lam): Cx =>
  l.kind === 'Q' ? cx(l.v.toNumber()) : l.kind === 'N' ? cx(l.re, l.im) : quadField(l.m).approx({ a: l.a, b: l.b })
export const lamTex = (l: Lam): string =>
  l.kind === 'Q' ? fracTex(l.v) : l.kind === 'N' ? cxTex(l.re, l.im) : quadField(l.m).tex({ a: l.a, b: l.b })

// ---- integer helpers -------------------------------------------------------
function isqrt(n: bigint): bigint {
  if (n < 2n) return n
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x
}
/** N = k² · s with s squarefree (sign kept on s). null if N is too large to factor quickly. */
export function sqfree(N: bigint): { k: bigint; s: bigint } | null {
  const x = babs(N)
  if (x > 9_000_000_000_000_000n) return null
  let n = Number(x), k = 1, s = 1
  let p = 2
  for (; p * p <= n && p <= 3_000_000; p++) {
    let e = 0
    while (n % p === 0) { n /= p; e++ }
    if (e >= 2) k *= Math.pow(p, Math.floor(e / 2))
    if (e % 2) s *= p
  }
  if (p * p <= n) return null
  s *= n
  return { k: BigInt(k), s: N < 0n ? -BigInt(s) : BigInt(s) }
}
function divisors(n: bigint): bigint[] | null {
  const x = Number(babs(n))
  if (!Number.isFinite(x) || x > 4e12) return null
  if (x === 0) return []
  const small: number[] = [], large: number[] = []
  for (let i = 1; i * i <= x; i++) if (x % i === 0) { small.push(i); if (i * i !== x) large.push(x / i) }
  return [...small, ...large.reverse()].map((v) => BigInt(v))
}

/** Rational Root Theorem: returns an exact rational root of p, or null. */
export function findRationalRoot(p: Poly): Frac | null {
  const d = deg(p)
  if (d < 1) return null
  if (p[0].isZero()) return Frac.ZERO
  const { ints } = intCoeffs(p)
  const dv0 = divisors(ints[0]), dvn = divisors(ints[d])
  if (!dv0 || !dvn || dv0.length * dvn.length > 400000) return null
  const cands: Frac[] = []
  for (const a of dv0) for (const b of dvn) cands.push(new Frac(a, b))
  cands.sort((x, y) => x.cmp(y))
  for (const c of cands) {
    if (peval(p, c).isZero()) return c
    if (peval(p, c.neg()).isZero()) return c.neg()
  }
  return null
}

/** Find an exact quadratic factor with rational coefficients, guided by numeric roots. */
function extractQuadFactor(p: Poly): { f: Poly; q: Poly } | null {
  const z = polyRoots(p.map((c) => c.toNumber()))
  for (let i = 0; i < z.length; i++)
    for (let j = i + 1; j < z.length; j++) {
      const s = { re: z[i].re + z[j].re, im: z[i].im + z[j].im }
      const pr = { re: z[i].re * z[j].re - z[i].im * z[j].im, im: z[i].re * z[j].im + z[i].im * z[j].re }
      if (Math.abs(s.im) > 1e-6 || Math.abs(pr.im) > 1e-6) continue
      const S = ratApprox(s.re), P = ratApprox(pr.re)
      if (!S || !P) continue
      const f: Poly = [P, S.neg(), Frac.ONE]
      const { q, r } = pdivmod(p, f)
      if (deg(r) < 0) return { f, q }
    }
  return null
}

// ---- main solver -----------------------------------------------------------
export interface RootSolve { lams: Lam[]; blocks: Block[]; approximate: boolean; notes: string[] }

export function solveMonic(m: Poly): RootSolve {
  const lams: Lam[] = []
  const blocks: Block[] = []
  const notes: string[] = []
  let approximate = false
  let introDone = false

  const pushQuad = (p: Poly) => {
    const c = p[0], b = p[1]
    const par = (f: Frac) => (f.n < 0n || f.d !== 1n ? `\\left(${fracTex(f)}\\right)` : fracTex(f))
    const bT = par(b)
    blocks.push({ t: 'p', text: `Solve $${polyTex(p)} = 0$ with the quadratic formula (here $a=1$, $b=${fracTex(b)}$, $c=${fracTex(c)}$).` })
    blocks.push({ t: 'math', tex: `\\lambda=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}=\\frac{-${bT}\\pm\\sqrt{${bT}^{2}-4(1)(${fracTex(c)})}}{2}` })
    const D = b.mul(b).sub(c.mul(Frac.of(4)))
    blocks.push({ t: 'math', tex: `\\text{discriminant } D=b^{2}-4ac=${fracTex(D)}` })
    const negB = b.neg()
    if (D.isZero()) {
      const r = negB.div(Frac.of(2))
      blocks.push({ t: 'math', tex: `\\lambda=\\frac{${fracTex(negB)}}{2}=${fracTex(r)}\\quad(\\text{a repeated root, because } D=0)` })
      lams.push({ kind: 'Q', v: r }, { kind: 'Q', v: r })
      return
    }
    const nSq = D.n < 0n ? null : isqrt(D.n), dSq = isqrt(D.d)
    if (nSq !== null && nSq * nSq === D.n && dSq * dSq === D.d) {
      const s = new Frac(nSq, dSq)
      const r1 = negB.add(s).div(Frac.of(2)), r2 = negB.sub(s).div(Frac.of(2))
      blocks.push({ t: 'math', tex: `\\lambda=\\frac{${fracTex(negB)}\\pm ${fracTex(s)}}{2}\\;\\Rightarrow\\;\\lambda=${fracTex(r1)}\\ \\text{ or }\\ \\lambda=${fracTex(r2)}` })
      lams.push({ kind: 'Q', v: r1 }, { kind: 'Q', v: r2 })
      return
    }
    // irrational (D>0) or complex (D<0) pair, exact via sqrt(D) = sqrt(n·d)/d
    const N = D.n * D.d
    const sf = sqfree(N)
    if (sf) {
      const F = quadField(sf.s)
      const half = new Frac(1n, 2n)
      const aPart = negB.mul(half)
      const bPart = new Frac(sf.k, D.d).mul(half)
      const sqrtTex = F.tex({ a: Frac.ZERO, b: new Frac(sf.k, D.d) })
      if (D.isInt()) blocks.push({ t: 'math', tex: `\\sqrt{D}=\\sqrt{${fracTex(D)}}=${sqrtTex}` })
      const r1 = { kind: 'QF' as const, m: sf.s, a: aPart, b: bPart }
      const r2 = { kind: 'QF' as const, m: sf.s, a: aPart, b: bPart.neg() }
      blocks.push({ t: 'math', tex: `\\lambda=\\frac{${fracTex(negB)}\\pm ${sqrtTex}}{2}\\;\\Rightarrow\\;\\lambda=${lamTex(r1)}\\ \\text{ or }\\ \\lambda=${lamTex(r2)}` })
      if (D.sign() < 0) blocks.push({ t: 'note', tone: 'info', text: 'The discriminant is negative, so the eigenvalues are a complex-conjugate pair. A real matrix can have complex eigenvalues when it rotates vectors.' })
      else blocks.push({ t: 'note', tone: 'info', text: 'The discriminant is positive but not a perfect square, so the eigenvalues are real and irrational. They are kept exact here and shown as decimals where needed.' })
      lams.push(r1, r2)
      return
    }
    // discriminant too large to simplify: numeric closed form
    approximate = true
    const Dn = D.toNumber(), bn = b.toNumber()
    const sq = Dn >= 0 ? Math.sqrt(Dn) : 0, sqi = Dn < 0 ? Math.sqrt(-Dn) : 0
    const l1: Lam = { kind: 'N', re: (-bn + sq) / 2, im: sqi / 2 }, l2: Lam = { kind: 'N', re: (-bn - sq) / 2, im: -sqi / 2 }
    blocks.push({ t: 'note', tone: 'warn', text: 'The discriminant is too large to simplify exactly, so these roots are computed in floating point (approximate).' })
    lams.push(l1, l2)
  }

  const rec = (p: Poly): void => {
    const d = deg(p)
    if (d <= 0) return
    if (d === 1) {
      const r = p[0].neg().div(p[1])
      blocks.push({ t: 'math', tex: `${polyTex(p)}=0\\;\\Rightarrow\\;\\lambda=${fracTex(r)}` })
      lams.push({ kind: 'Q', v: r })
      return
    }
    if (d === 2) { pushQuad(p); return }
    if (!introDone) {
      introDone = true
      blocks.push({ t: 'p', text: `This is a degree-${d} equation, so there is no one-line formula. We look for rational roots first (Rational Root Theorem: a rational root $p/q$ has $p$ dividing the constant term and $q$ dividing the leading coefficient), divide them out, and solve what remains.` })
    }
    const r = findRationalRoot(p)
    if (r) {
      const { ints } = intCoeffs(p)
      const dv = divisors(ints[0])
      if (dv && dv.length > 0 && dv.length <= 8 && p[0].isInt() && !p[0].isZero())
        blocks.push({ t: 'p', text: `Constant term $${fracTex(p[0])}$, so the integer candidates are ${dv.map((x) => `$\\pm${x}$`).join(', ')}.` })
      blocks.push({ t: 'p', text: `Test $\\lambda=${fracTex(r)}$:` })
      blocks.push({ t: 'math', tex: `P(${fracTex(r)})=${evalTex(p, r)}=${fracTex(peval(p, r))}` })
      const { q } = divLinear(p, r)
      blocks.push({ t: 'math', tex: `${polyTex(p)}=${linearFactorTex(r)}\\left(${polyTex(q)}\\right)` })
      lams.push({ kind: 'Q', v: r })
      rec(q)
      return
    }
    const qf = extractQuadFactor(p)
    if (qf) {
      blocks.push({ t: 'p', text: 'No more rational roots, but the remaining polynomial splits exactly into factors with rational coefficients:' })
      blocks.push({ t: 'math', tex: `${polyTex(p)}=\\left(${polyTex(qf.f)}\\right)\\left(${polyTex(qf.q)}\\right)` })
      rec(qf.f)
      rec(qf.q)
      return
    }
    approximate = true
    const num = polyRoots(p.map((c) => c.toNumber()))
    const resid = Math.max(...num.map((z) => cabs(cpEval(p.map((c) => c.toNumber()), z))))
    blocks.push({ t: 'note', tone: 'warn', text: `The remaining degree-${d} polynomial $${polyTex(p)}$ has no rational roots and no rational quadratic factor. Its roots are found numerically (Durand–Kerner iteration, polished with Newton's method), so they are approximations. Largest residual $|P(\\lambda)|\\approx ${resid.toExponential(1)}$.` })
    notes.push('Some eigenvalues are numerical approximations.')
    for (const z of num) lams.push({ kind: 'N', re: z.re, im: z.im })
  }

  rec(m)
  return { lams, blocks, approximate, notes }
}

/** Group equal eigenvalues (exact comparison; clustering for numeric ones) and sort descending. */
export function groupLams(lams: Lam[]): Group[] {
  const groups: { lam: Lam; mult: number; sum?: Cx }[] = []
  for (const l of lams) {
    let hit = groups.find((g) => {
      if (g.lam.kind !== l.kind) return false
      if (l.kind === 'Q' && g.lam.kind === 'Q') return g.lam.v.eq(l.v)
      if (l.kind === 'QF' && g.lam.kind === 'QF') return g.lam.m === l.m && g.lam.a.eq(l.a) && g.lam.b.eq(l.b)
      const a = lamApprox(g.lam), b = lamApprox(l)
      return cabs(csub(a, b)) < 1e-4 * (1 + cabs(a))
    })
    if (hit) {
      hit.mult++
      if (l.kind === 'N') hit.sum = { re: (hit.sum?.re ?? 0) + l.re, im: (hit.sum?.im ?? 0) + l.im }
    } else groups.push({ lam: l, mult: 1, sum: l.kind === 'N' ? cx(l.re, l.im) : undefined })
  }
  const out: Group[] = groups.map((g) => {
    let lam = g.lam
    if (lam.kind === 'N' && g.sum) {
      const re = g.sum.re / g.mult, im = g.sum.im / g.mult
      lam = { kind: 'N', re, im: Math.abs(im) < 1e-9 * (1 + Math.abs(re)) ? 0 : im }
    }
    return { lam, mult: g.mult, tex: lamTex(lam), approx: lamApprox(lam) }
  })
  out.sort((x, y) => (Math.abs(y.approx.re - x.approx.re) > 1e-9 ? y.approx.re - x.approx.re : y.approx.im - x.approx.im))
  return out
}
