// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import LevelPage from './LevelPage'
import CreateProblemPage from './CreateProblemPage'
import MathText from '../components/MathText'
import { request } from '../services/api'

vi.mock('../services/api', () => ({ request: vi.fn() }))

const level = {
  id: 10, theme_id: 1, title: 'Monomials', is_unlocked: true,
  // This aggregate must not be used for the current theory's practice.
  problems: [{ id: 999, question: 'Unrelated aggregate problem' }],
  theories: [
    { id: 101, level_id: 10, title: 'First theory', content: 'First explanation',
      example_problems: [{ id: 1, question: 'Worked example', solution: 'Worked solution' }],
      problems: [{ id: 11, question: 'First practice' }] },
    { id: 102, level_id: 10, title: 'Second theory', content: 'Second explanation',
      example_problems: [], problems: [{ id: 12, question: 'Second practice' }] },
  ],
}

const context = (role = 'student') => ({
  token: 'test-token', refresh: vi.fn().mockResolvedValue(undefined),
  user: { role, teacher: { classes: [{ id: 5, name: 'Class A' }] } },
  themes: [{ id: 1, title: 'Expressions', levels: [level,
    { id: 20, title: 'Empty level', theories: [] }] }],
})

function mountLesson(data = context()) {
  return render(<MemoryRouter initialEntries={['/levels/10']}>
    <Routes><Route element={<Outlet context={data} />}>
      <Route path="/levels/:levelId" element={<LevelPage />} />
    </Route></Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(async (_token, path) => {
    if (path === '/levels/10') return structuredClone(level)
    if (path === '/problems/history/me') return []
    if (path.endsWith('/my-result')) return { already_solved: true, remaining_attempts: 2 }
    if (path.endsWith('/summary')) return { is_completed: true, solved_problems: 2, total_problems: 2 }
    throw new Error(`Unexpected request: ${path}`)
  })
})
afterEach(cleanup)

test('restart is hidden on first theory and shown on first example', async () => {
  mountLesson()
  await screen.findByText('First explanation')
  expect(screen.queryByText('Преглед от началото')).toBeNull()
  fireEvent.click(screen.getByText('Разбрах, покажи ми пример →'))
  expect(screen.getByText('Преглед от началото')).toBeTruthy()
  fireEvent.click(screen.getByText('Преглед от началото'))
  expect(screen.queryByText('Преглед от началото')).toBeNull()
})

function withHistory(history, content = level) {
  const original = request.getMockImplementation()
  request.mockImplementation((token, path, options) => {
    if (path === '/problems/history/me') return Promise.resolve(history)
    if (path === '/levels/10') return Promise.resolve(structuredClone(content))
    return original(token, path, options)
  })
}

test('returning student resumes a partially attempted task', async () => {
  withHistory([{ problem_id: 11, is_solved: false, attempts_used: 1, max_attempts: 3 }])
  mountLesson()
  await screen.findByText('First practice')
  expect(screen.queryByText('First explanation')).toBeNull()
  fireEvent.click(screen.getByText('Преглед от началото'))
  expect(screen.getByText('First explanation')).toBeTruthy()
})

test.each([true, false])('resume skips finished tasks including exhausted attempts (solved=%s)', async is_solved => {
  const content = structuredClone(level)
  content.theories[0].problems.push({ id: 13, question: 'Next practice' })
  withHistory([{ problem_id: 11, is_solved, attempts_used: 3, max_attempts: 3 }], content)
  mountLesson()
  await screen.findByText('Next practice')
  expect(screen.queryByText('First practice')).toBeNull()
})

test('resume preserves the theory of a block with no attempted tasks', async () => {
  withHistory([{ problem_id: 11, is_solved: true, attempts_used: 1, max_attempts: 3 }])
  mountLesson()
  await screen.findByText('Second explanation')
  expect(screen.queryByText('First explanation')).toBeNull()
})

test('finished level opens its result and unrelated history does not skip content', async () => {
  withHistory([11, 12].map(problem_id => ({ problem_id, is_solved: false, attempts_used: 3, max_attempts: 3 })))
  const view = mountLesson()
  await screen.findByText('★ Нивото е завършено!')
  view.unmount()
  withHistory([{ problem_id: 999, is_solved: true, attempts_used: 1, max_attempts: 3 }])
  mountLesson()
  await screen.findByText('First explanation')
})

