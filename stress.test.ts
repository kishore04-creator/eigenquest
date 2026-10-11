// Independent stress tests: do not reuse the engine's own verifier. Every returned eigenpair is
// re-checked here with plain floating-point arithmetic, and all generated LaTeX must parse in KaTeX.
import { describe, it, expect } from 'vitest'
import katex from 'katex'
import { solveMatrix } from './solve'
import { SAMPLES } from '../pages/Solver'
import { LESSONS } from '../lib/lessons'
import { mulberry32, genIntEig } from '../lib/gen'
import type { Block, SolveResult } from './types'

const solve = (M: (number | string)[][]): SolveResult => {
  const o = solveMatrix(M.map((r) => r.map(String)))
  if (!o.ok) throw new Error(o.message)
  return o.result
}

/** ‖A v − λ v‖ / ‖v‖ using complex arithmetic on the displayed approximations. */
function residual(A: number[][], lam: { re: number; im: number }, v: { re: number; im: number }[]) {
  let num = 0, den = 0
  A.forEach((row, i) => {
    let re = 0, im = 0
    row.forEach((a, j) => { re += a * v[j].re; im += a * v[j].im })
    const lre = lam.re * v[i].re - lam.im * v[i].im, lim = lam.re * v[i].im + lam.im * v[i].re
    num += (re - lre) ** 2 + (im - lim) ** 2
    den += v[i].re ** 2 + v[i].im ** 2
  })
  return Math.sqrt(num / Math.max(den, 1e-300))
}

function texOf(blocks: Block[]): string[] {
  const out: string[] = []
  for (const b of blocks) {
    if (b.t === 'math') out.push(b.tex)
    else if (b.t === 'p' || b.t === 'h' || b.t === 'note' || b.t === 'result') out.push(...inlineMath(b.text))
    else if (b.t === 'list') b.items.forEach((i) => out.push(...inlineMath(i)))
  }
  return out
}
const inlineMath = (s: string) => (s.match(/\$[^$]+\$/g) ?? []).map((m) => m.slice(1, -1))
const parses = (tex: string) => { katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }) }

describe('independent verification', () => {
  const rng = mulberry32(20261011)
  const cases: number[][][] = []
  for (let k = 0; k < 120; k++) {
    const n = 2 + (k % 4)
    cases.push(Array.from({ length: n }, () => Array.from({ length: n }, () => Math.floor(rng() * 13) - 6)))
  }
  for (let k = 0; k < 40; k++) cases.push(genIntEig(2 + (k % 3), rng).A)

  it.each(cases.map((m, i) => [i, m] as const))('random matrix #%i: eigenpairs satisfy Av = λv, multiplicities sum to n', (_i, A) => {
    const r = solve(A)
    expect(r.eigenvalues.reduce((s, e) => s + e.algMult, 0)).toBe(A.length)
    const tr = A.reduce((s, row, i) => s + row[i], 0)
    expect(r.eigenvalues.reduce((s, e) => s + e.approx.re * e.algMult, 0)).toBeCloseTo(tr, 4)
    for (const e of r.eigenvalues) {
      expect(e.geoMult).toBeGreaterThanOrEqual(1)
      expect(e.geoMult).toBeLessThanOrEqual(e.algMult)
      expect(e.vectors.length).toBe(e.geoMult)
      for (const v of e.vectors) expect(residual(A, e.approx, v.approx)).toBeLessThan(1e-6)
    }
    // no eigenvector may be (numerically) zero
    r.eigenvalues.forEach((e) => e.vectors.forEach((v) => expect(v.approx.reduce((s, c) => s + c.re ** 2 + c.im ** 2, 0)).toBeGreaterThan(1e-12)))
    expect(r.allVerified).toBe(true)
  })

  it('generated eigenvalues equal the planted ones (A = P D P⁻¹)', () => {
    const r2 = mulberry32(7)
    for (let k = 0; k < 30; k++) {
      const g = genIntEig(2 + (k % 3), r2)
      const got = solve(g.A).eigenvalues.map((e) => e.approx.re).sort((a, b) => b - a)
      got.forEach((x, i) => expect(x).toBeCloseTo(g.eigs[i], 6))
    }
  })
})

describe('LaTeX safety', () => {
  const mats: number[][][] = [...SAMPLES.map((s) => s.m), [[0.5, 1.25], [-3, 2]], [[1, 2, 3], [4, 5, 6], [7, 8, 10]], [[0, 0], [0, 0]], [[1, 2, 3, 4], [0, 1, 2, 3], [0, 0, 1, 2], [0, 0, 0, 1]], [[1, 1], [1, 1]], [[-1, 0], [0, -1]]]
  it.each(mats.map((m, i) => [i, m] as const))('every formula in the solution of matrix #%i parses in KaTeX', (_i, m) => {
    const r = solve(m)
    r.stages.forEach((s) => texOf(s.blocks).forEach(parses))
    r.eigenvalues.forEach((e) => { parses(e.tex); e.vectors.forEach((v) => v.tex.forEach(parses)) })
    parses(r.matrixTex); parses(r.charPolyTex); parses(r.charEqTex)
  })
  it('all lesson text parses and lesson answers are in range', () => {
    for (const l of LESSONS) {
      texOf(l.blocks).forEach(parses); texOf(l.after ?? []).forEach(parses)
      for (const q of l.questions) {
        inlineMath(q.prompt).forEach(parses); inlineMath(q.explain).forEach(parses)
        q.options.forEach((o) => { inlineMath(o.t).forEach(parses); inlineMath(o.why ?? '').forEach(parses) })
        expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.options.length)
        // every wrong option has an explanation
        q.options.forEach((o, i) => { if (i !== q.answer) expect(o.why, `${l.id}/${q.id} option ${i}`).toBeTruthy() })
      }
      for (const ex of l.examples ?? []) { const r = solve(ex.matrix); ex.stages.forEach((n) => expect(r.stages[n - 1]).toBeDefined()) }
    }
  })
})

describe('lesson answers are mathematically right', () => {
  const det2 = (a: number, b: number, c: number, d: number) => a * d - b * c
  it('spot-checks of the numbers quoted in the lessons', () => {
    expect(det2(3, 1, 2, 4)).toBe(10)
    expect(det2(5, 2, 3, 4)).toBe(14)
    expect(1 * (1 * 1 - 3 * 0) - 2 * (0 * 1 - 3 * 2) + 0).toBe(13)
    const e = (M: number[][]) => solve(M).eigenvalues.map((x) => x.approx.re).sort((a, b) => b - a)
    expect(e([[5, 2], [2, 2]])).toEqual([6, 1].map((x) => expect.closeTo(x, 6)))
    expect(e([[1, 4], [2, 3]])).toEqual([5, -1].map((x) => expect.closeTo(x, 6)))
    expect(e([[4, 1], [2, 3]])).toEqual([5, 2].map((x) => expect.closeTo(x, 6)))
    const vA = solve([[3, 2], [1, 4]]).eigenvalues.find((x) => Math.abs(x.approx.re - 2) < 1e-9)!
    const v = vA.vectors[0].approx.map((c) => c.re)
    expect(v[0] / v[1]).toBeCloseTo(-2, 6)       // eigenvector for λ=2 is a multiple of (−2, 1)
    expect(solve([[0, 2], [-2, 0]]).eigenvalues.map((x) => Math.abs(x.approx.im)).sort()).toEqual([2, 2].map((x) => expect.closeTo(x, 6)))
    expect(solve([[2, 1], [0, 2]]).eigenvalues[0].geoMult).toBe(1)
  })
})
