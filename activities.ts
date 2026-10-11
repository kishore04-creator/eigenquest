// Round generators for the practice activities. Every answer key is computed, never hard-coded,
// and multiple-choice options are validated so exactly one is correct.
import { Rng, Mat, genIntEig, pick, shuffle, ri, matVec, detMinusLambda, trace, hashStr, mulberry32 } from './gen'
import { charPolyInts } from '../engine'

export interface MCOption { id: string; tex: string; correct: boolean; why: string }
export interface MCRound { prompt: string; matrix: Mat; options: MCOption[]; hints: string[]; explain: string }

const mTex = (A: Mat) => `\\begin{bmatrix}${A.map((r) => r.join(' & ')).join(' \\\\ ')}\\end{bmatrix}`
export const vTex = (v: number[]) => `\\begin{bmatrix}${v.join(' \\\\ ')}\\end{bmatrix}`
export const matTex = mTex
const inline = (s: string) => `$${s}$`

export function makeA(rng: Rng): MCRound {
  const n = rng() < 0.7 ? 2 : 3
  const g = genIntEig(n, rng, { lo: -4, hi: 6, maxEntry: 9 })
  const correct = pick(rng, g.eigs)
  const tr = trace(g.A)
  const isEig = (x: number) => detMinusLambda(g.A, x) === 0
  const cand = [tr, -correct, correct + 1, correct - 1, g.A[0][0], g.A[1][1], tr - correct, correct * 2, g.eigs.reduce((a, b) => a * b, 1)]
  let wrong = [...new Set(cand)].filter((x) => !isEig(x) && Math.abs(x) <= 14)
  while (wrong.length < 3) { const x = ri(rng, -6, 8); if (!isEig(x) && !wrong.includes(x)) wrong.push(x) }
  wrong = shuffle(rng, wrong).slice(0, 3)
  const why = (x: number) => {
    const d = detMinusLambda(g.A, x)
    return d === 0
      ? `${inline(`\\det(A-${x < 0 ? `(${x})` : x}I)=0`)}, so ${inline(`\\lambda=${x}`)} is an eigenvalue.`
      : `${inline(`\\det(A-${x < 0 ? `(${x})` : x}I)=${d}`)}, which is not 0, so ${inline(`\\lambda=${x}`)} is not an eigenvalue.`
  }
  const options = shuffle(rng, [correct, ...wrong]).map((x, i) => ({ id: String(i), tex: `\\lambda=${x}`, correct: x === correct, why: why(x) }))
  return {
    prompt: 'Which of these numbers is an eigenvalue of the matrix?', matrix: g.A, options,
    hints: [
      'A number λ is an eigenvalue exactly when $\\det(A-\\lambda I)=0$. Subtract the number from each diagonal entry and test the determinant.',
      `The eigenvalues must add up to the trace, which is $${tr}$ here.`,
      `One wrong choice: ${wrong[0]} gives $\\det(A-\\lambda I)=${detMinusLambda(g.A, wrong[0])}\\neq0$.`,
    ],
    explain: `The eigenvalues of this matrix are ${g.eigs.map((e) => `$${e}$`).join(', ')}. ${why(correct)}`,
  }
}

function vecOptions(rng: Rng, A: Mat, lam: number, trueVec: number[], others: number[][]): { options: MCOption[]; wrongSample: number[] } {
  const isEigVec = (v: number[]) => v.some((x) => x !== 0) && matVec(A, v).every((x, i) => x === lam * v[i])
  const k = pick(rng, [1, 1, -1, 2])
  const correct = trueVec.map((x) => x * k)
  const n = trueVec.length
  const cands: number[][] = []
  others.forEach((o) => cands.push(o))
  cands.push([...trueVec].reverse())
  cands.push(trueVec.map((x, i) => (i === 0 ? -x : x)))
  cands.push(trueVec.map((x, i) => (i === n - 1 ? x + 1 : x)))
  for (let t = 0; t < 12; t++) cands.push(Array.from({ length: n }, () => ri(rng, -2, 3)))
  const seen = new Set<string>([correct.join(',')])
  const wrong: number[][] = []
  for (const c of cands) {
    const key = c.join(',')
    if (seen.has(key) || !c.some((x) => x !== 0) || isEigVec(c)) continue
    seen.add(key); wrong.push(c)
    if (wrong.length === 3) break
  }
  const why = (v: number[]) => {
    const av = matVec(A, v), lv = v.map((x) => x * lam)
    return isEigVec(v)
      ? `${inline(`A\\mathbf v=${vTex(av)}`)} and ${inline(`${lam < 0 ? `(${lam})` : lam}\\mathbf v=${vTex(lv)}`)} are equal, so this is an eigenvector.`
      : `${inline(`A\\mathbf v=${vTex(av)}`)} but ${inline(`${lam < 0 ? `(${lam})` : lam}\\mathbf v=${vTex(lv)}`)}. They differ, so this is not an eigenvector for ${inline(`\\lambda=${lam}`)}.`
  }
  const options = shuffle(rng, [correct, ...wrong]).map((v, i) => ({ id: String(i), tex: vTex(v), correct: v === correct, why: why(v) }))
  return { options, wrongSample: wrong[0] }
}

