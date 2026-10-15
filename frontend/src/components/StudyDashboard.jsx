import { Link } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from './ResourceState'
import LearningArt from './LearningArt'

const badgeNames = { first_problem: 'Първа победа', no_hint_problem: 'Без подсказка', first_level: 'Ниво напред', test_star: 'Звезда на теста' }
export default function StudyDashboard({ user, themes, token, statistics = false }) {
  const resource = useResource(token, '/users/me/progress')
  const history = useResource(token, '/problems/history/me')
  const hasStarted = history.data?.some(item => item.attempts_used > 0)
  const data = resource.data
  const levels = themes.flatMap(t => t.levels ?? [])
  const next = levels.find(l => l.is_unlocked && !l.is_completed)
  const total = themes.reduce((s,t) => s+t.total_levels,0)
  const completed = themes.reduce((s,t) => s+t.completed_levels,0)
  const percent = total ? Math.round(completed/total*100) : 0
  return <section className="study-dashboard">
    <header className="study-heading"><div><span>ТВОЕТО МЯСТО ЗА ОТКРИТИЯ</span><h1>{statistics ? 'Малките стъпки. Големият напредък.' : `Здравей, ${user.student?.first_name || 'изследователю'}!`}</h1><p>{statistics ? 'Виж как растат твоите знания.' : 'Готов ли си за още едно „Разбрах!“?'}</p></div><Link to="/profile" className="study-avatar">{(user.student?.first_name || 'М').slice(0,1)}</Link></header>
    <ResourceState resource={resource} />
    <div className="study-layout"><div className="study-primary">
      <section className="study-feature"><div><span className="feature-pill">✦ УЧИ СЪС СВОЕТО ТЕМПО</span><h2>{statistics ? 'Всяка задача е\nкрачка напред.' : 'Математиката\nможе да е приключение.'}</h2><p>{next ? `Следваща спирка: ${next.title}` : 'Нова идея, малко практика и още увереност.'}</p><Link className="study-button" to={next ? `/levels/${next.id}` : '/topics'}>{!next ? 'Разгледай темите' : !history.data ? 'Към урока' : hasStarted ? 'Продължи своето приключение' : 'Започни своето приключение'} <span>→</span></Link></div><LearningArt kind={statistics ? 'trophy' : 'books'} /></section>
      {data && <div className="study-metrics">{[['✦',data.points,'точки','lavender'],['✓',data.solved_problems,'решени задачи','mint'],['⚑',data.tests_completed,'предадени тестове','peach']].map(([icon,value,label,color]) => <div className={`study-metric ${color}`} key={label}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>)}</div>}
      <section><div className="study-section-title"><h2>{statistics ? 'Напредък по теми' : 'Твоите учебни теми'}</h2><Link to="/topics">Всички теми ↗</Link></div><div className="study-courses">{themes.map((t,i) => <Link key={t.id} to={`/themes/${t.id}`} className={`study-course course-${i%3}`}><div className="course-art"><span className="course-label">ТЕМА {String(i+1).padStart(2,'0')}</span><LearningArt kind={i%2 ? 'geometry' : 'books'} /></div><div className="course-body"><h3>{t.title.replace(/ · 7$/,'')}</h3><p>{t.completed_levels} / {t.total_levels} нива завършени</p><div className="course-progress"><progress value={t.progress_percentage} max="100" aria-label={t.title}/><span>{t.progress_percentage}%</span></div></div></Link>)}</div></section>
      <section className="study-breakdown"><div className="study-section-title"><h2>Твоят учебен път</h2><span>Ниво по ниво</span></div><div className="study-road">{levels.map((l,i) => <Link key={l.id} to={l.is_unlocked ? `/levels/${l.id}` : '/topics'} className={l.is_completed ? 'complete' : l.is_unlocked ? 'current' : ''}><span>{l.is_completed ? '✓' : i+1}</span><div><strong>{l.title}</strong><small>{l.is_completed ? 'Завършено' : l.is_unlocked ? 'Готово за откриване' : 'Предстои'}</small></div><b>→</b></Link>)}</div></section>
    </div><aside className="study-side">
      <section className="study-report"><div className="study-section-title"><h2>Твоят прогрес</h2><span>↗</span></div><div className="study-rings" role="img" aria-label={`${percent}% от нивата завършени`} style={{'--course-progress':`${percent}%`}}><div><div><strong>{percent}<small>%</small></strong><span>завършени учебни нива</span></div></div></div><div className="ring-legend"><span><i/>Учебни нива</span><strong>{completed}/{total}</strong><span><i/>Ниво</span><strong>{data?.level ?? '—'}</strong></div>{data && <div className="next-level-note"><progress value={data.level_progress_percentage} max="100" aria-label="Точки до следващото ниво" />Още <strong>{data.points_for_next_level} точки</strong><br/>до следващото ниво</div>}</section>
      <section className="study-achievements"><div className="study-section-title"><h2>Моите награди</h2><span>★ {data?.badges.length ?? 0}</span></div><div className="study-badges">{Object.entries(badgeNames).map(([code,label],i) => {const earned=data?.badges.some(b=>b.code===code);return <div key={code} className={earned?'earned':''}><span>{['✦','ϟ','⚑','★'][i]}</span><strong>{label}</strong><small>{earned?'Спечелена':'Предстои'}</small></div>})}</div></section>
      <section className="study-motivation"><LearningArt kind="trophy"/><h3>Твоят следващ успех<br/>започва с една задача.</h3><Link to={next ? `/levels/${next.id}` : '/topics'}>Да опитаме →</Link></section>
    </aside></div>
  </section>
}
