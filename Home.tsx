import { motion } from 'framer-motion'
import { Dashboard } from '../components/Dashboard'
import { TransformViz } from '../components/TransformViz'
import { Icon } from '../components/ui'
import { useProgress, todayStr } from '../lib/store'

export type Go = (page: 'home' | 'learn' | 'solver' | 'practice' | 'progress', arg?: string, opts?: { solveSample?: boolean }) => void

const FEATURES = [
  { glyph: 'λ', title: 'Solve any matrix', text: 'Type your own 2×2 to 5×5 matrix and get eigenvalues, eigenvectors and every step of the working.', page: 'solver' as const },
  { glyph: '★', title: 'Play the Arena', text: 'Five activities plus a daily challenge. Hints cost XP, clean runs earn three stars.', page: 'practice' as const },
  { glyph: 'Σ', title: 'Learn the ideas', text: 'Ten short lessons with worked examples and practice questions after each one.', page: 'learn' as const },
]

export function Home({ go }: { go: Go }) {
  const p = useProgress()
  const dailyDone = p.daily.lastDone === todayStr()
  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center pt-2" aria-labelledby="hero-title">
        <div className="flex flex-col gap-5 min-w-0">
          <span className="chip self-start">Eigenvalues &amp; eigenvectors for college students</span>
          <h1 id="hero-title" className="display m-0 text-5xl sm:text-6xl font-extrabold leading-[1.02]"><span className="grad-text">EigenQuest</span> – The Matrix Adventure</h1>
          <p className="m-0 text-xl sm:text-2xl muted max-w-xl">Enter the Matrix. Discover the Eigenvalues. Unlock the Mathematics!</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary btn-lg" onClick={() => go('solver')}><Icon name="play" size={18} />Start Adventure</button>
            <button className="btn btn-cyan btn-lg" onClick={() => go('learn')}>Learn the Basics</button>
            <button className="btn btn-ghost btn-lg" onClick={() => go('practice')}>Practice Arena</button>
          </div>
          <button className="self-start font-bold underline underline-offset-4 cursor-pointer bg-transparent border-0 p-0" style={{ color: 'var(--violet)' }} onClick={() => go('solver', undefined, { solveSample: true })}>
            See the textbook example solved: A = [[2, 1], [1, 2]] →
          </button>
        </div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass p-3 sm:p-4 min-w-0">
          <TransformViz initial={[[2, 1], [1, 2]]} editable={false} compact />
        </motion.div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start">
        <section className="glass p-5 sm:p-6 flex flex-col gap-3 min-w-0 relative overflow-hidden" aria-label="Daily challenge">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40 blur-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg,var(--blob-orange),var(--blob-pink))' }} aria-hidden="true" />
          <div className="flex items-center gap-2"><Icon name="bolt" /><span className="font-bold uppercase text-sm tracking-wide" style={{ color: 'var(--orange)' }}>Daily Challenge</span></div>
          <h2 className="display m-0 text-2xl font-extrabold">{dailyDone ? 'Done for today!' : 'Today’s matrix is waiting'}</h2>
          <p className="m-0 muted">A fresh matrix every day. Find its eigenvalues and eigenvectors in three stages for 60 XP plus a 40 XP bonus, and keep your daily streak burning.</p>
          <div className="flex flex-wrap gap-2"><span className="chip"><Icon name="flame" size={16} />Daily streak {p.daily.streak}</span><span className="chip">Best {p.daily.best}</span></div>
          <button className="btn btn-primary self-start" onClick={() => go('practice', 'daily')}>{dailyDone ? 'Replay for practice' : 'Take the challenge'}<Icon name="arrowR" size={18} /></button>
        </section>
        <Dashboard />
      </div>

      <section aria-label="What you can do" className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.button key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="glass p-5 text-left flex flex-col gap-2 cursor-pointer hover:-translate-y-1 transition-transform" style={{ color: 'inherit' }} onClick={() => go(f.page)}>
            <span className="grid place-items-center w-12 h-12 rounded-2xl text-white display text-2xl font-extrabold" style={{ background: 'linear-gradient(135deg,var(--btn-from),var(--btn-to))' }} aria-hidden="true">{f.glyph}</span>
            <h3 className="m-0 text-xl font-extrabold">{f.title}</h3>
            <p className="m-0 muted">{f.text}</p>
          </motion.button>
        ))}
      </section>
    </div>
  )
}
