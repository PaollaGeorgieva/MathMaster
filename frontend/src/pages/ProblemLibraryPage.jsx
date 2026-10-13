import { useEffect, useState } from 'react'
import { request } from '../services/api'
import { Link, Navigate, useOutletContext, useSearchParams } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import MathText from '../components/MathText'
import SolutionCard from '../components/SolutionCard'

export default function ProblemLibraryPage() {
  const context = useOutletContext()
  return context.user.role === 'teacher' ? <Library {...context} /> : <Navigate to="/" replace />
}

function Library({ token, themes }) {
  const resource = useResource(token, '/problems/catalog')
  const [params, setParams] = useSearchParams()
  const levelId = params.get('level') || ''
  const theoryId = params.get('theory') || ''
  const [search, setSearch] = useState('')
  const [details, setDetails] = useState([])
  const [theoryError, setTheoryError] = useState('')
  const levelIds = themes.flatMap(t => t.levels ?? []).map(l => l.id).join(',')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(levelIds.split(',').filter(Boolean).map(id => request(token, `/levels/${id}`, { signal: controller.signal })))
      .then(rows => { if (!controller.signal.aborted) { setDetails(rows); setTheoryError('') } })
      .catch(error => { if (!controller.signal.aborted) setTheoryError(error.message) })
    return () => controller.abort()
  }, [token, levelIds])
  const levels = themes.flatMap(t => t.levels ?? [])
  const theories = details.filter(l => !levelId || String(l.id) === levelId).flatMap(l => l.theories ?? [])
  const visible = (resource.data ?? []).filter(p => (!levelId || String(p.level_id) === levelId) &&
    (!theoryId || String(p.theory_id) === theoryId) && p.question.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  return <section className="library-page">
    <div className="task-page-heading"><div><p className="adventure-eyebrow">ВСИЧКО ЗА ТВОЯ УРОК</p><h1>Библиотека със задачи</h1><p>Избери теория и разгледай задачите с техните решения.</p></div><Link className="adventure-primary page-action" to="/teacher/problems/new">＋ Нова задача</Link></div>
    <nav className="progress-tabs"><Link to="/teacher/problems">Моите задачи</Link><span className="active">Библиотека</span></nav>
    <div className="library-filters">
      <label>Ниво<select value={levelId} onChange={e => setParams(e.target.value ? { level: e.target.value } : {})}><option value="">Всички нива</option>{levels.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
      <label>Теория<select value={theoryId} onChange={e => setParams({ ...(levelId ? { level: levelId } : {}), ...(e.target.value ? { theory: e.target.value } : {}) })}><option value="">Всички теории</option>{theories.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>Търсене<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Текст от условието…" type="search" /></label>
    </div>
    <ResourceState resource={resource} />
    {theoryError && <p role="alert">Не успяхме да заредим теориите: {theoryError}</p>}
    {resource.data && <><p className="task-count">{visible.length} задачи</p><div className="library-grid">{visible.map((p, i) => <article className={`exercise-card tone-${i % 4}`} key={p.id}>
      <div className="exercise-meta"><span>ЗАДАЧА {p.order_index}</span><span>{p.is_official ? 'Учебна' : 'Моя задача'}</span></div>
      <p className="exercise-theory">{theories.find(t => t.id === p.theory_id)?.title}</p>
      <h2><MathText text={p.question} /></h2>
      <SolutionCard explanation={p.explanation} hint={p.hint} answer={p.correct_answer} />
    </article>)}</div>{!visible.length && <div className="empty-panel">Няма задачи по избраните критерии.</div>}</>}
  </section>
}
