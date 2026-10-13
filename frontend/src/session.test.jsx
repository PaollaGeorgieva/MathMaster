// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./pages/LoginPage', () => ({
  default: ({ onLogin }) => <button onClick={() => onLogin('test-session')}>Test login</button>,
}))
vi.mock('./components/AdventureLayout', () => ({
  default: ({ token, onLogout }) => <><p>Session: {token}</p><button onClick={onLogout}>Test logout</button></>,
}))

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})
afterEach(cleanup)

test('keeps the user signed in after the application remounts', () => {
  const first = render(<App />)
  fireEvent.click(screen.getByText('Test login'))
  expect(screen.getByText('Session: test-session')).toBeTruthy()
  first.unmount()
  render(<App />)
  expect(screen.getByText('Session: test-session')).toBeTruthy()
  expect(screen.queryByText('Test login')).toBeNull()
})

test('explicit logout clears both the current and restored session', () => {
  const first = render(<App />)
  fireEvent.click(screen.getByText('Test login'))
  fireEvent.click(screen.getByText('Test logout'))
  expect(screen.getByText('Test login')).toBeTruthy()
  first.unmount()
  render(<App />)
  expect(screen.getByText('Test login')).toBeTruthy()
})
