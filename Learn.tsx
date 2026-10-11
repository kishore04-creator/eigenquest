import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { solveMatrix } from '../engine'
import type { Block } from '../engine/types'
import { Blocks, RichText, Tex, CheckMark } from '../components/Tex'
import { DetViz } from '../components/DetViz'
import { TransformViz, M2 } from '../components/TransformViz'
import { Icon, ProgressBar, SectionTitle } from '../components/ui'
import { LESSONS, Lesson, LessonExample, LessonQuestion } from '../lib/lessons'
import { actions, getProgress, useProgress } from '../lib/store'
import { burst } from '../lib/confetti'
import { bmatrix } from '../engine/tex'

const qKey = (l: Lesson, q: LessonQuestion) => `lesson:${l.id}:${q.id}`

/** Learn hub: a grid of lessons, or one lesson when `lessonId` is set. */
export function Learn({ lessonId, onSelect }: { lessonId?: string | null; onSelect: (id: string | null) => void }) {
  const p = useProgress()
  const idx = LESSONS.findIndex((l) => l.id === lessonId)
  if (idx >= 0) return <LessonView lesson={LESSONS[idx]} prev={LESSONS[idx - 1]} next={LESSONS[idx + 1]} onSelect={onSelect} />
  const done = p.lessons.length
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title={<>Learn the <span className="grad-text">Basics</span></>} sub="Ten short lessons, from “what is a matrix?” to real-world applications. Each ends with practice questions that earn XP." />
      <div className="glass p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48"><div className="font-bold mb-1">{done} of {LESSONS.length} lessons complete</div><ProgressBar pct={(done / LESSONS.length) * 100} label="Lessons completed" /></div>
        <button className="btn btn-primary" onClick={() => onSelect((LESSONS.find((l) => !p.lessons.includes(l.id)) ?? LESSONS[0]).id)}>{done ? 'Continue learning' : 'Start lesson 1'}<Icon name="arrowR" size={18} /></button>
      </div>
      <ol className="m-0 p-0 list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l, i) => {
          const finished = p.lessons.includes(l.id)
          const answered = l.questions.filter((q) => p.awarded.includes(qKey(l, q))).length
          return (
            <li key={l.id} className="min-w-0">
              <button onClick={() => onSelect(l.id)} className="glass p-5 w-full h-full text-left flex flex-col gap-3 cursor-pointer transition-transform hover:-translate-y-1" style={{ color: 'inherit' }}>
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-12 h-12 rounded-2xl text-white display font-extrabold shrink-0 text-lg" style={{ background: 'linear-gradient(135deg,var(--btn-from),var(--btn-to))' }} aria-hidden="true">{l.glyph}</span>
                  <span className="text-sm muted font-bold">Lesson {i + 1}</span>
                  {finished && <span className="chip ms-auto" style={{ color: 'var(--good)' }}>✓ Done</span>}
                </div>
                <h3 className="m-0 text-xl font-extrabold">{l.title}</h3>
                <p className="m-0 muted flex-1">{l.tagline}</p>
                <div className="text-sm muted">{answered}/{l.questions.length} practice questions solved</div>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Runs the real solver for a worked example and returns the requested stages. */
function useExample(ex: LessonExample) {
  return useMemo(() => {
    const out = solveMatrix(ex.matrix.map((r) => r.map(String)))
    if (!out.ok) return null
    return { stages: ex.stages.map((n) => out.result.stages[n - 1]), n: out.result.n, matrixTex: out.result.matrixTex }
  }, [ex])
}

function Example({ ex, open }: { ex: LessonExample; open: boolean }) {
  const data = useExample(ex)
  if (!data) return null
  return (
    <details open={open} className="glass-flat px-4 py-3">
      <summary className="cursor-pointer font-bold text-lg flex flex-wrap items-center gap-3"><span>{ex.title}</span><Tex math={`A=${bmatrix(ex.matrix.map((r) => r.map(String)))}`} /></summary>
      <div className="flex flex-col gap-5 mt-4">
        {data.stages.map((s) => (
          <div key={s.id}>
            <h4 className="m-0 mb-2 text-lg font-extrabold"><span className="grad-text">Step {s.id}</span>: {s.title}</h4>
            <Blocks blocks={s.blocks} animate={false} />
          </div>
        ))}
      </div>
    </details>
  )
}

function Viz({ kind }: { kind: NonNullable<Lesson['viz']> }) {
  const init: Record<string, M2> = { transform: [[2, 1], [1, 2]], rotation: [[0, -1], [1, 0]], shear: [[1, 1], [0, 1]] }
  return (
    <div className="glass-flat p-3 sm:p-4">
      {kind === 'det' ? <DetViz /> : <TransformViz initial={init[kind]} compact />}
    </div>
  )
}

function LessonView({ lesson, prev, next, onSelect }: { lesson: Lesson; prev?: Lesson; next?: Lesson; onSelect: (id: string | null) => void }) {
  const p = useProgress()
  const finished = p.lessons.includes(lesson.id)
  const num = LESSONS.indexOf(lesson) + 1
  return (
    <article className="flex flex-col gap-5 min-w-0">
      <button className="btn btn-ghost btn-sm self-start" onClick={() => onSelect(null)}><Icon name="arrowL" size={16} />All lessons</button>
      <header>
        <div className="flex flex-wrap items-center gap-2 mb-1"><span className="chip">Lesson {num} of {LESSONS.length}</span>{finished && <span className="chip" style={{ color: 'var(--good)' }}>✓ Complete</span>}</div>
        <h2 className="display m-0 text-3xl sm:text-4xl font-extrabold"><span className="grad-text">{lesson.title}</span></h2>
        <p className="m-0 mt-1 muted">{lesson.tagline}</p>
      </header>
      <motion.section key={lesson.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 sm:p-6 flex flex-col gap-4 min-w-0">
        <Blocks blocks={lesson.blocks} animate={false} />
        {lesson.viz && <Viz kind={lesson.viz} />}
        {lesson.examples?.map((ex, i) => <Example key={ex.title} ex={ex} open={i === 0} />)}
        {lesson.after && <Blocks blocks={lesson.after as Block[]} animate={false} />}
      </motion.section>
      <LessonQuiz lesson={lesson} />
      <nav className="flex flex-wrap gap-3 justify-between" aria-label="Lesson navigation">
        {prev ? <button className="btn btn-ghost" onClick={() => onSelect(prev.id)}><Icon name="arrowL" size={18} />{prev.title}</button> : <span />}
        {next
          ? <button className="btn btn-primary" onClick={() => onSelect(next.id)}>Next: {next.title}<Icon name="arrowR" size={18} /></button>
          : <button className="btn btn-primary" onClick={() => { location.hash = '#/solver' }}>Try the Matrix Solver<Icon name="arrowR" size={18} /></button>}
      </nav>
    </article>
  )
}

/** Practice questions after a lesson. Correct answers pay XP once and complete the lesson when all are solved. */
function LessonQuiz({ lesson }: { lesson: Lesson }) {
  const p = useProgress()
  const [tried, setTried] = useState<Record<string, number[]>>({})
  const pick = (q: LessonQuestion, i: number) => {
    const key = qKey(lesson, q)
    if (getProgress().awarded.includes(key) || tried[q.id]?.includes(i)) return
    setTried((t) => ({ ...t, [q.id]: [...(t[q.id] ?? []), i] }))
    if (i !== q.answer) return
    actions.award(5, 'Practice question', key)
    const aw = getProgress().awarded
    if (lesson.questions.every((x) => aw.includes(qKey(lesson, x)))) {
      actions.award(15, `Lesson ${LESSONS.indexOf(lesson) + 1} complete`, `lessondone:${lesson.id}`)
      actions.completeLesson(lesson.id)
      burst(true)
    } else burst(false)
  }
  return (
    <section className="glass p-5 sm:p-6 flex flex-col gap-6" aria-label="Practice questions">
      <h3 className="m-0 text-2xl font-extrabold">Check your understanding</h3>
      {lesson.questions.map((q, qi) => {
        const solved = p.awarded.includes(qKey(lesson, q))
        const wrongTried = tried[q.id] ?? []
        return (
          <div key={q.id} className="flex flex-col gap-3">
            <p className="m-0 text-lg font-semibold"><span className="grad-text me-2">Q{qi + 1}.</span><RichText text={q.prompt} /></p>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={`Answers for question ${qi + 1}`}>
              {q.options.map((opt, i) => {
                const isRight = solved && i === q.answer
                const isWrong = wrongTried.includes(i) && i !== q.answer
                return (
                  <button key={i} className="btn btn-ghost justify-start text-left" disabled={solved} aria-pressed={isRight || isWrong}
                    onClick={() => pick(q, i)}
                    style={{ borderColor: isRight ? 'var(--good)' : isWrong ? 'var(--bad)' : undefined, background: isRight ? 'var(--good-bg)' : isWrong ? 'var(--bad-bg)' : undefined, opacity: 1 }}>
                    <span className="font-extrabold me-1" aria-hidden="true">{'ABCD'[i]}</span><RichText text={opt.t} />
                    {isRight && <span className="ms-auto" style={{ color: 'var(--good)' }}>✓</span>}
                    {isWrong && <span className="ms-auto" style={{ color: 'var(--bad)' }}>✗</span>}
                  </button>
                )
              })}
            </div>
            <div aria-live="polite" className="flex flex-col gap-2">
              {wrongTried.filter((i) => i !== q.answer).map((i) => (
                <div key={i} className="rounded-2xl px-4 py-3" style={{ background: 'var(--bad-bg)' }}><strong style={{ color: 'var(--bad)' }}>Not quite. </strong><RichText text={q.options[i].why ?? 'Try again.'} /></div>
              ))}
              {solved && <div className="rounded-2xl px-4 py-3 flex gap-3 items-start" style={{ background: 'var(--good-bg)' }}><CheckMark size={32} /><span><strong style={{ color: 'var(--good)' }}>Correct! </strong><RichText text={q.explain} /></span></div>}
            </div>
          </div>
        )
      })}
    </section>
  )
}
