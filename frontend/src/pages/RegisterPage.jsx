import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import loginHero from '../assets/login-hero.jpg'
import '../styles/pages/auth.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function RegisterPage({ onLogin }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email').trim()
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')
    const role = formData.get('role')

    setError('')

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      })

      // Some server errors have no JSON body. Still show a readable message.
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const detail = data?.detail
        let message = 'Unable to create your account. Please try again.'

        if (typeof detail === 'string') {
          message = detail
        } else if (Array.isArray(detail)) {
          message = detail.map((item) => item.msg).join(' ')
        }

        throw new Error(message)
      }

      // Registration creates an account; logging in is a separate request.
      const loginResponse = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    })

    if (!loginResponse.ok) {
      throw new Error(
        'Your account was created, but automatic login failed. Please log in.'
      )
    }

    const loginData = await loginResponse.json()

    if (
      typeof loginData.access_token !== 'string' ||
      !loginData.access_token
    ) {
      throw new Error(
        'Your account was created, but automatic login failed. Please log in.'
      )
    }

    onLogin(loginData.access_token)
    navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Няма връзка със сървъра. Опитай отново.')
      } else {
        setError(err.message || 'Възникна грешка.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-page auth-register">
      <div className="auth-layout">
        <section className="auth-art" aria-label="MathMaster">
          <img className="auth-hero" src={loginHero} alt="MathMaster — математика с малки стъпки" />
        </section>

        <section className="auth-content" aria-labelledby="register-title">
          <div className="auth-card">
            <span className="auth-eyebrow">НАЧАЛО НА НЕЩО ХУБАВО</span>
            <h1 id="register-title">Създай своя профил</h1>
            <p className="auth-description">
              Учи, упражнявай се и откривай какво можеш.
            </p>

            <form className="auth-form" onSubmit={handleSubmit} aria-busy={isLoading}>
              <div className="auth-field">
                <label htmlFor="register-email">Имейл</label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-password">Парола</label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  placeholder="Избери парола"
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password">Повтори паролата</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Повтори паролата"
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-role">Аз съм</label>
                <select id="register-role" name="role" defaultValue="student" disabled={isLoading}>
                  <option value="student">Ученик</option>
                  <option value="teacher">Учител</option>
                </select>
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button className="auth-submit" type="submit" disabled={isLoading}>
                {isLoading ? 'Създаване…' : 'Създай профил'}
              </button>
            </form>

            <p className="auth-switch">
              Вече имаш профил? <Link to="/login">Влез</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default RegisterPage
