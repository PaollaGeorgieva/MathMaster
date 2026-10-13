import { Link, NavLink, Navigate, useOutletContext } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import '../styles/pages/progress.css'

const awards = [
  ['first_problem', '✦', 'Първа победа', 'Реши първата си задача.'],
  ['no_hint_problem', 'ϟ', 'Самостоятелно', 'Реши задача без подсказка.'],
  ['first_level', '⚑', 'Ниво напред', 'Завърши учебно ниво.'],
  ['test_star', '★', 'Звезда на теста', 'Достигни прага за награда в тест.'],
]
export default function ProgressPage() {
  const context = useOutletContext()
  return context.user.role === 'student' ? <ProgressOverview {...context} /> : <Navigate to="/class" replace />
}
function ProgressOverview({ token, themes }) {
  const resource = useResource(token, '/users/me/progress')
  const tests = useResource(token, '/tests/history')
  const data = resource.data
  const completed = themes.reduce((sum, theme) => sum + theme.completed_levels, 0)
  const total = themes.reduce((sum, theme) => sum + theme.total_levels, 0)
  const results = [...(tests.data ?? [])].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  return <section className="progress-overview">
    <header className="study-heading"><div><span>ВСЯКА СТЪПКА СЕ БРОИ</span><h1>Моят прогрес</h1><p>Твоите знания, резултати и спечелени награди.</p></div><Link className="quiet-button" to="/history">История на опитите ↗</Link></header>
    <ResourceState resource={resource} />
    {data && <div className="progress-totals">{[['✦', data.points, 'събрани точки'], ['✓', data.solved_problems, 'решени задачи'], ['⚑', `${completed} / ${total}`, 'завършени нива'], ['▤', data.tests_completed, 'предадени тестове']].map(([icon, value, label], i) => <div className={`progress-total tone-${i}`} key={label}><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>)}</div>}
    <div className="progress-columns">
      <section className="progress-panel"><div className="study-section-title"><h2>Знания по теми</h2><span>{completed} завършени нива</span></div><p className="progress-caption">Напредъкът включва нивата и теста към всяка тема.</p>
        {themes.length === 0 && <p>Твоите теми ще се появят тук.</p>}
        {themes.map((theme, index) => <div className={`theme-statistic tone-${index % 4}`} key={theme.id}><span className="theme-statistic-number">{String(index + 1).padStart(2, '0')}</span><div><div className="theme-statistic-title"><h3>{theme.title.replace(/ · 7$/, '')}</h3><strong>{theme.progress_percentage}%</strong></div><progress value={theme.progress_percentage} max="100" aria-label={`Напредък: ${theme.title}`} /><div className="theme-statistic-meta"><span>{theme.completed_levels} от {theme.total_levels} нива</span><span>{theme.test_submitted ? `Тест: ${theme.test_percentage}%` : 'Тестът предстои'}</span></div></div></div>)}
      </section>
      {data && <section className="progress-level"><span className="progress-level-star">✦</span><span>ТВОЕТО НИВО</span><strong>{data.level}</strong><h2>{data.rank || 'Продължавай напред!'}</h2><progress value={data.level_progress_percentage} max="100" aria-label="До следващото ниво" /><p>Още <b>{data.points_for_next_level} точки</b> до следващото ниво.</p></section>}
      <section className="progress-panel"><div className="study-section-title"><h2>Резултати от тестове</h2><span>Последни предавания</span></div><ResourceState resource={tests} />
        {tests.data?.length === 0 && <div className="progress-empty"><span>▤</span><h3>Първият резултат предстои</h3><p>Завърши нивата в тема, за да стигнеш до нейния тест.</p><Link to="/topics">Към учебните теми →</Link></div>}
        {results.slice(0, 5).map(test => <div className="progress-test" key={test.attempt_id}><div className="test-score" style={{ '--score': `${test.percentage}%` }}><strong>{Math.round(test.percentage)}<small>%</small></strong></div><div><h3>{test.test_title}</h3><p>{test.earned_points} / {test.max_points} точки · {new Date(test.submitted_at).toLocaleDateString('bg-BG')}</p></div></div>)}
        {results.length > 5 && <Link to="/history">Всички резултати →</Link>}
      </section>
      {data && <section className="progress-panel"><div className="study-section-title"><h2>Колекция от успехи</h2><span>{data.badges.length} награди</span></div>{awards.map(([code, icon, name, description]) => { const earned = data.badges.some(badge => badge.code === code); return <div className={`progress-award ${earned ? 'earned' : ''}`} key={code}><span>{icon}</span><div><h3>{name}</h3><p>{description}</p></div><small>{earned ? '✓ Спечелена' : 'Предстои'}</small></div> })}</section>}
    </div>
  </section>
}
export function ProgressTabs() { return <nav className="progress-tabs"><NavLink to="/progress">Общ преглед</NavLink><NavLink to="/history">Задачи и тестове</NavLink></nav> }
