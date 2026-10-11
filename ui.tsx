import { ReactNode } from 'react'

export function ProgressBar({ pct, label, className = '' }: { pct: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, pct))
  return <div className={`bar ${className}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${v}%` }} /></div>
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="glass-flat px-4 py-3 min-w-0">
      <div className="text-sm muted">{label}</div>
      <div className="display text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="text-xs muted">{sub}</div>}
    </div>
  )
}

export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span aria-label={`${n} of ${max} stars`} className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" fill={i < n ? '#f59e0b' : 'none'} stroke={i < n ? '#f59e0b' : 'var(--line)'} strokeWidth="1.8" strokeLinejoin="round" /></svg>
      ))}
    </span>
  )
}

export function SectionTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="display m-0 text-3xl sm:text-4xl font-extrabold">{title}</h2>
      {sub && <p className="m-0 mt-1 muted max-w-2xl">{sub}</p>}
    </div>
  )
}

export function Icon({ name, size = 20 }: { name: 'sun' | 'moon' | 'auto' | 'flame' | 'bolt' | 'trophy' | 'lock' | 'bulb' | 'reset' | 'clock' | 'arrowL' | 'arrowR' | 'play' | 'dice' | 'eraser' | 'list'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'sun': return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    case 'moon': return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
    case 'auto': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
    case 'flame': return <svg {...p}><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" /></svg>
    case 'bolt': return <svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
    case 'trophy': return <svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
    case 'lock': return <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
    case 'bulb': return <svg {...p}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>
    case 'reset': return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'arrowL': return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    case 'arrowR': return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case 'play': return <svg {...p}><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg>
    case 'dice': return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></svg>
    case 'eraser': return <svg {...p}><path d="M20 20H9L4 15a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 8" /></svg>
    case 'list': return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  }
}
