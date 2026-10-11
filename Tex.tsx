import { memo, useMemo, ReactNode } from 'react'
import katex from 'katex'
import { motion, useReducedMotion } from 'framer-motion'
import type { Block } from '../engine/types'

/** Renders LaTeX with KaTeX. Never throws: bad input shows as plain text. */
export const Tex = memo(function Tex({ math, display = false, className = '' }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try { return katex.renderToString(math, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' }) }
    catch { return math.replace(/[<>&]/g, '') }
  }, [math, display])
  return <span className={(display ? 'block ' : 'tex-inline ') + className} dangerouslySetInnerHTML={{ __html: html }} />
})

/** Text with $inline math$ and **bold** segments. */
export const RichText = memo(function RichText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$|\*\*[^*]+\*\*)/g).filter((s) => s !== '')
  return (
    <>
      {parts.map((s, i) =>
        s.startsWith('$') && s.endsWith('$') && s.length > 2 ? <Tex key={i} math={s.slice(1, -1)} />
        : s.startsWith('**') && s.endsWith('**') ? <strong key={i}>{s.slice(2, -2)}</strong>
        : <span key={i}>{s}</span>)}
    </>
  )
})

const TONES: Record<string, { bg: string; fg: string; label: string }> = {
  info: { bg: 'var(--info-bg)', fg: 'var(--blue)', label: 'Good to know' },
  warn: { bg: 'var(--warn-bg)', fg: 'var(--warn)', label: 'Careful' },
  good: { bg: 'var(--good-bg)', fg: 'var(--good)', label: 'Check passed' },
  tip: { bg: 'var(--tip-bg)', fg: 'var(--violet)', label: 'Tip' },
}

export function CheckMark({ ok = true, size = 44 }: { ok?: boolean; size?: number }) {
  const color = ok ? 'var(--good)' : 'var(--bad)'
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
      {ok && <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: color, opacity: 0.35 }} />}
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill={ok ? 'var(--good-bg)' : 'var(--bad-bg)'} stroke={color} strokeWidth="2.5" />
        {ok ? <path className="check-path" d="M14 25l7 7 13-15" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M16 16l16 16M32 16L16 32" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />}
      </svg>
    </span>
  )
}

/** Renders the engine's display blocks with a gentle staggered reveal. */
export function Blocks({ blocks, animate = true }: { blocks: Block[]; animate?: boolean }) {
  const reduce = useReducedMotion()
  const go = animate && !reduce
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        let el: ReactNode
        switch (b.t) {
          case 'p': el = <p className="m-0 leading-relaxed"><RichText text={b.text} /></p>; break
          case 'h': el = <h4 className="m-0 mt-4 text-xl font-bold"><RichText text={b.text} /></h4>; break
          case 'math': el = <div className="math-block"><Tex math={b.tex} display /></div>; break
          case 'list': el = <ul className="m-0 ps-5 list-disc">{b.items.map((t, k) => <li key={k}><RichText text={t} /></li>)}</ul>; break
          case 'note': {
            const t = TONES[b.tone]
            el = (
              <div className="rounded-2xl px-4 py-3" style={{ background: t.bg }} role={b.tone === 'warn' ? 'note' : undefined}>
                <span className="font-bold me-2" style={{ color: t.fg }}>{t.label}.</span><RichText text={b.text} />
              </div>)
            break
          }
          case 'result':
            el = (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold" style={{ background: b.ok ? 'var(--good-bg)' : 'var(--bad-bg)', color: b.ok ? 'var(--good)' : 'var(--bad)' }}>
                <CheckMark ok={b.ok} /><span><RichText text={b.text} /></span>
              </div>)
            break
        }
        return go
          ? <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.9), duration: 0.35 }}>{el}</motion.div>
          : <div key={i}>{el}</div>
      })}
    </div>
  )
}