export function makeB(rng: Rng): MCRound {
  const n = rng() < 0.65 ? 2 : 3
  const g = genIntEig(n, rng, { lo: -3, hi: 5, maxEntry: 8 })
  const i = ri(rng, 0, n - 1)
  const lam = g.eigs[i]
  const others = g.vecs.filter((_, j) => j !== i)
  const { options, wrongSample } = vecOptions(rng, g.A, lam, g.vecs[i], others)
  return {
    prompt: `The number $\\lambda=${lam}$ is an eigenvalue of $A$. Which vector is an eigenvector for it?`, matrix: g.A, options,
    hints: [
      'A vector $\\mathbf v$ is an eigenvector for $\\lambda$ when $A\\mathbf v=\\lambda\\mathbf v$. Multiply each choice by $A$ and compare with $\\lambda\\mathbf v$.',
      `Equivalently, $(A-${lam < 0 ? `(${lam})` : lam}I)\\mathbf v$ must be the zero vector.`,
      `One wrong choice is $${vTex(wrongSample)}$: $A\\mathbf v=${vTex(matVec(g.A, wrongSample))}$ is not $${lam}\\mathbf v$.`,
    ],
    explain: `Row-reducing $A-${lam < 0 ? `(${lam})` : lam}I$ gives eigenvectors that are multiples of $${vTex(g.vecs[i])}$.`,
  }
}

// ---- Activity C: fill the missing step ------------------------------------------------
export interface Blank { id: string; label: string; answer: number | [number, number] }   // [p,q] means p/q
export interface FillRound { prompt: string; matrix: Mat; exprTex: string; blanks: Blank[]; hints: string[]; explain: string }
const frac = (p: number, q: number): [number, number] => (q < 0 ? [-p, -q] : [p, q])

