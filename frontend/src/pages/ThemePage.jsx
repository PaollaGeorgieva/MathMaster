import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import AdventureMap from '../components/AdventureMap'

export default function ThemePage() {
  const { themes } = useOutletContext()
  const { themeId } = useParams()
  const navigate = useNavigate()
  const world = themes.find(theme => String(theme.id) === themeId)
  return <>
    <Link className="page-back" to="/topics">← Всички теми</Link>
    {world ? <AdventureMap world={world} worldIndex={themes.indexOf(world)} onOpenLevel={(_, level) => navigate(`/levels/${level.id}`)} onOpenTest={() => navigate(`/themes/${world.id}/test`)} />
      : <section className="adventure-notice"><h1>Темата не е намерена</h1><p>Избери тема от началната страница.</p></section>}
  </>
}
