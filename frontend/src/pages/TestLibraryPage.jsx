import { Link, useOutletContext, useSearchParams } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import MathText from '../components/MathText'

export default function TestLibraryPage() {
  const { user, themes, token } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const themeId = params.get('theme') || ''
  const teacher = user.role === 'teacher' || user.is_superuser
  return <section className="library-page">
    <div className="task-page-heading"><div><p className="adventure-eyebrow">ПРОВЕРИ ЗНАНИЯТА</p><h1>Библиотека с тестове</h1><p>{teacher ? 'Разгледай въпросите и верните отговори по теми.' : 'След завършване на нивата можеш да решиш теста на темата.'}</p></div></div>
    {teacher && <nav className="progress-tabs"><Link to="/teacher/library">Задачи</Link><span className="active">Тестове</span></nav>}
    <div className="library-filters"><label>Тема<select value={themeId} onChange={e => setParams(e.target.value ? { theme: e.target.value } : {})}><option value="">Всички теми</option>{themes.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>
    {teacher ? <TeacherTests key={themeId} token={token} themeId={themeId} themes={themes} /> : <StudentTests themes={themes.filter(t => !themeId || String(t.id) === themeId)} />}
  </section>
}

function StudentTests({ themes }) {
  return <div className="library-grid">{themes.map((theme, i) => {
    const unlocked = theme.levels?.length > 0 && theme.levels.every(level => level.is_completed)
    return <article className={`exercise-card tone-${i % 4}`} key={theme.id}>
      <div className="exercise-meta"><span>ТЕСТ ПО ТЕМА</span><span>{theme.test_submitted ? 'Предаден' : !unlocked ? 'Заключен' : theme.has_active_test ? 'Отключен' : 'Предстои'}</span></div>
      <h2>{theme.title}</h2>
      {!unlocked ? <><p>Завърши нивата в темата, за да отключиш теста.</p><Link to={`/themes/${theme.id}`}>Към нивата →</Link></> : theme.has_active_test ? <Link className="adventure-primary page-action" to={`/themes/${theme.id}/test`}>{theme.test_submitted ? 'Виж резултата' : 'Към теста'} →</Link> : <p>Все още няма активен тест.</p>}
    </article>
  })}{!themes.length && <p className="empty-panel">Няма теми по избраните критерии.</p>}</div>
}

function TeacherTests({ token, themeId, themes }) {
  const resource = useResource(token, `/tests/admin${themeId ? `?theme_id=${encodeURIComponent(themeId)}` : ''}`)
  return <><ResourceState resource={resource} />{resource.data && <>
    <p className="task-count">{resource.data.length} теста</p>
    <div className="library-grid">{resource.data.map((test, i) => <article className={`exercise-card tone-${i % 4}`} key={test.id}>
      <div className="exercise-meta"><span>ВЕРСИЯ {test.version}</span><span>{test.is_active ? 'Активен' : 'Неактивен'}</span></div>
      <p className="exercise-theory">{themes.find(t => t.id === test.theme_id)?.title}</p><h2>{test.title}</h2><p>{test.questions.length} въпроса · {test.questions.reduce((sum, q) => sum + q.points, 0)} точки</p>
      <details><summary>Преглед на теста</summary><div className="test-library-questions">{[...test.questions].sort((a, b) => a.order_index - b.order_index).map((question, index) => <section className="test-library-question" key={question.id}>
        <div className="exercise-meta"><span>ВЪПРОС {index + 1}</span><span>{question.points} т.</span></div>
        <h3><MathText text={question.question} /></h3>
        <ul className="test-library-answers">{[...question.answers].sort((a, b) => a.order_index - b.order_index).map(answer => <li key={answer.id} className={answer.is_correct ? 'correct' : ''}><span>{answer.is_correct ? '✓ ' : ''}<MathText text={answer.answer} /></span>{answer.is_correct && <small>Верен отговор</small>}</li>)}</ul>
      </section>)}</div></details>
    </article>)}</div>{!resource.data.length && <div className="empty-panel">Няма тестове по избраните критерии.</div>}
  </>}</>
}
