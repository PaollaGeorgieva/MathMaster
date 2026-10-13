import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import loginHero from '../assets/login-hero.jpg'
import '../styles/pages/auth.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const email = formData.get('email').trim()
    const password = formData.get('password')

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Неуспешно влизане. Опитай отново.'
        )
      }

      if (
        typeof data.access_token !== 'string' ||
        !data.access_token
      ) {
        throw new Error('The server did not return an access token.')
      }

      onLogin(data.access_token)
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
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-art" aria-label="MathMaster">
          <img className="auth-hero" src={loginHero} alt="MathMaster — математика с малки стъпки" />
        </section>

        <section
          className="auth-content"
          aria-labelledby="login-title"
        >
          <div className="auth-card">
            <span className="auth-eyebrow">
              ГОТОВ ЛИ СИ ЗА НОВИ ОТКРИТИЯ?
            </span>

            <h1 id="login-title">Радваме се да те видим!</h1>

            {location.state?.registered && (
              <p className="auth-success" role="status">
                Профилът е създаден. Влез, за да започнеш.
              </p>
            )}



            <form
              className="auth-form"
              onSubmit={handleSubmit}
              aria-busy={isLoading}
            >
              <div className="auth-field">
                <label htmlFor="email">Имейл</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  defaultValue={location.state?.email || ''}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Парола</label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Твоята парола"
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Влизане…' : 'Влез'}
              </button>
            </form>

                 <p className="auth-note">
                    Една задача. Една нова победа.
                </p>
                <p className="auth-switch">
                  Нямаш профил? <Link to="/register">Създай профил</Link>
                </p>

          </div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
