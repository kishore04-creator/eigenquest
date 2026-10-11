import type { Cx } from './complex'

/** A display block in the step-by-step solution. The UI renders these; the engine only produces data. */
export type Block =
  | { t: 'p'; text: string }               // paragraph; $...$ marks inline math
  | { t: 'h'; text: string }               // sub-heading; $...$ allowed
  | { t: 'math'; tex: string }             // display equation
  | { t: 'note'; tone: 'info' | 'warn' | 'good' | 'tip'; text: string }
  | { t: 'result'; ok: boolean; text: string }
  | { t: 'list'; items: string[] }

export interface Stage { id: number; title: string; blurb: string; blocks: Block[] }

export interface Check { label: string; ok: boolean; detail?: string; skipped?: boolean }

export interface EigenvectorOut {
  tex: string[]            // entries of the displayed eigenvector
  approx: Cx[]
  verified: boolean
}
export interface EigenvalueOut {
  tex: string              // LaTeX of the eigenvalue
  approx: Cx
  algMult: number
  geoMult: number
  defective: boolean
  exact: boolean
  isComplex: boolean
  vectors: EigenvectorOut[]
}

export interface SolveResult {
  n: number
  matrixTex: string
  charPolyTex: string       // det(A - λI) expanded
  charEqTex: string         // monic form = 0
  eigenvalues: EigenvalueOut[]
  stages: Stage[]
  checks: Check[]
  warnings: string[]
  allVerified: boolean
  exact: boolean
  key: string               // canonical matrix key for progress tracking
  trace: number
  det: number
}

export interface CellError { r: number; c: number; msg: string }
export type SolveOutcome =
  | { ok: true; result: SolveResult }
  | { ok: false; message: string; cellErrors: CellError[] }
