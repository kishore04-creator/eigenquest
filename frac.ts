// Exact rational arithmetic on BigInt, so every algebraic step is computed without rounding.
export const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}
export const lcm = (a: bigint, b: bigint): bigint => (a === 0n || b === 0n ? 0n : (a / gcd(a, b)) * b) 
export const babs = (a: bigint) => (a < 0n ? -a : a)

export class Frac {
  readonly n: bigint
  readonly d: bigint
  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new Error('Division by zero')
    if (d < 0n) { n = -n; d = -d }
    const g = gcd(n, d) || 1n
    this.n = n / g
    this.d = d / g
  }
  static of(x: number | bigint): Frac {
    if (typeof x === 'bigint') return new Frac(x)
    if (!Number.isInteger(x)) throw new Error('Frac.of needs an integer')
    return new Frac(BigInt(x))
  }
  static readonly ZERO = new Frac(0n)
  static readonly ONE = new Frac(1n)
  add(o: Frac) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d) }
  sub(o: Frac) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d) }
  mul(o: Frac) { return new Frac(this.n * o.n, this.d * o.d) }
  div(o: Frac) { return new Frac(this.n * o.d, this.d * o.n) }
  neg() { return new Frac(-this.n, this.d) }
  abs() { return new Frac(babs(this.n), this.d) }
  isZero() { return this.n === 0n }
  isOne() { return this.n === 1n && this.d === 1n }
  isInt() { return this.d === 1n }
  eq(o: Frac) { return this.n === o.n && this.d === o.d }
  sign() { return this.n === 0n ? 0 : this.n < 0n ? -1 : 1 }
  cmp(o: Frac) { const x = this.n * o.d - o.n * this.d; return x === 0n ? 0 : x < 0n ? -1 : 1 }
  pow(k: number): Frac {
    let r = Frac.ONE
    for (let i = 0; i < k; i++) r = r.mul(this)
    return r
  }
  toNumber(): number {
    const a = Number(this.n), b = Number(this.d)
    if (Number.isFinite(a) && Number.isFinite(b)) return a / b
    // very large parts: shift both down
    const shift = BigInt(Math.max(this.n.toString(2).length, this.d.toString(2).length) - 1000)
    return Number(this.n >> shift) / Number(this.d >> shift)
  }
  toString() { return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}` }
}
