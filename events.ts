// Tiny event bus so any code can trigger a toast without React plumbing.
export type Toast =
  | { kind: 'xp'; amount: number; reason: string }
  | { kind: 'badge'; id: string; name: string; desc: string; glyph: string }
  | { kind: 'level'; name: string }
  | { kind: 'info'; text: string }
type L = (t: Toast) => void
const ls = new Set<L>()
export const onToast = (l: L) => { ls.add(l); return () => { ls.delete(l) } }
export const toast = (t: Toast) => ls.forEach((l) => l(t))
