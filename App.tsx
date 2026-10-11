import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Go } from './pages/Home'
import { Learn } from './pages/Learn'
import { Solver, Preset, SAMPLES } from './pages/Solver'
import { Practice } from './pages/Practice'
import { ProgressPage } from './pages/Progress'
import { Toasts } from './components/Toasts'
import { FloatingSymbols } from './components/FloatingSymbols'
import { Icon } from './components/ui'
import { useTheme } from './lib/theme'
import { levelInfo, ActivityId } from './lib/gamify'
import { setCelebrate, useProgress } from './lib/store'
import { burst } from './lib/confetti'

type Page = 'home' | 'learn' | 'solver' | 'practice' | 'progress'
const PAGES: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'learn', label: 'Learn' }, { id: 'solver', label: 'Solver' },
  { id: 'practice', label: 'Practice Arena' }, { id: 'progress', label: 'My Progress' },
]

/** Tiny hash router: "#/learn/L3" → { page: 'learn', arg: 'L3' }. Keeps the back button and refresh working. */
function parseHash(): { page: Page; arg?: string } {
  const [, page, arg] = location.hash.split('/')
  return { page: (PAGES.some((p) => p.id === page) ? page : 'home') as Page, arg: arg || undefined }
}

export default function App() {
  const [route, setRoute] = useState(parseHash)
  const [preset, setPreset] = useState<Preset | undefined>()
  const [visitedSolver, setVisitedSolver] = useState(route.page === 'solver')
  const theme = useTheme()
  const p = useProgress()
  const lv = levelInfo(p.xp)

  useEffect(() => { setCelebrate(() => burst(true)) }, [])
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { if (route.page === 'solver') setVisitedSolver(true) }, [route.page])
  useEffect(() => {
    const name = PAGES.find((x) => x.id === route.page)?.label ?? 'Home'
    document.title = route.page === 'home' ? 'EigenQuest – The Matrix Adventure' : `${name} · EigenQuest`
  }, [route.page])

  const go: Go = useCallback((page, arg, opts) => {
    if (opts?.solveSample) setPreset({ matrix: SAMPLES[0].m.map((r) => r.map(String)), autoSolve: true, nonce: Date.now() })
    location.hash = `#/${page}${arg ? `/${arg}` : ''}`
  }, [])

  const themeIcon = theme.pref === 'light' ? 'sun' : theme.pref === 'dark' ? 'moon' : 'auto'
  const themeLabel = theme.pref === 'system' ? 'Theme: automatic' : `Theme: ${theme.pref}`

  return (
    <>
      <FloatingSymbols />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-primary">Skip to content</a>
      <header className="sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="glass mx-3 sm:mx-6 mt-3 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderRadius: '1.25rem' }}>
          <a href="#/home" className="flex items-center gap-2 no-underline font-extrabold display text-xl" style={{ color: 'var(--fg)' }} aria-label="EigenQuest home">
            <span className="grid place-items-center w-9 h-9 rounded-xl text-white" style={{ background: 'linear-gradient(135deg,var(--btn-from),var(--btn-to))' }} aria-hidden="true">λ</span>
            <span>EigenQuest</span>
          </a>
          <nav aria-label="Main" className="order-3 sm:order-none w-full sm:w-auto sm:flex-1 overflow-x-auto tab-scroll">
            <ul className="m-0 p-0 list-none flex gap-1 min-w-max">
              {PAGES.map((x) => (
                <li key={x.id}>
                  <a href={`#/${x.id}`} aria-current={route.page === x.id ? 'page' : undefined} className="block no-underline font-bold rounded-full px-3 py-1.5 text-sm sm:text-base"
                    style={route.page === x.id ? { background: 'linear-gradient(100deg,var(--btn-from),var(--btn-to))', color: '#fff' } : { color: 'var(--fg)' }}>{x.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2 ms-auto sm:ms-0">
            <a href="#/progress" className="chip no-underline" style={{ color: 'var(--fg)' }} title={`${lv.cur.name}`}><Icon name="bolt" size={14} />{p.xp} XP · L{lv.index + 1}</a>
            {p.streak > 1 && <span className="chip" title="Correct answers in a row"><Icon name="flame" size={14} />{p.streak}</span>}
            <button className="btn btn-ghost btn-sm" onClick={theme.cycle} aria-label={`${themeLabel}. Click to change.`} title={themeLabel}><Icon name={themeIcon} size={18} /></button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 sm:py-8">
        {/* The solver stays mounted once opened so a half-typed matrix survives switching tabs. */}
        {visitedSolver && <div hidden={route.page !== 'solver'}><Solver preset={preset} /></div>}
        <AnimatePresence mode="wait" initial={false}>
          {route.page !== 'solver' && (
            <motion.div key={route.page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {route.page === 'home' && <Home go={go} />}
              {route.page === 'learn' && <Learn lessonId={route.arg} onSelect={(id) => go('learn', id ?? undefined)} />}
              {route.page === 'practice' && <Practice initial={(route.arg as ActivityId | undefined) ?? null} />}
              {route.page === 'progress' && <ProgressPage />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-6xl px-3 sm:px-6 pb-10 text-sm muted">
        EigenQuest · Math is rendered with KaTeX and checked with exact rational arithmetic and math.js. Progress is saved in this browser only.
      </footer>
      <Toasts />
    </>
  )
}
