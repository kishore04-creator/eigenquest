import confetti from 'canvas-confetti'
// Workers are created from blob: URLs, which sandboxed viewers block (SecurityError), so draw on the main thread.
const base = { useWorker: false, disableForReducedMotion: true }
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
export function burst(big = false) {
  if (reduced()) return
  try {
    const colors = ['#8b5cf6', '#22d3ee', '#ec4899', '#fb923c', '#60a5fa']
    confetti({ particleCount: big ? 160 : 70, spread: big ? 100 : 70, origin: { y: 0.65 }, colors, ...base })
    if (big) {
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, ...base }), 200)
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, ...base }), 350)
    }
  } catch { /* canvas unavailable (tests, sandboxes) */ }
}
