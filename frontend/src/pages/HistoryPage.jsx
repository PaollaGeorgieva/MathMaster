import MathText from '../components/MathText'
import { Link, Navigate, useOutletContext } from 'react-router'
import useResource from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { ProgressTabs } from './ProgressPage'

export default function HistoryPage() {
  const { token, user } = useOutletContext()
  return user.role === 'student' ? <><ProgressTabs /><History token={token} /></> : <Navigate to="/class" replace />
}

function History({ token }) {
  const problems = useResource(token, '/problems/history/me')
  const tests = useResource(token, '/tests/history')
  return <section><p className="adventure-eyebrow">ТВОИТЕ ОТКРИТИЯ ДОТУК</p><h1>История</h1><section className="account-card"><h2>Задачи и опити</h2><ResourceState resource={problems} />{problems.data?.length === 0 && <p>Все още няма решавани задачи.</p>}{problems.data?.map(problem => <details className="history-item" key={problem.problem_id}><summary>{problem.is_solved ? '✓' : '○'} <MathText text={problem.question} /></summary><p>{problem.attempts_used}/{problem.max_attempts} опита · {problem.points_awarded} точки · {problem.hint_used ? 'С подсказка' : 'Без подсказка'}</p><ol>{problem.attempts.map(attempt => <li key={attempt.attempt_number}><MathText text={attempt.submitted_answer} /> — {attempt.is_correct ? 'верен' : 'неверен'} отговор</li>)}</ol>{problem.correct_answer && <p>Верен отговор: <MathText text={problem.correct_answer} /></p>}<p><MathText text={problem.explanation} /></p><Link to={`/levels/${problem.level_id}`}>Към урока →</Link></details>)}</section><section className="account-card"><h2>Тестове</h2><ResourceState resource={tests} />{tests.data?.length === 0 && <p>Все още няма предадени тестове.</p>}{tests.data?.map(test => <div className="progress-row" key={test.attempt_id}><Link to={`/themes/${test.theme_id}/test`}>{test.test_title}</Link><strong>{test.percentage}%</strong><span>{test.earned_points}/{test.max_points} точки · {new Date(test.submitted_at).toLocaleDateString('bg-BG')}</span></div>)}</section></section>
}
