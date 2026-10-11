// Levels, badges and XP rules.
export interface Level { name: string; min: number; blurb: string }
export const LEVELS: Level[] = [
  { name: 'Beginner', min: 0, blurb: 'Learn what matrices and determinants do' },
  { name: 'Matrix Explorer', min: 200, blurb: 'Solve 2×2 and 3×3 matrices with confidence' },
  { name: 'Eigenvalue Master', min: 600, blurb: 'Handle repeated and complex eigenvalues' },
  { name: 'Matrix Legend', min: 1200, blurb: 'Defeat bosses and big matrices' },
]
export function levelInfo(xp: number) {
  let i = 0
  LEVELS.forEach((l, k) => { if (xp >= l.min) i = k })
  const cur = LEVELS[i], next = LEVELS[i + 1]
  const pct = next ? Math.min(100, ((xp - cur.min) / (next.min - cur.min)) * 100) : 100
  return { index: i, cur, next, pct, toNext: next ? next.min - xp : 0 }
}

export type ActivityId = 'A' | 'B' | 'C' | 'D' | 'E' | 'daily'
export interface ActStat { rounds: number; correct: number; best: number }

export interface Progress {
  xp: number
  stars: number
  streak: number
  bestStreak: number
  hintsUsed: number
  solved: string[]                 // matrix keys that already paid out solver XP
  awarded: string[]                // one-time XP ids, e.g. "step:KEY:3"
  badges: string[]
  lessons: string[]                // completed lesson ids
  activity: Record<ActivityId, ActStat>
  noHintCorrect: number
  stats: { complexSolved: number; defectiveSolved: number; bigSolved: number; sampleSolved: number; verified: number; bossWins: number; bossTimedWins: number; maxN: number }
  daily: { lastDone: string; streak: number; best: number }
}
export const emptyProgress = (): Progress => ({
  xp: 0, stars: 0, streak: 0, bestStreak: 0, hintsUsed: 0, solved: [], awarded: [], badges: [], lessons: [],
  activity: { A: { rounds: 0, correct: 0, best: 0 }, B: { rounds: 0, correct: 0, best: 0 }, C: { rounds: 0, correct: 0, best: 0 }, D: { rounds: 0, correct: 0, best: 0 }, E: { rounds: 0, correct: 0, best: 0 }, daily: { rounds: 0, correct: 0, best: 0 } },
  noHintCorrect: 0,
  stats: { complexSolved: 0, defectiveSolved: 0, bigSolved: 0, sampleSolved: 0, verified: 0, bossWins: 0, bossTimedWins: 0, maxN: 0 },
  daily: { lastDone: '', streak: 0, best: 0 },
})

export interface Badge { id: string; name: string; desc: string; glyph: string; test: (p: Progress) => boolean }
export const LESSON_COUNT = 10
export const BADGES: Badge[] = [
  { id: 'first-solve', name: 'First Eigenvalue', desc: 'Solve your first matrix', glyph: 'λ', test: (p) => p.solved.length >= 1 },
  { id: 'textbook', name: 'Textbook Start', desc: 'Solve the sample matrix [[2,1],[1,2]]', glyph: '①', test: (p) => p.stats.sampleSolved >= 1 },
  { id: 'verify', name: 'Trust but Verify', desc: 'Complete a verification step with Av = λv', glyph: '✓', test: (p) => p.stats.verified >= 1 },
  { id: 'complex', name: 'Imaginary Friend', desc: 'Solve a matrix with complex eigenvalues', glyph: 'i', test: (p) => p.stats.complexSolved >= 1 },
  { id: 'defective', name: 'Defective Detective', desc: 'Solve a defective matrix', glyph: '⚠', test: (p) => p.stats.defectiveSolved >= 1 },
  { id: 'big', name: 'Big Matrix Energy', desc: 'Solve a 4×4 or 5×5 matrix', glyph: '5', test: (p) => p.stats.bigSolved >= 1 },
  { id: 'scholar', name: 'Scholar', desc: 'Finish all ten lessons', glyph: 'Σ', test: (p) => p.lessons.length >= LESSON_COUNT },
  { id: 'streak3', name: 'On a Roll', desc: 'Answer 3 in a row correctly', glyph: '3', test: (p) => p.bestStreak >= 3 },
  { id: 'streak10', name: 'Unstoppable', desc: 'Answer 10 in a row correctly', glyph: '∞', test: (p) => p.bestStreak >= 10 },
  { id: 'spotter', name: 'Eigenvalue Spotter', desc: 'Win Activity A', glyph: 'A', test: (p) => p.activity.A.correct >= 1 },
  { id: 'matcher', name: 'Vector Matcher', desc: 'Win Activity B', glyph: 'B', test: (p) => p.activity.B.correct >= 1 },
  { id: 'filler', name: 'Step Filler', desc: 'Win Activity C', glyph: 'C', test: (p) => p.activity.C.correct >= 1 },
  { id: 'detective', name: 'Matrix Detective', desc: 'Win Activity D', glyph: 'D', test: (p) => p.activity.D.correct >= 1 },
  { id: 'boss', name: 'Boss Slayer', desc: 'Defeat the Eigenvalue Boss', glyph: 'E', test: (p) => p.stats.bossWins >= 1 },
  { id: 'clock', name: 'Beat the Clock', desc: 'Defeat the Boss on a timer', glyph: '⏱', test: (p) => p.stats.bossTimedWins >= 1 },
  { id: 'daily', name: 'Daily Habit', desc: 'Finish a Daily Challenge', glyph: '☀', test: (p) => p.activity.daily.correct >= 1 },
  { id: 'daily3', name: 'Three-Day Run', desc: 'Finish the Daily Challenge 3 days in a row', glyph: '⚡', test: (p) => p.daily.best >= 3 },
  { id: 'selfreliant', name: 'Self-Reliant', desc: 'Get 5 right without hints', glyph: '★', test: (p) => p.noHintCorrect >= 5 },
  { id: 'explorer', name: 'Matrix Explorer', desc: 'Reach level 2', glyph: '◆', test: (p) => p.xp >= LEVELS[1].min },
  { id: 'legend', name: 'Matrix Legend', desc: 'Reach the top level', glyph: 'Ω', test: (p) => p.xp >= LEVELS[3].min },
]