test('history failure can be retried without resetting progress to the beginning', async () => {
  const original = request.getMockImplementation()
  let tries = 0
  request.mockImplementation((token, path, options) => {
    if (path !== '/problems/history/me') return original(token, path, options)
    if (++tries === 1) return Promise.reject(new Error('Temporary failure'))
    return Promise.resolve([{ problem_id: 11, is_solved: false, attempts_used: 1, max_attempts: 3 }])
  })
  mountLesson()
  fireEvent.click(await screen.findByRole('button', { name: 'Опитай отново' }))
  await screen.findByText('First practice')
})

test('teacher can load theories from the level even when theme summary has none', async () => {
  const data = context('teacher')
  data.themes[0].levels[0] = { id: 10, title: 'Monomials' }
  render(<MemoryRouter><Routes><Route element={<Outlet context={data} />}><Route path="/" element={<CreateProblemPage />} /></Route></Routes></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Ниво'), {target:{value:'10'}})
  await screen.findByRole('option', {name:'First theory'})
  fireEvent.change(screen.getByLabelText('Теория'), {target:{value:'101'}})
  expect(screen.getByLabelText('Теория').value).toBe('101')
  expect(screen.getByText('Създай задача').disabled).toBe(false)
})

test('each theory is followed by its examples and own practice before the next theory', async () => {
  mountLesson()
  await screen.findByText('First explanation')
  fireEvent.click(screen.getByText('Разбрах, покажи ми пример →'))
  fireEvent.click(screen.getByText('Покажи решението'))
  expect(screen.getByText('Worked solution')).toBeTruthy()
  fireEvent.click(screen.getByText('Продължи →'))
  await screen.findByText('First practice')
  expect(screen.queryByText('Second practice')).toBeNull()
  expect(screen.queryByText('Unrelated aggregate problem')).toBeNull()
  fireEvent.click(await screen.findByText('Продължи →'))
  expect(screen.getByText('Second explanation')).toBeTruthy()
  fireEvent.click(screen.getByText('Към задачите →'))
  await screen.findByText('Second practice')
  fireEvent.click(await screen.findByText('Продължи →'))
  await screen.findByText('★ Нивото е завършено!')
})

test('teacher can finish all blocks without requesting student results or summary', async () => {
  mountLesson(context('teacher'))
  await screen.findByText('First explanation')
  fireEvent.click(screen.getByText('Разбрах, покажи ми пример →'))
  fireEvent.click(screen.getByText('Покажи решението'))
  fireEvent.click(screen.getByText('Продължи →'))
  fireEvent.click(screen.getByText('Продължи →'))
  fireEvent.click(screen.getByText('Към задачите →'))
  fireEvent.click(screen.getByText('Продължи →'))
  expect(screen.getByText('Край на прегледа')).toBeTruthy()
  expect(request.mock.calls.every(([, path]) => path === '/levels/10')).toBe(true)
})

test('empty theory practice continues to the next block and locked content stays hidden', async () => {
  const empty = structuredClone(level)
  empty.theories[0].example_problems = []
  empty.theories[0].problems = []
  request.mockResolvedValueOnce(empty)
  const view = mountLesson()
  await screen.findByText('First explanation')
  fireEvent.click(screen.getByText('Към задачите →'))
  expect(screen.getByText('Все още няма задачи към тази теория.')).toBeTruthy()
  fireEvent.click(screen.getByText('Продължи →'))
  expect(screen.getByText('Second explanation')).toBeTruthy()
  view.unmount()
  request.mockResolvedValueOnce({ ...level, is_unlocked: false })
  mountLesson()
  await screen.findByText('Това ниво е заключено.')
  expect(screen.queryByText('First explanation')).toBeNull()
})

test('teacher creation sends matching theory/level IDs and resets theory when level changes', async () => {
  const data = context('teacher')
  request.mockImplementation(async (_token, path, options) => options?.method === 'POST' ? { id: 77 } : path === '/levels/10' ? structuredClone(level) : { id: 20, theories: [] })
  render(<MemoryRouter initialEntries={['/new']}><Routes>
    <Route element={<Outlet context={data} />}>
      <Route path="/new" element={<CreateProblemPage />} />
      <Route path="/teacher/problems" element={<p>Created destination</p>} />
    </Route>
  </Routes></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Ниво'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Теория'), { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText('Ниво'), { target: { value: '20' } })
  expect(screen.getByLabelText('Теория').value).toBe('')
  expect(screen.getByText('Създай задача').disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Ниво'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Теория'), { target: { value: '102' } })
  fireEvent.change(screen.getByLabelText('Условие'), { target: { value: 'Question' } })
  fireEvent.change(screen.getByLabelText('Верен отговор (до 30 символа)'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Обяснение'), { target: { value: 'Explanation' } })
  fireEvent.submit(screen.getByText('Създай задача').closest('form'))
  expect(screen.getByText('Избери поне един клас.')).toBeTruthy()
  expect(request.mock.calls.filter(call => call[2]?.method === 'POST')).toHaveLength(0)
  fireEvent.click(screen.getByLabelText('Class A'))
  fireEvent.submit(screen.getByText('Създай задача').closest('form'))
  await waitFor(() => expect(request.mock.calls.filter(call => call[2]?.method === 'POST')).toHaveLength(1))
  const payload = JSON.parse(request.mock.calls.find(call => call[2]?.method === 'POST')[2].body)
  expect(payload).toMatchObject({ level_id: 10, theory_id: 102, class_ids: [5], max_attempts: 3 })
  await screen.findByText('Created destination')
})

test('renders admin LaTeX, legacy powers and text safely, including malformed formulas', () => {
  const { container } = render(<MathText text={String.raw`Text <img src=x onerror=alert(1)> \(\frac{x^2}{3}\) and x^3
\[\sqrt{4}\] broken \(\frac{\)`} />)
  expect(container.querySelectorAll('.katex').length).toBe(2)
  expect(container.querySelector('.katex-error')).toBeTruthy()
  expect(container.querySelector('sup').textContent).toBe('3')
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
})

test('renders MathLive displaylines as separate rows with nested powers and fractions', () => {
  const { container } = render(<MathText text={String.raw`Извършете действията:
\(\displaylines{а)(3x-y)(x+4y);\\ б)(-x+2)(x^{2}-2x)}\)
\(\displaylines{(3x-y)(x+4y)\\ =3x^2+12xy-xy-4y^2\\ =3x^2+11xy-4y^2\\ \frac{x^{2}+1}{\sqrt{4}}}\)`} />)
  expect(container.querySelectorAll('.katex').length).toBe(2)
  expect(container.querySelectorAll('.mtable').length).toBe(2)
  expect(container.querySelector('.katex-error')).toBeNull()
  for (const formula of container.querySelectorAll('.katex-html')) {
    expect(formula.textContent).not.toContain('displaylines')
  }
})

test('renders a saved power with an empty duplicate superscript from the editor', () => {
  const { container } = render(<MathText text={String.raw`\(3.x^{\left(1+1\right)}.y^{\left(1+2\right)}^{}\;.\;z\)`} />)
  expect(container.querySelector('.katex-error')).toBeNull()
  expect(container.querySelector('.katex')).toBeTruthy()
  expect(container.querySelector('annotation').textContent).toBe(String.raw`3.x^{\left(1+1\right)}.y^{\left(1+2\right)}\;.\;z`)
})

test('theory loading failure allows retry without changing the selected level', async () => {
  const data = context('teacher')
  data.themes[0].levels[0] = { id: 10, title: 'Monomials' }
  let tries = 0
  request.mockImplementation(async () => { if (++tries === 1) throw new Error('Temporary failure'); return structuredClone(level) })
  render(<MemoryRouter><Routes><Route element={<Outlet context={data} />}><Route path="/" element={<CreateProblemPage />} /></Route></Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', {name:'Зареди отново'}))
  await screen.findByRole('option', {name:'First theory'})
  fireEvent.change(screen.getByLabelText('Теория'), {target:{value:'101'}})
  expect(screen.getByLabelText('Теория').value).toBe('101')
})