export function makeC(rng: Rng): FillRound {
  const variant = ri(rng, 0, 2)
  if (variant === 0) {
    const g = genIntEig(2, rng, { lo: -3, hi: 5, maxEntry: 8 })
    const [[a, b], [c, d]] = g.A
    const paren = (x: number) => (x < 0 ? `(${x})` : String(x))
    return {
      prompt: 'Complete the characteristic polynomial of this 2×2 matrix.', matrix: g.A,
      exprTex: `\\det(A-\\lambda I)=(${a}-\\lambda)(${d}-\\lambda)-${paren(b)}\\cdot${paren(c)}=\\lambda^{2}-(\\,\\square_1\\,)\\lambda+(\\,\\square_2\\,)`,
      blanks: [{ id: 'tr', label: '□₁', answer: a + d }, { id: 'det', label: '□₂', answer: a * d - b * c }],
      hints: ['Multiply out $(a-\\lambda)(d-\\lambda)=\\lambda^2-(a+d)\\lambda+ad$.', `□₁ is the trace $a+d$. □₂ is $ad-bc=${a}\\cdot${paren(d)}-${paren(b)}\\cdot${paren(c)}$.`],
      explain: `□₁ = ${a} + ${paren(d)} = ${a + d} (the trace) and □₂ = ${a * d} − ${paren(b * c)} = ${a * d - b * c} (the determinant).`,
    }
  }
  if (variant === 1) {
    let g = genIntEig(2, rng, { lo: -3, hi: 5, maxEntry: 8 })
    let i = ri(rng, 0, 1), lam = g.eigs[i], B = g.A.map((r, x) => r.map((v, y) => (x === y ? v - lam : v)))
    let row = B.findIndex((r) => r[0] !== 0)
    for (let t = 0; row < 0 && t < 30; t++) { g = genIntEig(2, rng, { lo: -3, hi: 5, maxEntry: 8 }); i = ri(rng, 0, 1); lam = g.eigs[i]; B = g.A.map((r, x) => r.map((v, y) => (x === y ? v - lam : v))); row = B.findIndex((r) => r[0] !== 0) }
    if (row < 0) row = 0
    const [p, q] = B[row]
    const ans = frac(-q, p)
    return {
      prompt: `For $\\lambda=${lam}$ we row-reduce $A-\\lambda I$. Finish solving the first non-zero equation.`, matrix: g.A,
      exprTex: `A-${lam < 0 ? `(${lam})` : lam}I=${mTex(B)}\\;\\Rightarrow\\;${p}v_1${q < 0 ? '' : '+'}${q}v_2=0\\;\\Rightarrow\\;v_1=(\\,\\square\\,)\\,v_2`,
      blanks: [{ id: 'r', label: '□', answer: ans }],
      hints: ['Move the $v_2$ term to the other side and divide by the coefficient of $v_1$.', `$v_1=-\\dfrac{${q}}{${p}}\\,v_2$.`],
      explain: `${p}v₁ + (${q})v₂ = 0 gives v₁ = −(${q})/(${p}) · v₂ = ${ans[1] === 1 ? ans[0] : `${ans[0]}/${ans[1]}`} · v₂.`,
    }
  }
  const g = genIntEig(3, rng, { lo: -2, hi: 4, maxEntry: 7 })
  const A = g.A
  const tr = trace(A)
  const c1 = (A[0][0] * A[1][1] - A[0][1] * A[1][0]) + (A[0][0] * A[2][2] - A[0][2] * A[2][0]) + (A[1][1] * A[2][2] - A[1][2] * A[2][1])
  const cp = charPolyInts(A)   // low→high of det(λI−A)
  return {
    prompt: 'This 3×3 matrix has monic characteristic polynomial $\\det(\\lambda I-A)=\\lambda^3-t\\lambda^2+s\\lambda-d$. Fill in the trace and the determinant.', matrix: A,
    exprTex: `\\lambda^{3}-(\\,\\square_1\\,)\\lambda^{2}+${c1 < 0 ? `(${c1})` : c1}\\lambda-(\\,\\square_2\\,)=0`,
    blanks: [{ id: 'tr', label: '□₁', answer: tr }, { id: 'det', label: '□₂', answer: -cp[0] }],
    hints: ['The coefficient of $\\lambda^2$ is minus the trace: add the diagonal entries.', 'The constant term is $-\\det(A)$, so □₂ is the determinant of $A$.'],
    explain: `□₁ = ${A.map((r, i) => (r[i] < 0 ? `(${r[i]})` : r[i])).join(' + ')} = ${tr}, and □₂ = det(A) = ${-cp[0]}.`,
  }
}

// ---- Detective / Boss / Daily: three connected stages -----------------------------------
export interface Detective {
  n: number; matrix: Mat; eigs: number[]
  coeffs: number[]            // monic char. poly, highest-degree coefficient excluded: [c_{n-1}, ..., c_0]
  vecRound: MCRound           // eigenvector for the largest eigenvalue
  trace: number; det: number
}
export function makeDetective(rng: Rng, n: number): Detective {
  const g = genIntEig(n, rng, n === 2 ? { lo: -3, hi: 5, maxEntry: 8 } : { lo: -2, hi: 4, maxEntry: 8 })
  const cp = charPolyInts(g.A)           // low→high, monic
  const coeffs = cp.slice(0, n).reverse()
  const lam = g.eigs[0]                  // genIntEig sorts descending
  const others = g.vecs.slice(1)
  const { options, wrongSample } = vecOptions(rng, g.A, lam, g.vecs[0], others)
  const vecRound: MCRound = {
    prompt: `Finally, which vector is an eigenvector for the largest eigenvalue, $\\lambda=${lam}$?`, matrix: g.A, options,
    hints: ['Check $A\\mathbf v=\\lambda\\mathbf v$ for each choice.', `$(A-${lam < 0 ? `(${lam})` : lam}I)\\mathbf v$ must be the zero vector. One wrong choice is $${vTex(wrongSample)}$.`],
    explain: `Row-reducing $A-${lam < 0 ? `(${lam})` : lam}I$ gives multiples of $${vTex(g.vecs[0])}$.`,
  }
  return { n, matrix: g.A, eigs: g.eigs, coeffs, vecRound, trace: trace(g.A), det: (n % 2 ? -1 : 1) * cp[0] }
}
export const dailyDetective = (date: string) => { const seed = hashStr('eigenquest-' + date); return makeDetective(mulberry32(seed), seed % 3 === 0 ? 3 : 2) }
