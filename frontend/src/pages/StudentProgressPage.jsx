import { Link, Navigate, useOutletContext, useParams } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function StudentProgressPage() {
  const { token, user } = useOutletContext()
  const { studentId } = useParams()
  return user.role === 'teacher' ? <Student key={studentId} token={token} studentId={studentId} /> : <Navigate to="/progress" replace />
}
function Student({ token, studentId }) {
  const progress = useResource(token, `/classes/students/${studentId}/progress`)
  const themes = useResource(token, `/classes/students/${studentId}/progress/themes`)
  return <><Link to="/class" className="page-back">← Към класа</Link><header className="study-heading"><div><span>ВСЯКА СТЪПКА ИМА ЗНАЧЕНИЕ</span><h1>Прогрес на ученик</h1><p>Усвоени умения и следващи възможности за практика.</p></div></header><ResourceState resource={progress} />{progress.data && <div className="study-metrics">{[['✦',progress.data.points,'точки','lavender'],['✓',progress.data.solved_problems,'решени задачи','mint'],['⚑',progress.data.tests_completed,'предадени тестове','peach']].map(([icon,value,label,color])=><div className={`study-metric ${color}`} key={label}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>)}</div>}<ResourceState resource={themes} /><section className="study-breakdown"><div className="study-section-title"><h2>Напредък по теми</h2>{progress.data&&<span>Ниво {progress.data.level}</span>}</div>{themes.data?.map(theme => <div className="student-theme-result" key={theme.theme_id}><span className="result-emblem">{theme.is_completed?'✓':'✦'}</span><div><h3>{theme.title}</h3><p>{theme.solved_problems} от {theme.total_problems} задачи</p><progress value={theme.solved_problems} max={theme.total_problems||1} aria-label={theme.title}/></div><strong>{theme.total_problems?Math.round(theme.solved_problems/theme.total_problems*100):0}%</strong></div>)}</section></>
}
