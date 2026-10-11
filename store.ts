// Local progress store: a tiny external store persisted in browser storage (no backend, no login).
import { useSyncExternalStore } from 'react'
import { Progress, emptyProgress, BADGES, levelInfo, ActivityId } from './gamify'
import { toast } from './events'

const KEY = 'eigenquest.progress.v1'

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      const base = emptyProgress()
      return { ...base, ...d, activity: { ...base.activity, ...d.activity }, stats: { ...base.stats, ...d.stats }, daily: { ...base.daily, ...d.daily } }
    }
  } catch { /* storage unavailable: start fresh */ }
  return emptyProgress()
}
function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

let state: Progress = load()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getProgress = () => state
export const useProgress = () => useSyncExternalStore(subscribe, getProgress)

function commit(next: Progress) {
  const before = levelInfo(state.xp).index
  state = next
  // badges
  const fresh = BADGES.filter((b) => !state.badges.includes(b.id) && b.test(state))
  if (fresh.length) {
    state = { ...state, badges: [...state.badges, ...fresh.map((b) => b.id)] }
    fresh.forEach((b) => toast({ kind: 'badge', id: b.id, name: b.name, desc: b.desc, glyph: b.glyph }))
  }
  const after = levelInfo(state.xp)
  if (after.index > before) { toast({ kind: 'level', name: after.cur.name }); celebrate() }
  save(state)
  listeners.forEach((l) => l())
}

let celebrateFn: (() => void) | null = null
export const setCelebrate = (f: () => void) => { celebrateFn = f }
export const celebrate = () => celebrateFn?.()

export const actions = {
  /** Add XP (can be called with a one-time id so it only pays once). Returns true if awarded. */
  award(xp: number, reason: string, onceId?: string): boolean {
    if (xp <= 0) return false
    if (onceId && state.awarded.includes(onceId)) return false
    commit({ ...state, xp: state.xp + xp, awarded: onceId ? [...state.awarded, onceId].slice(-600) : state.awarded })
    toast({ kind: 'xp', amount: xp, reason })
    return true
  },
  addStars(n: number) { if (n > 0) commit({ ...state, stars: state.stars + n }) },
  useHint() { commit({ ...state, hintsUsed: state.hintsUsed + 1 }) },
  /** Record an answered question: updates streak and per-activity stats. */
  answer(correct: boolean, activity: ActivityId, usedHints: boolean) {
    const streak = correct ? state.streak + 1 : 0
    const a = state.activity[activity]
    commit({
      ...state, streak, bestStreak: Math.max(state.bestStreak, streak),
      noHintCorrect: state.noHintCorrect + (correct && !usedHints ? 1 : 0),
      activity: { ...state.activity, [activity]: { rounds: a.rounds + 1, correct: a.correct + (correct ? 1 : 0), best: Math.max(a.best, streak) } },
    })
  },
  breakStreak() { if (state.streak) commit({ ...state, streak: 0 }) },
  markSolved(key: string, info: { n: number; complex: boolean; defective: boolean; sample: boolean }) {
    const s = state.stats
    commit({
      ...state, solved: state.solved.includes(key) ? state.solved : [...state.solved, key].slice(-400),
      stats: {
        ...s, maxN: Math.max(s.maxN, info.n),
        complexSolved: s.complexSolved + (info.complex ? 1 : 0), defectiveSolved: s.defectiveSolved + (info.defective ? 1 : 0),
        bigSolved: s.bigSolved + (info.n >= 4 ? 1 : 0), sampleSolved: s.sampleSolved + (info.sample ? 1 : 0),
      },
    })
  },
  markVerified() { commit({ ...state, stats: { ...state.stats, verified: state.stats.verified + 1 } }) },
  completeLesson(id: string) { if (!state.lessons.includes(id)) commit({ ...state, lessons: [...state.lessons, id] }) },
  bossWin(timed: boolean) { commit({ ...state, stats: { ...state.stats, bossWins: state.stats.bossWins + 1, bossTimedWins: state.stats.bossTimedWins + (timed ? 1 : 0) } }) },
  completeDaily(date: string) {
    const d = state.daily
    if (d.lastDone === date) return false
    const y = new Date(date + 'T00:00:00'); y.setDate(y.getDate() - 1)
    const yest = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    const streak = d.lastDone === yest ? d.streak + 1 : 1
    commit({ ...state, daily: { lastDone: date, streak, best: Math.max(d.best, streak) } })
    return true
  },
  resetActivity(id: ActivityId) { commit({ ...state, activity: { ...state.activity, [id]: { rounds: 0, correct: 0, best: 0 } } }) },
  resetAll() { commit(emptyProgress()); state = { ...state, badges: [] }; save(state); listeners.forEach((l) => l()) },
}
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
