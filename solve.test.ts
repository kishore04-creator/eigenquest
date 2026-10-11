import { describe, it, expect } from 'vitest'
import { solveMatrix } from './solve'

const S = (M: (number | string)[][]) => M.map((r) => r.map(String))
const run = (M: (number | string)[][]) => {
  const o = solveMatrix(S(M))
  if (!o.ok) throw new Error(o.message)
  return o.result
}
const vals = (M: (number | string)[][]) => run(M).eigenvalues.map((e) => [e.approx.re, e.approx.im, e.algMult, e.geoMult] as const)
const near = (a: number, b: number, t = 1e-6) => Math.abs(a - b) < t

describe('2x2', () => {
  it('sample matrix [[2,1],[1,2]] matches the brief exactly', () => {
    const r = run([[2, 1], [1, 2]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['3', '1'])
    expect(r.eigenvalues[0].vectors[0].tex).toEqual(['1', '1'])
    expect(r.eigenvalues[1].vectors[0].tex).toEqual(['1', '-1'])
    expect(r.charPolyTex).toBe('\\lambda^{2} - 4\\lambda + 3')
    expect(r.allVerified).toBe(true)
    expect(r.checks.every((c) => c.ok)).toBe(true)
    const s2 = JSON.stringify(r.stages[1])
    expect(s2).toContain('(2-\\\\lambda)^{2}-(1)(1)')
  })
  it('complex eigenvalues of a rotation', () => {
    const r = run([[0, -1], [1, 0]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['i', '-i'])
    expect(r.allVerified).toBe(true)
    expect(r.eigenvalues.every((e) => e.isComplex)).toBe(true)
  })
  it('defective matrix', () => {
    const r = run([[2, 1], [0, 2]])
    expect(vals([[2, 1], [0, 2]])).toEqual([[2, 0, 2, 1]])
    expect(r.eigenvalues[0].defective).toBe(true)
    expect(r.warnings.join(' ')).toContain('defective')
  })
  it('repeated eigenvalue with two independent eigenvectors (identity-like)', () => {
    const r = run([[3, 0], [0, 3]])
    expect(r.eigenvalues).toHaveLength(1)
    expect(r.eigenvalues[0].geoMult).toBe(2)
    expect(r.eigenvalues[0].defective).toBe(false)
    expect(r.allVerified).toBe(true)
  })
  it('irrational eigenvalues stay exact', () => {
    const r = run([[1, 1], [1, 0]])
    expect(r.eigenvalues[0].approx.re).toBeCloseTo(1.6180339887, 8)
    expect(r.eigenvalues[1].approx.re).toBeCloseTo(-0.6180339887, 8)
    expect(r.exact).toBe(true)
    expect(r.allVerified).toBe(true)
  })
  it('decimals and fractions', () => {
    const r = run([['0.5', '1.5'], ['1/2', '2.5']])
    expect(r.allVerified).toBe(true)
    const sum = r.eigenvalues.reduce((s, e) => s + e.approx.re * e.algMult, 0)
    expect(near(sum, 3)).toBe(true)
  })
  it('complex with real part', () => {
    const r = run([[1, -2], [2, 1]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['1 + 2i', '1 - 2i'])
    expect(r.allVerified).toBe(true)
  })
  it('negative eigenvalues and zero matrix', () => {
    expect(vals([[-2, 0], [0, -5]]).map((v) => v[0])).toEqual([-2, -5])
    const z = run([[0, 0], [0, 0]])
    expect(z.eigenvalues[0].algMult).toBe(2)
    expect(z.eigenvalues[0].geoMult).toBe(2)
  })
})

describe('3x3 and larger', () => {
  it('integer eigenvalues 3x3', () => {
    const r = run([[2, 0, 0], [0, 3, 4], [0, 4, 9]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['11', '2', '1'])
    expect(r.allVerified).toBe(true)
  })
  it('tridiagonal with 2±√2', () => {
    const r = run([[2, -1, 0], [-1, 2, -1], [0, -1, 2]])
    expect(r.exact).toBe(true)
    expect(r.eigenvalues.map((e) => e.approx.re.toFixed(6))).toEqual(['3.414214', '2.000000', '0.585786'])
    expect(r.allVerified).toBe(true)
  })
  it('repeated eigenvalue, defective Jordan block', () => {
    const r = run([[2, 1, 0], [0, 2, 1], [0, 0, 2]])
    expect(r.eigenvalues[0].algMult).toBe(3)
    expect(r.eigenvalues[0].geoMult).toBe(1)
    expect(r.eigenvalues[0].defective).toBe(true)
  })
  it('repeated eigenvalue with 2D eigenspace', () => {
    const r = run([[2, 0, 0], [0, 2, 0], [0, 0, 5]])
    const e2 = r.eigenvalues.find((e) => e.tex === '2')!
    expect(e2.geoMult).toBe(2)
    expect(e2.vectors).toHaveLength(2)
    expect(r.allVerified).toBe(true)
  })
  it('3x3 with complex pair', () => {
    const r = run([[0, -1, 0], [1, 0, 0], [0, 0, 2]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['2', 'i', '-i'])
    expect(r.allVerified).toBe(true)
  })
  it('irreducible cubic falls back to numeric and says so', () => {
    const r = run([[0, 1, 0], [0, 0, 1], [1, 1, 0]])   // λ³ - λ - 1
    expect(r.exact).toBe(false)
    expect(r.warnings.join(' ')).toContain('approximate')
    expect(r.allVerified).toBe(true)
    expect(r.eigenvalues.some((e) => near(e.approx.re, 1.324718, 1e-5))).toBe(true)
  })
  it('4x4 block with rational and irrational parts', () => {
    const r = run([[2, 1, 0, 0], [1, 2, 0, 0], [0, 0, 0, -1], [0, 0, 1, 0]])
    expect(r.eigenvalues.map((e) => e.tex)).toEqual(['3', '1', 'i', '-i'])
    expect(r.allVerified).toBe(true)
  })
  it('4x4 double complex pair', () => {
    const r = run([[0, -1, 0, 0], [1, 0, 0, 0], [0, 0, 0, -1], [0, 0, 1, 0]])
    expect(r.eigenvalues).toHaveLength(2)
    expect(r.eigenvalues[0].algMult).toBe(2)
    expect(r.eigenvalues[0].geoMult).toBe(2)
    expect(r.allVerified).toBe(true)
  })
  it('5x5 all checks pass', () => {
    const r = run([[4, 1, 0, 0, 0], [0, 4, 0, 0, 0], [0, 0, 3, 2, 0], [0, 0, 2, 3, 0], [1, 0, 0, 0, -2]])
    expect(r.eigenvalues.reduce((s, e) => s + e.algMult, 0)).toBe(5)
    expect(r.allVerified).toBe(true)
    expect(r.checks.every((c) => c.ok)).toBe(true)
  })
  it('random integer matrices: engine and math.js always agree and vectors verify', () => {
    let seed = 12345
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    for (let t = 0; t < 60; t++) {
      const n = 2 + Math.floor(rnd() * 4)
      const M = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.round(rnd() * 12 - 6)))
      const r = run(M)
      const bad = r.checks.filter((c) => !c.ok)
      if (bad.length) throw new Error(`matrix ${JSON.stringify(M)} failed: ${bad.map((b) => b.label + ' ' + (b.detail ?? '')).join('; ')}`)
      expect(r.allVerified).toBe(true)
    }
  })
  it('decimal random matrices stay consistent', () => {
    let seed = 777
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    for (let t = 0; t < 30; t++) {
      const n = 2 + Math.floor(rnd() * 3)
      const M = Array.from({ length: n }, () => Array.from({ length: n }, () => (rnd() * 8 - 4).toFixed(2)))
      const r = run(M)
      const bad = r.checks.filter((c) => !c.ok)
      if (bad.length) throw new Error(`matrix ${JSON.stringify(M)} failed: ${bad.map((b) => b.label + ' ' + (b.detail ?? '')).join('; ')}`)
    }
  })
})

describe('input validation', () => {
  it('rejects non-numbers with a friendly message', () => {
    const o = solveMatrix([['1', 'abc'], ['3', '4']])
    expect(o.ok).toBe(false)
    if (!o.ok) { expect(o.message).toContain('Row 1, column 2'); expect(o.cellErrors[0]).toMatchObject({ r: 0, c: 1 }) }
  })
  it('rejects empty cells and zero denominators', () => {
    const o = solveMatrix([['1', ''], ['3/0', '4']])
    expect(o.ok).toBe(false)
    if (!o.ok) expect(o.cellErrors).toHaveLength(2)
  })
  it('rejects sizes out of range', () => {
    expect(solveMatrix([['1']]).ok).toBe(false)
  })
})
