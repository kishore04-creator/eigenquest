// Tiny complex-number helpers for the floating-point (approximate) code paths.
export interface Cx { re: number; im: number }
export const cx = (re: number, im = 0): Cx => ({ re, im })
export const cadd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im })
export const csub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im })
export const cmul = (a: Cx, b: Cx): Cx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
export const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
export const cabs = (a: Cx) => Math.hypot(a.re, a.im)
export const cneg = (a: Cx): Cx => ({ re: -a.re, im: -a.im })
export const cconj = (a: Cx): Cx => ({ re: a.re, im: -a.im })
