// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import StudyDashboard from '../components/StudyDashboard'
import TestLibraryPage from './TestLibraryPage'
import { request } from '../services/api'

vi.mock('../services/api', () => ({ request: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

const theme = { id: 1, title: 'Цели изрази', total_levels: 1, completed_levels: 0,
  has_active_test: false, levels: [{ id: 1, title: 'Едночлени', is_unlocked: true, is_completed: false }] }

test.each([0, 1])('dashboard uses attempt history, including incorrect answers (%s attempts)', async attempts => {
  request.mockImplementation(async (_, path) => path === '/problems/history/me'
    ? (attempts ? [{ attempts_used: attempts, is_solved: false }] : [])
    : { points: 0, solved_problems: 0, tests_completed: 0, level: 1, badges: [], level_progress_percentage: 0, points_for_next_level: 100 })
  render(<MemoryRouter><StudyDashboard user={{ student: {} }} themes={[theme]} token="token" /></MemoryRouter>)
  expect(await screen.findByRole('link', { name: attempts ? 'Продължи своето приключение →' : 'Започни своето приключение →' })).toBeTruthy()
})

function mountLibrary(role, themes = [theme]) {
  render(<MemoryRouter><Routes><Route element={<Outlet context={{ token: 'token', user: { role }, themes }} />}>
    <Route path="/" element={<TestLibraryPage />} />
  </Route></Routes></MemoryRouter>)
}

test('student sees locked test without requesting the answer catalog', () => {
  mountLibrary('student')
  expect(screen.getByText('Заключен')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Към теста →' })).toBeNull()
  expect(request).not.toHaveBeenCalled()
})

test('student can open an unlocked test', () => {
  mountLibrary('student', [{ ...theme, has_active_test: true, levels: [{ ...theme.levels[0], is_completed: true }] }])
  expect(screen.getByRole('link', { name: 'Към теста →' }).getAttribute('href')).toBe('/themes/1/test')
})

test('teacher can review questions with correct answers', async () => {
  request.mockResolvedValue([{ id: 4, title: 'Тест 1', theme_id: 1, version: 1, is_active: true,
    questions: [{ id: 5, question: 'Колко е 2 + 2?', order_index: 1, points: 1,
      answers: [{ id: 6, answer: '4', order_index: 1, is_correct: true }] }] }])
  mountLibrary('teacher')
  expect(await screen.findByText('Колко е 2 + 2?')).toBeTruthy()
  expect(screen.getByText('Верен отговор')).toBeTruthy()
  expect(request).toHaveBeenCalledWith('token', '/tests/admin', expect.any(Object))
})
