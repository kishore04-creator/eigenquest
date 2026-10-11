import { useEffect, useState } from 'react'
export type ThemePref = 'system' | 'light' | 'dark'
const KEY = 'eigenquest.theme'
const read = (): ThemePref => { try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark' || v === 'system') return v } catch { /* */ } return 'system' }
const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read)
  const [sys, setSys] = useState(systemDark)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const h = () => setSys(mq.matches)
    mq.addEventListener?.('change', h)
    return () => mq.removeEventListener?.('change', h)
  }, [])
  const resolved: 'light' | 'dark' = pref === 'system' ? (sys ? 'dark' : 'light') : pref
  useEffect(() => { document.documentElement.setAttribute('data-theme', resolved) }, [resolved])
  const set = (p: ThemePref) => { setPref(p); try { localStorage.setItem(KEY, p) } catch { /* */ } }
  const cycle = () => set(pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system')
  return { pref, resolved, set, cycle }
}
