import { useState } from 'react'
import { Link } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from './ResourceState'

export default function TeacherOverview({ token, classId, themes }) {
  const [selected, setSelected] = useState('')
  const themeId = themes.find(item => String(item.id) === selected)?.id ?? themes[0]?.id
  const students = useResource(token, `/classes/${classId}/students`)
  return <section className="teacher-overview">
    {themeId ? <>
      <label className="overview-theme">Учебна тема
        <select value={themeId} onChange={event => setSelected(event.target.value)}>
          {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
        </select>
      </label>
      <ThemeStatistics key={`${classId}-${themeId}`} token={token} classId={classId} themeId={themeId} />
    </> : <p>Добавените учебни теми ще се появят тук.</p>}
    <div className="section-title"><h2>Лицата зад числата.</h2><span>{students.data?.length ?? '—'} ученици</span></div>
    <ResourceState resource={students} />
    {students.data?.length === 0 && <p className="empty-roster">Класът още е празен. Сподели кода му с учениците.</p>}
    {students.data?.length > 0 && <div className="roster-scroll"><table className="student-roster">
      <caption>Текущо ниво и общ брой точки на учениците</caption>
      <thead><tr><th scope="col">Ученик</th><th scope="col">Ниво</th><th scope="col">Общо точки</th><th scope="col">Напредък</th></tr></thead>
      <tbody>{students.data.map((student, index) => {
        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || `Ученик ${student.id}`
        return <tr key={student.id}><th scope="row"><span className={`roster-avatar tint-${index % 3}`} aria-hidden="true">{name.slice(0, 1)}</span>{name}</th>
          <td><span className="level-medal">{student.level}</span></td><td><strong>{student.points}</strong><span className="point-star" aria-hidden="true"> ✦</span></td>
          <td><Link to={`/students/${student.id}/progress`} aria-label={`Прогрес на ${name}`}>Виж прогреса ↗</Link></td></tr>
      })}</tbody>
    </table></div>}
  </section>
}

function ThemeStatistics({ token, classId, themeId }) {
  const resource = useResource(token, `/classes/${classId}/themes/${themeId}/statistics`)
  const data = resource.data
  const metrics = data ? [
    { label: 'Ученици в класа', value: data.total_students, note: 'Всеки със собствено темпо', color: 'lavender' },
    { label: 'Започнали задачи', value: data.started_students, note: 'Поне един опит по темата', color: 'yellow' },
    { label: 'Предали тест', value: data.completed_students, note: 'Завършили теста на темата', color: 'mint' },
  ] : []
  return <>
    <ResourceState resource={resource} />
    {data && <div className="class-pulse">
      <div className="class-score">
        <div className="score-ring" style={{ '--completion': `${data.completed_students ? data.average_test_percentage : 0}%` }}>
          <span><strong>{data.completed_students ? Math.round(data.average_test_percentage) + '%' : '—'}</strong><small>среден резултат</small></span>
        </div><p>{data.completed_students ? 'От предадените тестове по темата' : 'Все още няма предадени тестове'}</p>
      </div>
      <div className="pulse-bars">{metrics.map(metric => <article className={`pulse-bar ${metric.color}`} key={metric.label}>
        <strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.note}</p>
        <progress value={metric.value} max={Math.max(data.total_students, 1)} aria-label={`${metric.label}: ${metric.value} от ${data.total_students}`} />
      </article>)}</div>
      <div className="pulse-footnote"><span>Верни опити по задачите <strong>{data.started_students ? data.success_rate + '%' : '—'}</strong></span>
        <span>Средно опити на задача <strong>{data.started_students ? data.average_attempts_per_problem : '—'}</strong></span></div>
    </div>}
  </>
}
