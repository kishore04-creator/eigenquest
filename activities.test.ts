// Every practice question is generated, so these tests re-derive each answer key independently
// and make sure exactly one multiple-choice option is correct and all LaTeX parses.
import { describe, it, expect } from 'vitest'
import katex from 'katex'
import { makeA, makeB, makeC, makeDetective, dailyDetective, FillRound, MCRound } from './activities'
import { mulberry32, detMinusLambda, matVec, Mat } from './gen'

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1)
const inline = (s: string) => (s.match(/\$[^$]+\$/g) ?? []).map((m) => m.slice(1, -1))
const parses = (t: string) => { katex.renderToString(t, { throwOnError: true, strict: 'ignore' }) }
const texOfMC = (r: MCRound) => [...inline(r.prompt), ...inline(r.explain), ...r.hints.flatMap(inline), ...r.options.flatMap((o) => [o.tex, ...inline(o.why)])]
const parseMat = (tex: string): Mat => tex.replace(/\\begin\{bmatrix\}|\\end\{bmatrix\}/g, '').split('\\\\').map((r) => r.split('&').map((x) => +x.trim()))

describe('Activity A: find the eigenvalue', () => {
  it.each(SEEDS)('seed %i: exactly one option is a real eigenvalue', (s) => {
    const r = makeA(mulberry32(s))
    const roots = r.options.map((o) => ({ o, lam: +o.tex.replace('\\lambda=', '') }))
    expect(roots.filter((x) => detMinusLambda(r.matrix, x.lam) === 0).length).toBe(1)
    roots.forEach((x) => expect(x.o.correct).toBe(detMinusLambda(r.matrix, x.lam) === 0))
    expect(new Set(roots.map((x) => x.lam)).size).toBe(roots.length)
    texOfMC(r).forEach(parses)
  })
})

describe('Activity B: match the eigenvector', () => {
  it.each(SEEDS)('seed %i: exactly one option satisfies Av = λv', (s) => {
    const r = makeB(mulberry32(s))
    const lam = +(r.prompt.match(/\\lambda=(-?\d+)/)![1])
    expect(detMinusLambda(r.matrix, lam)).toBe(0)
    const flags = r.options.map((o) => { const v = parseMat(o.tex).map((row) => row[0]); return matVec(r.matrix, v).every((x, i) => x === lam * v[i]) && v.some((x) => x !== 0) })
    expect(flags.filter(Boolean).length).toBe(1)
    flags.forEach((f, i) => expect(r.options[i].correct).toBe(f))
    texOfMC(r).forEach(parses)
  })
})

describe('Activity C: complete the missing step', () => {
  it.each(SEEDS)('seed %i: blank answers match independent arithmetic', (s) => {
    const r: FillRound = makeC(mulberry32(s))
    const A = r.matrix
    parses(r.exprTex); inline(r.prompt).forEach(parses); r.hints.forEach((h) => inline(h).forEach(parses))
    expect(r.exprTex).not.toMatch(/(^|[^\\]);/)               // no stray semicolons from bad escapes
    if (A.length === 2 && r.blanks.length === 2) {
      expect(r.blanks[0].answer).toBeCloseTo(A[0][0] + A[1][1], 9)
      expect(r.blanks[1].answer).toBeCloseTo(A[0][0] * A[1][1] - A[0][1] * A[1][0], 9)
    } else if (A.length === 2) {
      const lam = +(r.prompt.match(/\\lambda=(-?\d+)/)![1])
      expect(detMinusLambda(A, lam)).toBe(0)
      const B = A.map((row, i) => row.map((x, j) => (i === j ? x - lam : x)))
      const row = B.find((x) => x[0] !== 0)!
      const a = r.blanks[0].answer
      const ratio = typeof a === 'number' ? a : a[0] / a[1]
      expect(row[0] * ratio + row[1]).toBeCloseTo(0, 9)         // v = (ratio, 1) solves the first non-zero equation
    } else {
      const t = A[0][0] + A[1][1] + A[2][2]
      const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
      expect(r.blanks[0].answer).toBeCloseTo(t, 9)
      expect(r.blanks[1].answer).toBeCloseTo(det, 9)
      const s2 = (A[0][0] * A[1][1] - A[0][1] * A[1][0]) + (A[0][0] * A[2][2] - A[0][2] * A[2][0]) + (A[1][1] * A[2][2] - A[1][2] * A[2][1])
      expect(r.exprTex).toContain(s2 < 0 ? `(${s2})` : String(s2))
    }
  })
})

describe('Detective / Boss / Daily', () => {
  it.each(SEEDS)('seed %i: polynomial, eigenvalues and eigenvector are consistent', (s) => {
    const n = 2 + (s % 2)
    const d = makeDetective(mulberry32(s), n)
    // char. polynomial coefficients re-derived by evaluating det(λI − A) at n+1 points and comparing
    const p = (x: number) => x ** n + d.coeffs.reduce((sum, c, i) => sum + c * x ** (n - 1 - i), 0)
    for (const x of [-3, -1, 0, 2, 5]) expect(p(x)).toBeCloseTo((n % 2 ? -1 : 1) * detMinusLambda(d.matrix, x), 9)
    d.eigs.forEach((e) => expect(p(e)).toBeCloseTo(0, 9))
    expect(d.eigs.length).toBe(n)
    expect(d.trace).toBe(d.matrix.reduce((sum, r, i) => sum + r[i], 0))
    expect(d.det).toBeCloseTo(detMinusLambda(d.matrix, 0), 9)
    const lam = +(d.vecRound.prompt.match(/\\lambda=(-?\d+)/)![1])
    expect(lam).toBe(Math.max(...d.eigs))
    const ok = d.vecRound.options.filter((o) => { const v = parseMat(o.tex).map((row) => row[0]); return v.some((x) => x !== 0) && matVec(d.matrix, v).every((x, i) => x === lam * v[i]) })
    expect(ok.length).toBe(1); expect(ok[0].correct).toBe(true)
    texOfMC(d.vecRound).forEach(parses)
  })
  it('daily challenge is deterministic per date and differs across dates', () => {
    expect(JSON.stringify(dailyDetective('2026-10-11'))).toBe(JSON.stringify(dailyDetective('2026-10-11')))
    const distinct = new Set(['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((d) => JSON.stringify(dailyDetective(d).matrix)))
    expect(distinct.size).toBeGreaterThan(1)
  })
})
