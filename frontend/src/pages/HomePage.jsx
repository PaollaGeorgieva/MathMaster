import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import StudyDashboard from '../components/StudyDashboard'
import MathGarden from '../components/MathGarden'
import LearningArt from '../components/LearningArt'
import TeacherOverview from '../components/TeacherOverview'

export default function HomePage() {
  const context = useOutletContext()
  return context.user.role === 'teacher' ? <TeacherHome {...context} /> : <StudentHome {...context} />
}

function StudentHome(props) { return <StudyDashboard {...props} /> }

function TeacherHome({ user, themes, token }) {
  const classes = user.teacher?.classes ?? []
  const [selected, setSelected] = useState('')
  const classId = classes.find(item => String(item.id) === selected)?.id ?? classes[0]?.id
  return <section className="teacher-studio">
    <header className="study-heading"><p className="adventure-eyebrow">УЧИТЕЛСКИ ПРОФИЛ</p>
      <h1>Здравей, <em>{user.teacher?.first_name || 'учителю'}.</em></h1><p>Преглед на класовете и резултатите по теми.</p>
    </header>
    <div className="teacher-launchpad"><section className="study-feature"><div><span className="feature-pill">ПРОСТРАНСТВО ЗА ТВОИТЕ ИДЕИ</span><h2>Вдъхнови следващото<br/>„Разбрах!“</h2><p>Задачи и решения, готови за твоя урок.</p><Link className="study-button" to="/teacher/library">Към библиотеката →</Link></div><LearningArt kind="books" /></section><div className="teacher-shortcuts"><Link to="/teacher/problems/new"><span>＋</span><strong>Нова задача</strong><small>За твоите ученици →</small></Link><Link to="/class"><span>♧</span><strong>{classes.length} класа</strong><small>Управление на класовете →</small></Link></div></div>
    {classes.length ? <>
      <div className="overview-heading"><h2>Резултати на класа</h2><label>Клас<select aria-label="Клас" value={classId} onChange={e => setSelected(e.target.value)}>
        {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label></div>
      <TeacherOverview key={classId} token={token} classId={classId} themes={themes} />
    </> : <div className="discovery-hero"><div className="hero-copy"><h2>Първият клас.<br />Много възможности.</h2><p>Създай клас и сподели кода с учениците. Техният напредък ще се появи тук.</p><Link className="adventure-primary page-action" to="/class">Създай клас ↗</Link></div><MathGarden /></div>}
  </section>
}

export function WorldsPage() {
  const { themes, user } = useOutletContext()
  return <section className="topics-page"><div className="topics-intro"><div className="discovery-heading"><p className="adventure-eyebrow">МАТЕМАТИКА · 7. КЛАС</p><h1>Твоят път през<br /><em>математиката.</em></h1><p>Избери тема. Всяка стъпка е ново умение.</p></div><MathGarden /></div>
    {themes.length > 0 && <div className="trail-key"><span><i className="key-current" />Достъпна тема</span><span><i className="key-complete" />Завършена</span><span>{themes.length} теми · {themes.reduce((sum, theme) => sum + theme.total_levels, 0)} нива</span></div>}
    {!themes.length && <p className="adventure-notice">Все още няма добавени теми.</p>}
    <ol className="topic-trail">{themes.map((theme, index) => {
      const available = user.role === 'teacher' || theme.is_unlocked
      return <li className={`topic-step topic-color-${index % 3} ${theme.is_completed ? 'is-complete' : available ? 'is-available' : 'is-locked'}`} key={theme.id}>
        {index < themes.length - 1 && <svg className="topic-connector" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><path d="M12 0C12 55 188 45 188 100" /></svg>}
        <Link to={`/themes/${theme.id}`} className="topic-step-link">
          <span className="topic-step-stone" aria-hidden="true"><span>{theme.is_completed ? '✓' : ['x²', 'x = ?', '△'][index % 3]}</span><small>{String(index + 1).padStart(2, '0')}</small></span>
          <span className="topic-step-copy"><span className="chapter-label">ТЕМА {index + 1} · {theme.is_completed ? 'ЗАВЪРШЕНА' : available ? 'ДОСТЪПНА' : 'ЗАКЛЮЧЕНА'}</span>
            <h2>{theme.title.replace(/ · 7$/, '')}</h2>
            <span>{user.role === 'teacher' ? `${theme.total_levels} нива · Преглед на съдържанието` : `${theme.completed_levels} от ${theme.total_levels} нива`}</span>
            {user.role === 'student' && <progress value={theme.completed_levels} max={theme.total_levels || 1} aria-label={`${theme.completed_levels} от ${theme.total_levels} нива`} />}
          </span>
          <span className="topic-step-arrow" aria-hidden="true">{available ? '→' : <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>}</span>
        </Link>
      </li>
    })}</ol>
  </section>
}
