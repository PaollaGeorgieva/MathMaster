import MathText from '../components/MathText'
import SolutionCard from '../components/SolutionCard'
import AnswerInput from '../components/AnswerInput'
import { useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import { request } from '../services/api'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function LevelPage() {
  const context = useOutletContext()
  const { levelId } = useParams()
  return <Lesson key={levelId} levelId={levelId} {...context} />
}

function Lesson(props) {
  const { levelId, token, user } = props
  const resource = useResource(token, `/levels/${levelId}`)
  if (!resource.data) return <ResourceState resource={resource} />
  if (user.role === 'student' && resource.data.is_unlocked) return <ResumeLesson {...props} level={resource.data} />
  return <LessonContent {...props} level={resource.data} />
}

function ResumeLesson(props) {
  const resource = useResource(props.token, '/problems/history/me')
  if (!resource.data) return <ResourceState resource={resource} />
  return <LessonContent {...props} initial={resumePosition(props.level.theories ?? [], resource.data)} />
}

function resumePosition(theories, history) {
  const records = new Map(history.map(item => [item.problem_id, item]))
  const hasProgress = theories.some(theory => theory.problems?.some(problem => records.has(problem.id)))
  if (!hasProgress) return { stage: 0, index: 0, theoryIndex: 0 }
  const lastAttemptedTheory = theories.findLastIndex(theory => theory.problems?.some(problem => records.has(problem.id)))
  for (let theoryIndex = 0; theoryIndex < theories.length; theoryIndex++) {
    const problems = theories[theoryIndex].problems ?? []
    if (!problems.length && theoryIndex > lastAttemptedTheory) return { stage: 0, index: 0, theoryIndex }
    const index = problems.findIndex(problem => {
      const record = records.get(problem.id)
      return !record || (!record.is_solved && record.attempts_used < record.max_attempts)
    })
    if (index !== -1) return {
      theoryIndex, index,
      stage: problems.some(problem => records.has(problem.id)) ? 2 : 0,
    }
  }
  return { stage: 3, index: 0, theoryIndex: Math.max(0, theories.length - 1) }
}

function LessonContent({ token, user, refresh, level, initial = { stage: 0, index: 0, theoryIndex: 0 } }) {
  const [stage, setStage] = useState(initial.stage)
  const [index, setIndex] = useState(initial.index)
  const [theoryIndex, setTheoryIndex] = useState(initial.theoryIndex)
  const theories = level?.theories ?? []
  const theory = theories[theoryIndex]
  const examples = theory?.example_problems ?? []
  const problems = theory?.problems ?? []
  const labels = ['Теория', 'Примери', 'Твоят ред', 'Резултат']
  function move(next) { setStage(next); setIndex(0) }
  function nextTheory() {
    if (theoryIndex + 1 < theories.length) {
      setTheoryIndex(theoryIndex + 1)
      move(0)
    } else move(3)
  }
  return <>
    <Link className="page-back" to={level ? `/themes/${level.theme_id}` : '/'}>← Към картата</Link>
    {level && (!level.is_unlocked ? <p className="feedback">Това ниво е заключено.</p> : <section className="lesson-game">
      <p className="adventure-eyebrow">МАЛКА СТЪПКА, ГОЛЯМО ОТКРИТИЕ</p><h1>{level.title}</h1>
      {user.role === 'teacher' && <Link className="adventure-primary page-action" to={`/teacher/library?level=${level.id}`}>Разгледай задачите →</Link>}
      {user.role === 'student' && <button className="quiet-button" onClick={() => { setTheoryIndex(0); move(0) }}>Преглед от началото</button>}
      {theory && <p className="lesson-block-title">Част {theoryIndex + 1} от {theories.length}: {theory.title}</p>}
      <ol className="lesson-stages">{labels.map((label, i) => <li key={label} aria-current={stage === i ? 'step' : undefined} className={stage >= i ? 'reached' : ''}><span>{stage > i ? '✓' : i + 1}</span>{label}</li>)}</ol>
      <div className="lesson-stage-card" key={`${theoryIndex}-${stage}-${index}`}>
        <div className="lesson-guide" aria-hidden="true"><span className="map-buddy buddy-yellow"><span>● ●</span><i /></span></div>
        {stage === 0 && <>
          <p className="stage-tag">ТЕОРИЯ</p>
          <h2>{theory?.title || 'Да разберем заедно'}</h2>
          <p className="lesson-text"><MathText text={theory?.content || 'За това ниво все още няма теория.'} /></p>
          {theory && <button className="adventure-primary" onClick={() => move(examples.length ? 1 : 2)}>
            {examples.length ? 'Разбрах, покажи ми пример →' : 'Към задачите →'}
          </button>}
        </>}
        {stage === 1 && <>
          <p className="stage-tag">ПРИМЕР {index + 1} / {examples.length}</p><h2>{theory?.title}</h2>
          {examples[index] && <Example example={examples[index]} onNext={() => index + 1 < examples.length ? setIndex(index + 1) : move(2)} />}
          <button className="quiet-button" onClick={() => move(0)}>Преговори теорията</button>
        </>}
        {stage === 2 && <>
          {user.role !== 'student' ? <>
            <h2>Преглед за учител</h2>
            <div className="library-grid">{problems.map((problem, i) => <article className={`exercise-card tone-${i % 4}`} key={problem.id}><span className="exercise-meta">ЗАДАЧА {i + 1}</span><h2><MathText text={problem.question} /></h2><Link to={`/teacher/library?level=${level.id}&theory=${theory.id}`}>Към задачите и решенията →</Link></article>)}</div>
            {!problems.length && <p>Все още няма задачи към тази теория.</p>}
            <button className="adventure-primary" onClick={nextTheory}>Продължи →</button>
          </> : problems[index] ? <Problem
            key={problems[index].id} problem={problems[index]} token={token} refresh={refresh}
            position={index + 1} total={problems.length}
            onNext={() => index + 1 < problems.length ? setIndex(index + 1) : nextTheory()}
          /> : <>
            <p>Все още няма задачи към тази теория.</p>
            <button className="adventure-primary" onClick={nextTheory}>Продължи →</button>
          </>}
          <button className="quiet-button" onClick={() => move(0)}>Преговори тази теория</button>
        </>}
        {stage === 3 && (user.role === 'student' ? <LessonResult token={token} level={level} /> : <>
          <h2>Край на прегледа</h2>
          <Link className="adventure-primary page-action" to={`/themes/${level.theme_id}`}>Към темата →</Link>
        </>)}
      </div>
    </section>)}
  </>
}

function Example({ example, onNext }) {
  const [revealed, setRevealed] = useState(false)
  return <><p className="lesson-question"><MathText text={example.question} /></p>{!revealed ? <button className="adventure-primary" onClick={() => setRevealed(true)}>Покажи решението</button> : <><div className="worked-solution"><h3>Решение стъпка по стъпка</h3><p className="lesson-text"><MathText text={example.solution} /></p></div><button className="adventure-primary" onClick={onNext}>Продължи →</button></>}</>
}

function Problem({ problem, token, refresh, position, total, onNext }) {
  const resource = useResource(token, `/problems/${problem.id}/my-result`)
  const [result, setResult] = useState(null)
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  const saved = resource.data
  const solved = result ? result.is_correct : saved?.already_solved
  const remaining = result ? result.remaining_attempts : saved?.remaining_attempts
  const done = solved || remaining === 0
  async function act(kind) {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      if (kind === 'hint') {
        const data = await request(token, `/problems/${problem.id}/hint`)
        setHint(data.hint || 'Няма добавена подсказка.')
      } else {
        const data = await request(token, `/problems/${problem.id}/submit`, { method: 'POST', body: JSON.stringify({ submitted_answer: answer.trim() }) })
        setResult(data)
        try { await refresh() } catch { setError('Отговорът е записан. Общият прогрес ще се обнови при следващото влизане.') }
      }
    } catch (err) {
      setError(err.message)
      // A lost response may follow a committed answer. Read server state before retrying.
      resource.reload()
      setResult(null)
    } finally { pending.current = false; setBusy(false) }
  }
  return <><p className="stage-tag">МИСИЯ {position} / {total}</p><h2>Сега е твоят ред!</h2><p className="lesson-question"><MathText text={problem.question} /></p><ResourceState resource={resource} />
    {saved && <><p>Оставащи опити: {remaining}</p>{!done && <form onSubmit={e => { e.preventDefault(); act('answer') }}><AnswerInput question={problem.question} value={answer} onChange={setAnswer} disabled={busy} /><button className="adventure-primary" disabled={busy || !answer.trim()}>{busy ? 'Проверяваме…' : 'Провери отговора'}</button><button className="quiet-button" type="button" disabled={busy} onClick={() => act('hint')}>Подсказка</button></form>}
      {hint && <aside className="help-bubble"><strong>✦ Подсказка</strong><div><MathText text={hint} /></div></aside>}
      {(result || done) && <div role="status" className={`feedback ${solved ? 'success' : ''}`}><h3>{solved ? '✓ Браво! Задачата е решена.' : done ? 'Опитите за тази задача приключиха.' : 'Още малко! Опитай отново.'}</h3>{result?.points_awarded > 0 && <p className="answer-chip">★ +{result.points_awarded} точки</p>}<SolutionCard explanation={result?.explanation ?? saved.explanation} answer={result?.correct_answer ?? saved.correct_answer} /></div>}
      {done && <button className="adventure-primary" disabled={busy} onClick={onNext}>Продължи →</button>}
    </>}{error && <p role="alert" className="feedback">{error}</p>}</>
}

function LessonResult({ token, level }) {
  const resource = useResource(token, `/levels/${level.id}/summary`)
  return <><ResourceState resource={resource} />{resource.data && <><p className="stage-tag">ТВОЯТ НАПРЕДЪК</p><h2>{resource.data.is_completed ? '★ Нивото е завършено!' : 'Приключи тази тренировка'}</h2><p>{resource.data.solved_problems} от {resource.data.total_problems} задачи решени.</p>{!resource.data.is_completed && <p>Нивото се завършва само след успешно решаване на всички официални задачи.</p>}<Link className="adventure-primary page-action" to={`/themes/${level.theme_id}`}>Обратно към пътечката →</Link></>}</>
}
