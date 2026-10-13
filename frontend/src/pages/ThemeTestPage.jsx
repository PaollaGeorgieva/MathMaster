import MathAnswer from '../components/MathAnswer'
import MathText from '../components/MathText'
import { useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import { request } from '../services/api'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function ThemeTestPage() {
  const context = useOutletContext()
  const { themeId } = useParams()
  if (context.user.role !== 'student') return <><Link to={`/themes/${themeId}`} className="page-back">← Към картата</Link><h1>Тест на темата</h1><p>Тестовете се решават от учениците. Резултатите им са в „Моите класове“.</p></>
  return <Test key={themeId} themeId={themeId} {...context} />
}
function Test({ themeId, token, refresh }) {
  const resource = useResource(token, `/tests/theme/${themeId}/active`)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const test = resource.data
  const question = test?.questions[index]
  async function submit() {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      const data = await request(token, `/tests/${test.id}/submit`, { method: 'POST', body: JSON.stringify({ answers: test.questions.map(q => ({ question_id: q.id, ...(q.question_type === 'single_choice' ? { selected_answer_id: Number(answers[q.id]) } : { submitted_text: answers[q.id].trim() }) })) }) })
      setResult(data)
      try { await refresh() } catch { setError('Резултатът е записан. Общият прогрес ще се обнови при следващото влизане.') }
    } catch (err) { setError(err.message); resource.reload() } finally { pending.current = false; setBusy(false) }
  }
  return <><Link className="page-back" to={`/themes/${themeId}`}>← Към картата</Link><h1>Голямото предизвикателство</h1><ResourceState resource={resource} />{error && <p role="alert" className="feedback">{error}</p>}{result ? <section className="lesson-stage-card"><h2>★ {result.percentage}%</h2><p>{result.earned_points} от {result.max_points} точки</p>{result.badge_earned && <p>Спечели значка!</p>}{result.answers.map(answer => <details key={answer.question_id}><summary>{answer.is_correct ? '✓' : '○'} <MathText text={answer.question} /></summary><p>Твоят отговор: <MathText text={answer.submitted_answer || '—'} /></p><p>Верен отговор: <MathText text={answer.correct_answer} /></p></details>)}<Link className="adventure-primary page-action" to="/">Към следващата тема →</Link></section> : test?.already_submitted ? <section className="account-card"><h2>Тестът вече е предаден</h2><p>Резултат: {test.submitted_percentage}%</p><Link to="/history">Виж историята</Link></section> : question && <section className="lesson-game"><p>Въпрос {index + 1} от {test.questions.length}</p><progress value={index + 1} max={test.questions.length} aria-label="Въпроси в теста" /><div className="lesson-stage-card"><h2><MathText text={question.question} /></h2>{question.question_type === 'single_choice' ? <fieldset className="test-options"><legend>Избери един отговор</legend>{question.options.map(option => <label className="check-label" key={option.id}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === String(option.id)} onChange={() => setAnswers({ ...answers, [question.id]: String(option.id) })} disabled={busy} /><MathText text={option.answer} /></label>)}</fieldset> : <MathAnswer key={question.id} value={answers[question.id] || ''} onChange={value => setAnswers({ ...answers, [question.id]: value })} disabled={busy} />}<div className="lesson-actions"><button className="quiet-button" disabled={busy || index === 0} onClick={() => setIndex(index - 1)}>← Назад</button>{index + 1 < test.questions.length ? <button className="adventure-primary" disabled={busy || !answers[question.id]?.trim()} onClick={() => setIndex(index + 1)}>Следващ въпрос →</button> : <button className="adventure-primary" disabled={busy || test.questions.some(q => !answers[q.id]?.trim())} onClick={submit}>{busy ? 'Предаваме…' : 'Предай теста'}</button>}</div><p className="adventure-lesson-note">Можеш да прегледаш отговорите преди предаване. В момента тестът позволява едно предаване.</p></div></section>}</>
}
