import { useState } from 'react'
import useResource from '../hooks/useResource'
import ResourceState from './ResourceState'
import MathText from './MathText'

export default function ClassStatistics({ token, classId, themes }) {
  const [selected, setSelected] = useState('')
  const themeId = selected || String(themes[0]?.id || '')
  return <section className="account-card"><div className="study-section-title"><h2>Резултати на класа</h2><span>По теми и задачи</span></div><label>Учебна тема<select value={themeId} onChange={e => setSelected(e.target.value)}>{themes.map(theme => <option key={theme.id} value={theme.id}>{theme.title}</option>)}</select></label>{themeId && <ThemeStatistics key={`${classId}-${themeId}`} token={token} classId={classId} themeId={themeId} theme={themes.find(t => String(t.id) === themeId)} />}</section>
}
function ThemeStatistics({ token, classId, themeId, theme }) {
  const resource = useResource(token, `/classes/${classId}/themes/${themeId}/statistics`)
  const catalog = useResource(token, '/problems/catalog')
  const [problemId, setProblemId] = useState('')
  const levelIds = new Set((theme?.levels ?? []).map(level => level.id))
  const problems = (catalog.data ?? []).filter(p => levelIds.has(p.level_id) && (p.is_official || p.class_assignments?.some(a => a.class_id === classId)))
  const data = resource.data
  const theoryNames = new Map((theme?.levels ?? []).flatMap(level => (level.theories ?? []).map(theory => [theory.id, theory.title])))
  return <><ResourceState resource={resource} />{data && <div className="class-stat-grid">{[[`${data.started_students}/${data.total_students}`, 'започнали темата'], [`${data.completed_students}/${data.total_students}`, 'предали теста'], [`${data.success_rate}%`, 'верни опити по задачите'], [data.completed_students ? `${data.average_test_percentage}%` : '—', 'среден резултат от тест'], [data.average_attempts_per_problem, 'средно опити на задача']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}<h3>Статистика за задача</h3><ResourceState resource={catalog} /><label>Задача<select value={problemId} onChange={e => setProblemId(e.target.value)}><option value="">Избери задача</option>{problems.map(p => <option key={p.id} value={p.id}>{theoryNames.get(p.theory_id) || theme?.levels?.find(level => level.id === p.level_id)?.title} · Задача {p.order_index}</option>)}</select></label>{catalog.data && !problems.length && <p>Няма задачи за този клас в избраната тема.</p>}{problemId && <ProblemStatistics key={problemId} token={token} classId={classId} problem={problems.find(p => String(p.id) === problemId)} />}</>
}
function ProblemStatistics({ token, classId, problem }) {
  const resource = useResource(token, `/classes/${classId}/problems/${problem.id}/statistics`)
  const data = resource.data
  return <><p className="lesson-question"><MathText text={problem.question} /></p><ResourceState resource={resource} />{data && <div className="class-stat-grid">{[[data.attempted_students, 'опитали ученици'], [data.solved_students, 'решили ученици'], [`${data.success_rate}%`, 'успеваемост'], [data.average_attempts, 'средно опити на ученик']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}</>
}
