import ClassStatistics from '../components/ClassStatistics'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { request } from '../services/api'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function ClassPage() {
  const { token, user, refresh, themes } = useOutletContext()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const teacher = user.role === 'teacher'
  const classId = teacher ? selected ?? user.teacher?.classes[0]?.id : user.student?.class_id
  async function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true); setError('')
    try {
      const result = await request(token, teacher ? '/classes/' : '/classes/join', { method: 'POST', body: JSON.stringify(data) })
      await refresh()
      if (teacher) setSelected(result.id)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function leave() {
    if (!window.confirm('Да напуснеш ли класа?')) return
    setBusy(true); setError('')
    try { await request(token, '/classes/me/membership', { method: 'DELETE' }); await refresh() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section><h1>{teacher ? 'Моите класове' : 'Моят клас'}</h1>{error && <p role="alert" className="feedback">{error}</p>}{teacher && <div className="class-selector">{user.teacher.classes.map(item => <button key={item.id} aria-pressed={classId === item.id} onClick={() => setSelected(item.id)}>{item.name}</button>)}</div>}{(teacher || !classId) && <details className="account-card" open={!classId}><summary>{teacher ? 'Създай нов клас' : 'Присъединяване'}</summary><form onSubmit={submit}><h2>{teacher ? 'Създай клас' : 'Присъедини се към класа си'}</h2><label htmlFor="class-entry">{teacher ? 'Име на класа' : 'Код от учителя'}</label><input id="class-entry" name={teacher ? 'name' : 'class_code'} required /><button disabled={busy} className="adventure-primary">{teacher ? 'Създай' : 'Присъедини се'}</button></form></details>}{classId && <><ClassDetails themes={themes} key={classId} classId={classId} token={token} teacher={teacher} />{!teacher && <button className="quiet-button" disabled={busy} onClick={leave}>Напусни класа</button>}</>}</section>
}

function ClassDetails({ classId, token, teacher, themes }) {
  const info = useResource(token, `/classes/${classId}`)
  const students = useResource(token, `/classes/${classId}/students`)
  return <><ResourceState resource={info} />{info.data && <section className="account-card"><h2>{info.data.name}</h2>{teacher && <p>Код за присъединяване: <strong>{info.data.class_code}</strong></p>}<h3>Ученици</h3><ResourceState resource={students} />{students.data?.length === 0 && <p>Все още няма ученици.</p>}<ul className="class-list">{students.data?.map(student => <li key={student.id}><span>{[student.first_name, student.last_name].filter(Boolean).join(' ') || `Ученик ${student.id}`}</span><span>Ниво {student.level} · {student.points} точки</span>{teacher && <Link to={`/students/${student.id}/progress`}>Виж прогреса →</Link>}</li>)}</ul></section>}{teacher && <><ClassStatistics token={token} classId={classId} themes={themes} /><ClassTestResults token={token} classId={classId} /></>}</>
}

function ClassTestResults({ token, classId }) {
  const resource = useResource(token, `/tests/teacher/classes/${classId}/results`)
  return <section className="account-card"><h2>Резултати от тестове</h2><ResourceState resource={resource} />{resource.data?.length === 0 && <p>Все още няма предадени тестове.</p>}{resource.data?.map(item => <div className="class-test-row" key={item.attempt_id}><div><strong>{[item.student_first_name,item.student_last_name].filter(Boolean).join(' ') || item.student_email}</strong><span>{item.test_title}</span></div><strong>{item.percentage}%</strong><span>{item.earned_points}/{item.max_points} точки</span></div>)}</section>
}
