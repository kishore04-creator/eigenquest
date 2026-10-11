const SYMS = [
  { s: 'λ', x: '6%', y: '14%', z: 64, d: '0s' }, { s: 'Σ', x: '88%', y: '22%', z: 54, d: '-3s' }, { s: 'det', x: '78%', y: '70%', z: 40, d: '-6s' },
  { s: '∞', x: '14%', y: '76%', z: 60, d: '-2s' }, { s: 'A v', x: '46%', y: '90%', z: 36, d: '-8s' }, { s: '⟨ ⟩', x: '92%', y: '48%', z: 46, d: '-5s' },
  { s: 'I', x: '30%', y: '8%', z: 44, d: '-9s' }, { s: 'ℝ', x: '62%', y: '12%', z: 50, d: '-4s' }, { s: 'i', x: '3%', y: '46%', z: 48, d: '-7s' },
]
/** Decorative drifting maths symbols behind the page. */
export function FloatingSymbols() {
  return (
    <div aria-hidden="true">
      {SYMS.map((a, i) => <span key={i} className="sym" style={{ left: a.x, top: a.y, fontSize: a.z, animationDelay: a.d }}>{a.s}</span>)}
    </div>
  )
}
