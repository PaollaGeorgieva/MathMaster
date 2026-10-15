import MathText from '../components/MathText'
import SolutionCard from '../components/SolutionCard'
import { useState } from 'react'
import { Link, Navigate, useLocation, useOutletContext } from 'react-router'
import { request } from '../services/api'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function TeacherProblemsPage() {
  const context = useOutletContext()
  return context.user.role === 'teacher' ? <Problems {...context} /> : <Navigate to="/" replace />
}
function Problems({ token, user, themes, refresh }) {
  const resource = useResource(token, '/problems/mine')
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function toggle(problem) {
    setBusy(true); setMessage('')
    try { await request(token, `/problems/${problem.id}/${problem.is_active ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); resource.reload(); await refresh() } catch (err) { setMessage(err.message) } finally { setBusy(false) }
  }
  return <section className="teacher-problems-page"><nav className="progress-tabs"><span className="active">Моите задачи</span><Link to="/teacher/library">Библиотека със задачи</Link></nav><div className="task-page-heading"><div className="dashboard-heading"><p className="adventure-eyebrow">ТВОЯТА КОЛЕКЦИЯ ОТ ИДЕИ</p><h1>Моите задачи</h1><p>Всички създадени от теб задачи, подредени на едно място.</p></div><Link to="/teacher/problems/new" className="adventure-primary page-action">＋ Нова задача</Link></div>{location.state?.created && <p role="status" className="feedback success">Задачата е създадена и зададена на избраните класове.</p>}{location.state?.updated && <p role="status" className="feedback success">Промените са запазени.</p>}{message && <p role="alert" className="feedback">{message}</p>}<ResourceState resource={resource} />{resource.data?.length === 0 && <div className="tasks-empty"><div className="adventure-character character-3" aria-hidden="true"><span className="character-eyes"><i /><i /></span><span className="character-smile" /></div><h2>Тук започва твоята колекция</h2><p>Още няма създадени задачи. Добави първата от „Нова задача“.</p></div>}{resource.data?.length > 0 && <><p className="task-count">{resource.data.length} задачи · {resource.data.filter(problem => problem.is_active).length} активни</p><div className="teacher-task-grid">{resource.data.map((problem, index) => <article className={`teacher-task tone-${index % 4}`} key={problem.id}><div className="task-meta"><span>ЗАДАЧА {String(index + 1).padStart(2, '0')}</span><span className="task-status">{problem.is_active ? '● Активна' : '○ Скрита'}</span></div><h2><MathText text={problem.question} /></h2><p className="task-level-name">{themes.flatMap(theme => theme.levels).find(level => level.id === problem.level_id)?.title || 'Учебна задача'}</p><div className="task-classes">{problem.class_assignments.map(assignment => <span key={assignment.class_id}>{user.teacher.classes.find(item => item.id === assignment.class_id)?.name || assignment.class_id}</span>)}</div><SolutionCard explanation={problem.explanation} answer={problem.correct_answer} hint={problem.hint} /><Link className="quiet-button" to={`/teacher/problems/${problem.id}/edit`}>Редактирай</Link><button className="quiet-button" disabled={busy} onClick={() => toggle(problem)}>{problem.is_active ? 'Скрий задачата' : 'Активирай задачата'}</button></article>)}</div></>}</section>
}
