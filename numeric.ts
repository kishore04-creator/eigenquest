// Floating-point helpers: Durand–Kerner polynomial roots with Newton polishing, rational reconstruction.
import { Cx, cx, cadd, csub, cmul, cdiv, cabs } from './complex'
import { Frac } from './frac'

/** Evaluate polynomial (index = power) at complex z. */
export const cpEval = (c: number[], z: Cx): Cx => c.reduceRight((acc, a) => cadd(cmul(acc, z), cx(a)), cx(0))
const cpDeriv = (c: number[]) => c.slice(1).map((a, i) => a * (i + 1))

/** All roots of a monic real polynomial (low→high coefficients). */
export function polyRoots(coeffs: number[]): Cx[] {
  const n = coeffs.length - 1
  if (n < 1) return []
  const lead = coeffs[n]
  const c = coeffs.map((x) => x / lead)
  const R = 1 + Math.max(...c.slice(0, n).map(Math.abs))
  let z: Cx[] = Array.from({ length: n }, (_, k) => {
    const ang = (2 * Math.PI * k) / n + 0.4
    const r = R * 0.6 + 0.1
    return cx(r * Math.cos(ang), r * Math.sin(ang))
  })
  for (let it = 0; it < 2000; it++) {
    let maxd = 0
    const nz = z.slice()
    for (let i = 0; i < n; i++) {
      let den = cx(1)
      for (let j = 0; j < n; j++) if (j !== i) den = cmul(den, csub(nz[i], nz[j]))
      if (cabs(den) < 1e-300) den = cx(1e-300)
      const d = cdiv(cpEval(c, nz[i]), den)
      nz[i] = csub(nz[i], d)
      maxd = Math.max(maxd, cabs(d))
    }
    z = nz
    if (maxd < 1e-15 * (1 + R)) break
  }
  // Newton polish: accept a step only when the residual shrinks
  const dc = cpDeriv(c)
  z = z.map((r) => {
    let cur = r
    for (let k = 0; k < 6; k++) {
      const d = cpEval(dc, cur)
      if (cabs(d) < 1e-12) break
      const nxt = csub(cur, cdiv(cpEval(c, cur), d))
      if (cabs(cpEval(c, nxt)) < cabs(cpEval(c, cur))) cur = nxt
      else break
    }
    return cur
  })
  // Real polynomial: clean tiny imaginary parts and enforce conjugate pairs
  const scale = 1 + Math.max(...z.map(cabs))
  z = z.map((r) => (Math.abs(r.im) < 1e-9 * scale ? cx(r.re, 0) : r))
  const pos = z.filter((r) => r.im > 0), neg = z.filter((r) => r.im < 0)
  const used = new Set<number>()
  const out: Cx[] = z.filter((r) => r.im === 0)
  for (const p of pos) {
    let best = -1, bd = Infinity
    neg.forEach((q, i) => { if (!used.has(i)) { const d = cabs(csub(p, cx(q.re, -q.im))); if (d < bd) { bd = d; best = i } } })
    if (best >= 0) {
      used.add(best)
      const q = neg[best]
      const re = (p.re + q.re) / 2, im = (p.im - q.im) / 2
      out.push(cx(re, im), cx(re, -im))
    } else out.push(p)
  }
  neg.forEach((q, i) => { if (!used.has(i) && !pos.length) out.push(q) })
  return out
}

/** Best rational approximation with bounded denominator (continued fractions); null if not close. */
export function ratApprox(x: number, maxDen = 5000): Frac | null {
  if (!Number.isFinite(x)) return null
  const sign = x < 0 ? -1 : 1
  let v = Math.abs(x)
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1
  let b = v
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b)
    const h2 = a * h1 + h0, k2 = a * k1 + k0
    if (k2 > maxDen) break
    h0 = h1; h1 = h2; k0 = k1; k1 = k2
    if (Math.abs(v - h1 / k1) < 1e-10 * (1 + v)) break
    const frac = b - a
    if (frac < 1e-14) break
    b = 1 / frac
  }
  if (k1 === 0 || Math.abs(v - h1 / k1) > 1e-8 * (1 + v)) return null
  return new Frac(BigInt(sign * h1), BigInt(k1))
}
