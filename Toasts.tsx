import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { onToast, Toast } from '../lib/events'

type Item = Toast & { uid: number }
let uid = 0

export function Toasts() {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => onToast((t) => {
    const id = ++uid
    setItems((cur) => [...cur.slice(-3), { ...t, uid: id }])
    setTimeout(() => setItems((cur) => cur.filter((x) => x.uid !== id)), t.kind === 'xp' ? 2600 : 5200)
  }), [])
  return (
    <div className="fixed z-50 flex flex-col gap-2 items-end pointer-events-none" style={{ right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', maxWidth: 'calc(100vw - 32px)' }} aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.uid} layout initial={{ opacity: 0, x: 40, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="glass px-4 py-3 flex items-center gap-3 pointer-events-auto" style={{ borderRadius: '1.1rem' }}>
            {t.kind === 'xp' && (<><span className="display font-extrabold text-xl grad-text">+{t.amount} XP</span><span className="muted text-sm">{t.reason}</span></>)}
            {t.kind === 'badge' && (<>
              <span className="grid place-items-center w-11 h-11 rounded-full text-white font-extrabold display text-lg" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>{t.glyph}</span>
              <span><div className="font-bold">Badge unlocked: {t.name}</div><div className="text-sm muted">{t.desc}</div></span></>)}
            {t.kind === 'level' && (<><span className="display text-xl font-extrabold grad-text">Level up!</span><span>You are now a <strong>{t.name}</strong></span></>)}
            {t.kind === 'info' && <span>{t.text}</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
