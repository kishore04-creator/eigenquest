import { useState } from 'react'
import { motion } from 'framer-motion'
import { BADGES, LEVELS, LESSON_COUNT, levelInfo } from '../lib/gamify'
import { actions, useProgress } from '../lib/store'
import { Icon, ProgressBar, Stars, Stat } from './ui'

/** Student progress dashboard: level, XP, streaks, per-level bars and (when `full`) every badge. */
export function Dashboard({ full = false }: { full?: boolean }) {
  const p = useProgress()
  const lv = levelInfo(p.xp)
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="glass p-5 sm:p-6 flex flex-col gap-5 min-w-0" aria-label="Student progress dashboard">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid place-items-center w-16 h-16 rounded-2xl text-white display text-3xl font-extrabold shrink-0" style={{ background: 'linear-gradient(135deg,var(--btn-from),var(--btn-to))' }} aria-hidden="true">{lv.index + 1}</div>
        <div className="flex-1 min-w-48">
          <div className="text-sm muted">Level {lv.index + 1} of {LEVELS.length}</div>
          <div className="display text-2xl font-extrabold">{lv.cur.name}</div>
          <ProgressBar pct={lv.pct} label="Progress to next level" className="mt-1" />
          <div className="text-sm muted mt-1">{lv.next ? `${lv.toNext} XP to ${lv.next.name}` : 'Top level reached. Legendary!'}</div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Stat label="Total XP" value={p.xp} />
        <Stat label="Stars" value={<span className="inline-flex items-center gap-1">{p.stars}<Stars n={Math.min(3, p.stars)} /></span>} />
        <Stat label="Answer streak" value={<span className="inline-flex items-center gap-1"><Icon name="flame" size={20} />{p.streak}</span>} sub={`best ${p.bestStreak}`} />
        <Stat label="Daily streak" value={p.daily.streak} sub={`best ${p.daily.best}`} />
        <Stat label="Matrices solved" value={p.solved.length} />
        <Stat label="Lessons" value={`${p.lessons.length}/${LESSON_COUNT}`} />
        <Stat label="Badges" value={`${p.badges.length}/${BADGES.length}`} />
        <Stat label="Hints used" value={p.hintsUsed} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-lg font-extrabold">Learning levels</h3>
        {LEVELS.map((l, i) => {
          const next = LEVELS[i + 1]
          const pct = p.xp >= (next?.min ?? Infinity) ? 100 : p.xp < l.min ? 0 : next ? ((p.xp - l.min) / (next.min - l.min)) * 100 : 100
          return (
            <div key={l.name} className="min-w-0">
              <div className="flex flex-wrap justify-between gap-x-3 text-sm"><span className="font-bold">{l.name}</span><span className="muted">{l.blurb}</span></div>
              <ProgressBar pct={pct} label={`${l.name} progress`} />
            </div>
          )
        })}
      </div>

      {full && (
        <>
          <div>
            <h3 className="m-0 mb-3 text-lg font-extrabold">Achievement badges</h3>
            <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BADGES.map((b) => {
                const got = p.badges.includes(b.id)
                return (
                  <motion.li key={b.id} initial={false} animate={{ scale: 1, opacity: got ? 1 : 0.62 }} whileHover={{ scale: 1.02 }} className="glass-flat p-3 flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center w-11 h-11 rounded-full font-extrabold display text-lg shrink-0" aria-hidden="true"
                      style={got ? { background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff' } : { background: 'var(--math-bg)', color: 'var(--muted)' }}>{got ? b.glyph : <Icon name="lock" size={18} />}</span>
                    <span className="min-w-0"><span className="block font-bold">{b.name}</span><span className="block text-sm muted">{b.desc}</span><span className="sr-only">{got ? 'Unlocked' : 'Locked'}</span></span>
                  </motion.li>
                )
              })}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!confirm
              ? <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}><Icon name="reset" size={16} />Reset all progress</button>
              : <>
                  <span className="font-semibold">Erase all XP, badges and stats on this device?</span>
                  <button className="btn btn-sm" style={{ background: 'var(--bad)', color: '#fff' }} onClick={() => { actions.resetAll(); setConfirm(false) }}>Yes, erase everything</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
                </>}
            <span className="text-sm muted">Progress is stored only in this browser.</span>
          </div>
        </>
      )}
    </section>
  )
}
