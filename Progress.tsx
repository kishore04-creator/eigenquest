import { Dashboard } from '../components/Dashboard'
import { SectionTitle } from '../components/ui'

/** Full progress page: level, stats, every badge, and the reset-all control. */
export function ProgressPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title={<>My <span className="grad-text">Progress</span></>} sub="Your XP, levels and badges. Everything is saved in this browser, so it is still here after a refresh." />
      <Dashboard full />
    </div>
  )
}
