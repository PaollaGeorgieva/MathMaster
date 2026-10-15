import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import '../styles/app-shell.css'
import '../styles/pages/topic-path.css'
import { request } from '../services/api'



export default function AdventureLayout({ token, onLogout }) {
  const [themes, setThemes] = useState([])
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [data, profile] = await Promise.all([
          request(token, '/themes/', { signal: controller.signal }),
          request(token, '/users/me', { signal: controller.signal }),
        ])
        if (!Array.isArray(data)) throw new Error('Невалидни данни от сървъра.')
        setThemes(data)
        setUser(profile)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        if (err.status === 401) { setStatus('expired'); return }
        setError(err instanceof TypeError ? 'Няма връзка със сървъра. Провери дали бекендът работи.' : err.message)
        setStatus('error')
      }
    }
    load()
    return () => controller.abort()
  }, [token, retry])
  async function refresh() {
    const [data, profile] = await Promise.all([request(token, '/themes/'), request(token, '/users/me')])
    setThemes(data)
    setUser(profile)
  }
  const teacher = user?.role === 'teacher'
  const name = user?.student?.first_name || user?.teacher?.first_name || (teacher ? 'Учител' : 'Изследовател')
  const links = [['/', '⌂', 'Начало'], ['/topics', '▦', 'Учебни теми'], ...(teacher ? [['/teacher/library','▤','Библиотека'], ['/teacher/problems','✎','Моите задачи']] : [['/library/tests','▤','Тестове'], ['/progress','◔','Моят прогрес'], ['/history','◷','История']]), ['/class','♧',teacher ? 'Моите класове' : 'Моят клас'], ['/profile','⚙','Моят профил']]
  return <div className="app-frame">
    <aside className={'app-sidebar ' + (menuOpen ? 'open' : '')}>
      <Link className="app-brand" to="/"><span>m<span>✦</span></span><strong>MathMaster<small>МАЛКИ СТЪПКИ. ГОЛЕМИ ИДЕИ.</small></strong></Link>
      <p className="sidebar-caption">{teacher ? 'УЧИТЕЛСКА СТАЯ' : 'ТВОЕТО ПРИКЛЮЧЕНИЕ'}</p>
      <nav aria-label="Главна навигация" id="main-navigation">{links.map(([to,icon,label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}><span aria-hidden="true">{icon}</span>{label}<i /></NavLink>)}</nav>
      <div className="sidebar-inspiration"><span>✧</span><strong>Големите открития<br/>започват с любопитство.</strong><p>Днес е добър ден да научиш нещо ново.</p></div>
      <button className="sidebar-logout" onClick={onLogout}>↪ Изход</button>
    </aside>
    <div className="app-content"><header className="app-topbar"><button className="app-menu-button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>☰</button><span className="topbar-course">Математика <b>7. клас</b></span><div className="topbar-profile"><span>{name}<small>{teacher ? 'Учителски профил' : 'Ученически профил'}</small></span><Link aria-label="Моят профил" to="/profile">{name.slice(0,1)}</Link></div></header>
      <main className="app-main">
        {status === 'loading' && <p className="adventure-notice" role="status">Зареждане…</p>}
        {status === 'expired' && <div className="adventure-notice" role="alert"><p>Сесията е изтекла. Влез отново.</p><button className="adventure-primary" onClick={onLogout}>Към входа</button></div>}
        {status === 'error' && <div className="adventure-notice" role="alert"><p>{error}</p><button className="adventure-primary" onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Опитай отново</button></div>}
        {status === 'ready' && <Outlet context={{ themes, user, token, refresh }} />}
      </main>
    </div>
  </div>
}
