import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router'

import LoginPage from './pages/LoginPage'
import HomePage, { WorldsPage } from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import AdventureLayout from './components/AdventureLayout'
import ThemePage from './pages/ThemePage'
import LevelPage from './pages/LevelPage'
import ThemeTestPage from './pages/ThemeTestPage'
import ClassPage from './pages/ClassPage'
import ProgressPage from './pages/ProgressPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import StudentProgressPage from './pages/StudentProgressPage'
import TeacherProblemsPage from './pages/TeacherProblemsPage'
import CreateProblemPage from './pages/CreateProblemPage'
import TestLibraryPage from './pages/TestLibraryPage'
import ProblemLibraryPage from './pages/ProblemLibraryPage'
import { readSession, saveSession, clearSession } from './services/session'

function App() {
  const [token, setToken] = useState(readSession)

  function handleLogin(accessToken) {
    saveSession(accessToken)
    setToken(accessToken)
  }

  function handleLogout() {
    clearSession()
    setToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/register"
          element={
            token
              ? <Navigate to="/" replace />
              : <RegisterPage onLogin={handleLogin} />
          }
        />

        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/" replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        <Route
          element={
            token
              ? <AdventureLayout token={token} onLogout={handleLogout} />
              : <Navigate to="/login" replace />
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/worlds" element={<WorldsPage />} />
          <Route path="/topics" element={<WorldsPage />} />
          <Route path="/class" element={<ClassPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/students/:studentId/progress" element={<StudentProgressPage />} />
          <Route path="/teacher/problems" element={<TeacherProblemsPage />} />
          <Route path="/teacher/problems/new" element={<CreateProblemPage />} />
          <Route path="/library/tests" element={<TestLibraryPage />} />
          <Route path="/teacher/library" element={<ProblemLibraryPage />} />
          <Route path="/themes/:themeId" element={<ThemePage />} />
          <Route path="/levels/:levelId" element={<LevelPage />} />
          <Route path="/themes/:themeId/test" element={<ThemeTestPage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
