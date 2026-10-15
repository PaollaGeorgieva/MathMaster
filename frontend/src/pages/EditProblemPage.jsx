import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { request } from '../services/api'

export default function EditProblemPage() {
  const context = useOutletContext()
  const { problemId } = useParams()
  return context.user.role === 'teacher'
    ? <OwnProblem key={problemId} {...context} problemId={problemId} />
    : <Navigate to="/" replace />
}

function OwnProblem({ problemId, ...context }) {
  const resource = useResource(context.token, '/problems/mine')
  if (!resource.data) return <ResourceState resource={resource} />
  const problem = resource.data.find(item => String(item.id) === problemId)
  if (!problem) return <section><Link className="page-back" to="/teacher/problems">← Моите задачи</Link><p role="alert">Задачата не е намерена сред твоите задачи.</p></section>
  return <EditProblem problem={problem} {...context} />
}

function EditProblem({ problem, token, refresh }) {
  const navigate = useNavigate()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (pending.current) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    for (const field of ['question', 'correct_answer', 'explanation']) {
      if (!values[field].trim()) { setError('Попълни условието, верния отговор и решението.'); return }
    }
    values.max_attempts = Number(values.max_attempts)
    values.order_index = Number(values.order_index)
    if (![values.max_attempts, values.order_index].every(value => Number.isInteger(value) && value > 0)) {
      setError('Броят опити и подредбата трябва да са положителни цели числа.'); return
    }
    const changes = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== (problem[field] ?? '')))
    pending.current = true; setBusy(true); setError('')
    try {
      if (Object.keys(changes).length) await request(token, `/problems/${problem.id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      navigate('/teacher/problems', { replace: true, state: { updated: true } })
      refresh().catch(() => {})
    } catch (err) { setError(err.message) }
    finally { pending.current = false; setBusy(false) }
  }

  return <section className="create-problem-page">
    <Link className="page-back" to="/teacher/problems">← Моите задачи</Link>
    <div className="dashboard-heading"><p className="adventure-eyebrow">ТВОЯТА КОЛЕКЦИЯ ОТ ИДЕИ</p><h1>Редактиране на задача</h1></div>
    {error && <p role="alert" className="feedback">{error}</p>}
    <form className="account-card" onSubmit={save}>
      <label htmlFor="edit-question">Условие</label><textarea id="edit-question" name="question" defaultValue={problem.question} required disabled={busy} />
      <label htmlFor="edit-answer">Верен отговор (до 30 символа)</label><input id="edit-answer" name="correct_answer" defaultValue={problem.correct_answer} maxLength={30} required disabled={busy} />
      <label htmlFor="edit-explanation">Решение</label><textarea id="edit-explanation" name="explanation" defaultValue={problem.explanation} required disabled={busy} />
      <label htmlFor="edit-hint">Подсказка</label><textarea id="edit-hint" name="hint" defaultValue={problem.hint ?? ''} disabled={busy} />
      <label htmlFor="edit-attempts">Брой опити</label><input id="edit-attempts" name="max_attempts" type="number" min="1" step="1" defaultValue={problem.max_attempts} required disabled={busy} />
      <label htmlFor="edit-order">Подредба в теорията</label><input id="edit-order" name="order_index" type="number" min="1" step="1" defaultValue={problem.order_index} required disabled={busy} />
      <div className="lesson-actions"><button type="button" className="quiet-button" disabled={busy} onClick={() => navigate('/teacher/problems')}>Отказ</button><button className="adventure-primary" disabled={busy}>{busy ? 'Запазване…' : 'Запази промените'}</button></div>
    </form>
  </section>
}
