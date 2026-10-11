// Seeded generators for practice matrices with known integer eigenvalues.
export type Rng = () => number
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
export const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1))
export const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r() * arr.length)]
export function shuffle<T>(r: Rng, arr: T[]): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

export type Mat = number[][]
export const identity = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
export const matMul = (A: Mat, B: Mat): Mat => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)))
export const matVec = (A: Mat, v: number[]): number[] => A.map((r) => r.reduce((s, x, k) => s + x * v[k], 0))

export interface Gen { A: Mat; eigs: number[]; vecs: number[][] }
/** A = P D P⁻¹ with P a product of integer row-additions, so A has integer entries and eigenvalues D. */
export function genIntEig(n: number, rng: Rng, o: { lo?: number; hi?: number; maxEntry?: number; distinct?: boolean } = {}): Gen {
  const lo = o.lo ?? -3, hi = o.hi ?? 5, maxEntry = o.maxEntry ?? 9
  for (let attempt = 0; attempt < 500; attempt++) {
    let eigs: number[] = []
    while (eigs.length < n) { const e = ri(rng, lo, hi); if (o.distinct === false || !eigs.includes(e)) eigs.push(e) }
    eigs = eigs.sort((a, b) => b - a)
    let P = identity(n), Pinv = identity(n)
    const k = n === 2 ? ri(rng, 1, 2) : ri(rng, 2, 4)
    for (let t = 0; t < k; t++) {
      const i = ri(rng, 0, n - 1)
      let j = ri(rng, 0, n - 1)
      if (j === i) j = (j + 1) % n
      const c = pick(rng, [-2, -1, 1, 2])
      const E = identity(n); E[i][j] = c
      const Ei = identity(n); Ei[i][j] = -c
      P = matMul(E, P); Pinv = matMul(Pinv, Ei)
    }
    const D = identity(n).map((r, i) => r.map((x) => x * eigs[i]))
    const A = matMul(matMul(P, D), Pinv)
    const big = Math.max(...A.flat().map(Math.abs))
    const offDiag = A.some((r, i) => r.some((x, j) => i !== j && x !== 0))
    if (big <= maxEntry && offDiag) return { A, eigs, vecs: eigs.map((_, c) => P.map((r) => r[c])) }
  }
  // guaranteed-valid fallback
  return { A: [[2, 1], [1, 2]].slice(0, n).map((r) => r.slice(0, n)), eigs: [3, 1], vecs: [[1, 1], [1, -1]] }
}
export const det2 = (A: Mat) => A[0][0] * A[1][1] - A[0][1] * A[1][0]
export const trace = (A: Mat) => A.reduce((s, r, i) => s + r[i], 0)
/** det(A − λI) for any small integer matrix, by cofactor expansion. */
export function detMinusLambda(A: Mat, l: number): number {
  const M = A.map((r, i) => r.map((x, j) => (i === j ? x - l : x)))
  const det = (X: Mat): number => X.length === 1 ? X[0][0] : X[0].reduce((s, x, j) => s + (j % 2 ? -1 : 1) * x * det(X.slice(1).map((r) => r.filter((_, c) => c !== j))), 0)
  return det(M)
}
export const todaySeed = (d: string) => hashStr('eigenquest-' + d)
