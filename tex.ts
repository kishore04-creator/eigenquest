// LaTeX formatting helpers shared by the engine and the UI.
import { Frac } from './frac'
import type { Poly } from './poly'

export const fracTex = (f: Frac): string => {
  if (f.d === 1n) return f.n.toString()
  return `${f.n < 0n ? '-' : ''}\\frac{${f.n < 0n ? -f.n : f.n}}{${f.d}}`
}
/** Wrap in parentheses when negative or fractional, for use inside products. */
export const fracParen = (f: Frac): string => (f.n < 0n ? `(${fracTex(f)})` : fracTex(f))

export const fmtFloat = (x: number, digits = 4): string => {
  if (!Number.isFinite(x)) return String(x)
  let s = x.toFixed(digits)
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  if (s === '-0' || s === '') s = '0'
  return s
}
export const cxTex = (re: number, im: number, digits = 4): string => {
  const r = fmtFloat(re, digits)
  const i = fmtFloat(Math.abs(im), digits)
  if (i === '0') return r
  const iPart = (i === '1' ? '' : i) + 'i'
  if (r === '0') return (im < 0 ? '-' : '') + iPart
  return `${r} ${im < 0 ? '-' : '+'} ${iPart}`
}

export const bmatrix = (rows: string[][]) =>
  `\\begin{bmatrix}${rows.map((r) => r.join(' & ')).join(' \\\\ ')}\\end{bmatrix}`
export const vmatrix = (rows: string[][]) =>
  `\\begin{vmatrix}${rows.map((r) => r.join(' & ')).join(' \\\\ ')}\\end{vmatrix}`
export const colVec = (items: string[]) => bmatrix(items.map((x) => [x]))

/** Polynomial in descending powers, e.g. \lambda^2 - 4\lambda + 3 */
export function polyTex(p: Poly, v = '\\lambda'): string {
  let out = ''
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i]
    if (c.isZero()) continue
    const neg = c.n < 0n
    const a = c.abs()
    let body: string
    if (i === 0) body = fracTex(a)
    else {
      const coef = a.isOne() ? '' : fracTex(a)
      const vp = i === 1 ? v : `${v}^{${i}}`
      body = coef + vp
    }
    if (out === '') out = (neg ? '-' : '') + body
    else out += (neg ? ' - ' : ' + ') + body
  }
  return out || '0'
}

/** Linear factor (x - r) written nicely: (\lambda - 3), (\lambda + 2), \lambda */
export const linearFactorTex = (r: Frac, v = '\\lambda') =>
  r.isZero() ? v : r.n < 0n ? `(${v} + ${fracTex(r.abs())})` : `(${v} - ${fracTex(r)})`

/** Evaluation of a polynomial at r written out term by term: c_n r^n + ... */
export function evalTex(p: Poly, r: Frac): string {
  const parts: string[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i]
    if (c.isZero()) continue
    const rp = i === 0 ? '' : i === 1 ? fracParen(r) : `${fracParen(r)}^{${i}}`
    const coef = c.abs()
    const t = i === 0 ? fracTex(coef) : (coef.isOne() ? '' : `${fracTex(coef)}\\cdot `) + rp
    parts.push((c.n < 0n ? '-' : '+') + ' ' + t)
  }
  if (!parts.length) return '0'
  let s = parts.join(' ')
  s = s.replace(/^\+ /, '')
  return s.replace(/^- /, '-')
}
