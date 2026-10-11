// Polynomials with exact rational coefficients. Index i holds the coefficient of x^i.
import { Frac, lcm } from './frac'
export type Poly = Frac[]

export const trim = (p: Poly): Poly => {
  const q = p.slice()
  while (q.length > 1 && q[q.length - 1].isZero()) q.pop()
  return q.length ? q : [Frac.ZERO]
}
export const deg = (p: Poly) => { const t = trim(p); return t.length === 1 && t[0].isZero() ? -1 : t.length - 1 }
export const padd = (a: Poly, b: Poly): Poly => {
  const r: Poly = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) r.push((a[i] ?? Frac.ZERO).add(b[i] ?? Frac.ZERO))
  return trim(r)
}
export const pneg = (a: Poly): Poly => a.map((c) => c.neg())
export const psub = (a: Poly, b: Poly): Poly => padd(a, pneg(b))
export const pmul = (a: Poly, b: Poly): Poly => {
  const r: Poly = Array(a.length + b.length - 1).fill(Frac.ZERO)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] = r[i + j].add(a[i].mul(b[j]))
  return trim(r)
}
export const pscale = (a: Poly, k: Frac): Poly => trim(a.map((c) => c.mul(k)))
export const peval = (p: Poly, x: Frac): Frac => p.reduceRight((acc, c) => acc.mul(x).add(c), Frac.ZERO)
export const pconst = (c: Frac): Poly => [c]

/** Long division a = q*d + r (exact). */
export function pdivmod(a: Poly, d: Poly): { q: Poly; r: Poly } {
  const dd = trim(d)
  const dn = dd.length - 1
  let r = trim(a)
  const q: Poly = Array(Math.max(r.length - dn, 1)).fill(Frac.ZERO)
  while (deg(r) >= dn && deg(r) >= 0) {
    const shift = r.length - 1 - dn
    const f = r[r.length - 1].div(dd[dn])
    q[shift] = f
    const sub: Poly = Array(shift).fill(Frac.ZERO).concat(dd.map((c) => c.mul(f)))
    r = trim(psub(r, sub))
    if (r.length === 1 && r[0].isZero()) break
  }
  return { q: trim(q), r }
}

/** Monic divide by (x - root). */
export const divLinear = (p: Poly, root: Frac) => pdivmod(p, [root.neg(), Frac.ONE])

/** Clear denominators: returns integer coefficients (bigint) and the multiplier used. */
export function intCoeffs(p: Poly): { ints: bigint[]; mult: bigint } {
  let L = 1n
  for (const c of p) L = lcm(L, c.d)
  return { ints: p.map((c) => c.n * (L / c.d)), mult: L }
}
