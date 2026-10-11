// Number fields used for row reduction: Q (exact rationals), Q(sqrt m) (exact quadratic irrationals,
// including complex ones when m < 0) and C with a tolerance (approximate fallback).
import { Frac, lcm } from './frac'
import { Cx, cx, cadd, csub, cmul, cdiv, cabs, cneg } from './complex'
import { fracTex, fmtFloat, cxTex } from './tex'

export interface Field<T> {
  name: 'Q' | 'QF' | 'N'
  zero: T
  one: T
  add(a: T, b: T): T
  sub(a: T, b: T): T
  mul(a: T, b: T): T
  div(a: T, b: T): T
  neg(a: T): T
  isZero(a: T): boolean
  eq(a: T, b: T): boolean
  fromFrac(f: Frac): T
  tex(a: T): string
  approx(a: T): Cx
  abs(a: T): number
}

export const FracField: Field<Frac> = {
  name: 'Q',
  zero: Frac.ZERO,
  one: Frac.ONE,
  add: (a, b) => a.add(b),
  sub: (a, b) => a.sub(b),
  mul: (a, b) => a.mul(b),
  div: (a, b) => a.div(b),
  neg: (a) => a.neg(),
  isZero: (a) => a.isZero(),
  eq: (a, b) => a.eq(b),
  fromFrac: (f) => f,
  tex: fracTex,
  approx: (a) => cx(a.toNumber(), 0),
  abs: (a) => Math.abs(a.toNumber()),
}

/** Element a + b*sqrt(m) of Q(sqrt m). */
export interface QF { a: Frac; b: Frac }

export function quadField(m: bigint): Field<QF> {
  const mF = new Frac(m)
  const sq = (x: QF): string =>
    m > 0n ? `\\sqrt{${m}}` : m === -1n ? 'i' : `\\sqrt{${-m}}\\,i`
  const mk = (a: Frac, b: Frac): QF => ({ a, b })
  return {
    name: 'QF',
    zero: mk(Frac.ZERO, Frac.ZERO),
    one: mk(Frac.ONE, Frac.ZERO),
    add: (x, y) => mk(x.a.add(y.a), x.b.add(y.b)),
    sub: (x, y) => mk(x.a.sub(y.a), x.b.sub(y.b)),
    mul: (x, y) => mk(x.a.mul(y.a).add(x.b.mul(y.b).mul(mF)), x.a.mul(y.b).add(x.b.mul(y.a))),
    div: (x, y) => {
      const norm = y.a.mul(y.a).sub(y.b.mul(y.b).mul(mF))
      const num = mk(x.a.mul(y.a).sub(x.b.mul(y.b).mul(mF)), x.b.mul(y.a).sub(x.a.mul(y.b)))
      return mk(num.a.div(norm), num.b.div(norm))
    },
    neg: (x) => mk(x.a.neg(), x.b.neg()),
    isZero: (x) => x.a.isZero() && x.b.isZero(),
    eq: (x, y) => x.a.eq(y.a) && x.b.eq(y.b),
    fromFrac: (f) => mk(f, Frac.ZERO),
    tex: (x) => {
      if (x.b.isZero()) return fracTex(x.a)
      const den = lcm(x.a.d, x.b.d)
      const na = x.a.n * (den / x.a.d)
      const nb = x.b.n * (den / x.b.d)
      let num = ''
      if (na !== 0n) num += na.toString()
      const nbAbs = nb < 0n ? -nb : nb
      const bTex = (nbAbs === 1n ? '' : nbAbs.toString()) + sq(x)
      if (num === '') num = (nb < 0n ? '-' : '') + bTex
      else num += (nb < 0n ? ' - ' : ' + ') + bTex
      return den === 1n ? num : `\\frac{${num}}{${den}}`
    },
    approx: (x) => {
      const s = Math.sqrt(Math.abs(Number(m)))
      return m > 0n ? cx(x.a.toNumber() + x.b.toNumber() * s, 0) : cx(x.a.toNumber(), x.b.toNumber() * s)
    },
    abs: (x) => {
      const s = Math.sqrt(Math.abs(Number(m)))
      return m > 0n ? Math.abs(x.a.toNumber() + x.b.toNumber() * s) : Math.hypot(x.a.toNumber(), x.b.toNumber() * s)
    },
  }
}

/** Approximate complex field; values closer to zero than tol count as zero. */
export function cxField(tol: number): Field<Cx> {
  return {
    name: 'N',
    zero: cx(0),
    one: cx(1),
    add: cadd,
    sub: csub,
    mul: cmul,
    div: cdiv,
    neg: cneg,
    isZero: (a) => cabs(a) <= tol,
    eq: (a, b) => cabs(csub(a, b)) <= tol,
    fromFrac: (f) => cx(f.toNumber()),
    tex: (a) => cxTex(a.re, a.im),
    approx: (a) => a,
    abs: cabs,
  }
}
export { fmtFloat }
