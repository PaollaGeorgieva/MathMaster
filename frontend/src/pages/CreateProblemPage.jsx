import { useState, useRef, useEffect } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router'
import { request } from '../services/api'
import MathText from '../components/MathText'

export default function CreateProblemPage() {
  const context = useOutletContext()
  return context.user.role === 'teacher' ? <CreateProblem {...context} /> : <Navigate to="/" replace />
}
function CreateProblem({ token, user, themes, refresh }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const levels = themes.flatMap(theme => (theme.levels ?? []).map(level => ({ ...level, themeTitle: theme.title })))
  const [levelId, setLevelId] = useState(() => String(levels.find(item => item.theories?.length)?.id ?? levels[0]?.id ?? ''))
  const [theoryId, setTheoryId] = useState('')
  const level = levels.find(item => String(item.id) === levelId)
  const [loadedLevel, setLoadedLevel] = useState(null)
  const [loadingTheories, setLoadingTheories] = useState(false)
  const [theoryError, setTheoryError] = useState('')
  const [retryTheories, setRetryTheories] = useState(0)
  useEffect(() => {
    if (!levelId) return
    const controller = new AbortController()
    request(token, `/levels/${levelId}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setLoadedLevel(data); setLoadingTheories(false); setTheoryError('') }
    }).catch(error => {
      if (!controller.signal.aborted) { setTheoryError(error.message); setLoadingTheories(false) }
    })
    return () => controller.abort()
  }, [token, levelId, retryTheories])
  const theories = String(loadedLevel?.id) === levelId ? loadedLevel.theories ?? [] : level?.theories ?? []
  const theory = theories.find(item => String(item.id) === theoryId)
  const classes = user.teacher?.classes ?? []
  async function create(event) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values = Object.fromEntries(data)
    if (!theory) { setMessage('Избери теория към избраното ниво.'); return }
    const body = { ...values, level_id: level.id, theory_id: theory.id, max_attempts: Number(values.max_attempts), order_index: Number(values.order_index), class_ids: data.getAll('class_ids').map(Number) }
    if (!body.class_ids.length) { setMessage('Избери поне един клас.'); return }
    pending.current = true; setBusy(true); setMessage('')
    try { await request(token, '/problems/', { method: 'POST', body: JSON.stringify(body) }); navigate('/teacher/problems', { replace: true, state: { created: true } }); refresh().catch(() => {}) } catch (err) { setMessage(err.message) } finally { pending.current = false; setBusy(false) }
  }

  return <section className="create-problem-page">
    <Link className="page-back" to="/teacher/problems">← Моите задачи</Link>
    <div className="dashboard-heading">
      <p className="adventure-eyebrow">МАЛКА ЗАДАЧА, ГОЛЯМО ОТКРИТИЕ</p><h1>Нова задача</h1>
      <p>Избери теорията, към която принадлежи задачата, и класовете, които ще я решават.</p>
    </div>
    {message && <p role="alert" className="feedback">{message}</p>}
    {!classes.length ? <div className="account-card">
      <p>За да зададеш задача, първо създай клас.</p>
      <Link to="/class" className="adventure-primary page-action">Към моите класове →</Link>
    </div> : !levels.length ? <p className="feedback">Все още няма достъпни нива.</p> : <form className="account-card" onSubmit={create}>
      <label htmlFor="task-level">Ниво</label>
      <select id="task-level" name="level_id" required value={levelId} disabled={busy}
        onChange={event => { setLevelId(event.target.value); setTheoryId(''); setLoadedLevel(null); setLoadingTheories(Boolean(event.target.value)); setTheoryError(''); setMessage('') }}>
        <option value="">Избери ниво</option>
        {levels.map(item => <option key={item.id} value={item.id}>{item.themeTitle} — {item.title}</option>)}
      </select>
      <label htmlFor="task-theory">Теория</label>
      <select id="task-theory" name="theory_id" required value={theoryId}
        disabled={busy || !theories.length} onChange={event => setTheoryId(event.target.value)}>
        <option value="">{!levelId ? 'Първо избери ниво' : loadingTheories && !theories.length ? 'Зареждане…' : 'Избери теория'}</option>
        {theories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      {loadingTheories && <p role="status">Зареждане на теориите…</p>}
      {theoryError && <div role="alert" className="feedback"><p>Теориите не се заредиха: {theoryError}</p><button type="button" onClick={() => { setLoadingTheories(true); setTheoryError(''); setRetryTheories(v => v + 1) }}>Зареди отново</button></div>}
      {level && loadedLevel && !loadingTheories && !theoryError && !theories.length && <p role="status">Към това ниво още няма активни теории. Избери друго ниво.</p>}
      {theory && <details className="worked-solution"><summary>Преглед на теорията</summary><p><MathText text={theory.content} /></p></details>}
      <label htmlFor="task-question">Условие</label><textarea id="task-question" name="question" required />
      <label htmlFor="task-answer">Верен отговор (до 30 символа)</label><input id="task-answer" name="correct_answer" maxLength={30} required />
      <label htmlFor="task-explanation">Обяснение</label><textarea id="task-explanation" name="explanation" required />
      <label htmlFor="task-hint">Подсказка</label><textarea id="task-hint" name="hint" />
      <label htmlFor="task-attempts">Брой опити</label><input id="task-attempts" name="max_attempts" type="number" min="1" defaultValue="3" required />
      <label htmlFor="task-order">Подредба в теорията</label><input id="task-order" name="order_index" type="number" min="1" defaultValue="10" required />
      <fieldset><legend>Класове</legend>{classes.map(item => <label className="check-label" key={item.id}>
        <input type="checkbox" name="class_ids" value={item.id} />{item.name}
      </label>)}</fieldset>
      <div className="lesson-actions"><Link className="page-back" to="/teacher/problems">Отказ</Link>
        <button className="adventure-primary" disabled={busy || !theory}>{busy ? 'Запазване…' : 'Създай задача'}</button>
      </div>
    </form>}
  </section>
}
