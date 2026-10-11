// Turns what a student typed into an exact rational, or explains what is wrong.
import { Frac } from './frac'

const DEC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

function parseDecimal(s: string): Frac | null {
  if (!DEC.test(s)) return null
  const m = s.match(/^([+-]?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/)
  if (!m) return null
  const sign = m[1] === '-' ? -1n : 1n
  const intPart = m[2] || '0'
  const frac = m[3] || ''
  const exp = m[4] ? parseInt(m[4], 10) : 0
  if (Math.abs(exp) > 9 || frac.length > 9) return null
  let num = BigInt(intPart + frac) * sign
  let den = 10n ** BigInt(frac.length)
  if (exp > 0) num *= 10n ** BigInt(exp)
  else if (exp < 0) den *= 10n ** BigInt(-exp)
  return new Frac(num, den)
}

export function parseEntry(raw: string): { ok: true; value: Frac } | { ok: false; msg: string } {
  const s = raw.trim().replace(/−/g, '-').replace(/\s+/g, '')
  if (s === '') return { ok: false, msg: 'This cell is empty. Type a number such as 2, -1.5 or 3/4.' }
  let v: Frac | null = null
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 2) {
      const a = parseDecimal(parts[0]), b = parseDecimal(parts[1])
      if (a && b) {
        if (b.isZero()) return { ok: false, msg: 'A fraction cannot have 0 in the denominator.' }
        v = a.div(b)
      }
    }
  } else v = parseDecimal(s)
  if (!v) return { ok: false, msg: `“${raw.trim()}” is not a number. Use integers, decimals or fractions like 2, -1.5 or 3/4.` }
  if (Math.abs(v.toNumber()) > 1e6) return { ok: false, msg: 'This number is too large. Keep entries between -1,000,000 and 1,000,000.' }
  return { ok: true, value: v }
}
