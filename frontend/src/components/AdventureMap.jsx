import { useState } from 'react'
import '../styles/pages/adventure-map.css'

const buddies = [{ name: 'Мимо', color: 'purple' }, { name: 'Луми', color: 'yellow' }, { name: 'Пико', color: 'green' }]

function Buddy({ color }) {
  return <span className={`map-buddy buddy-${color}`} aria-hidden="true"><span>● ●</span><i /></span>
}

function Lock() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.6" /></svg>
}

export default function AdventureMap({ world, worldIndex, onOpenLevel, onOpenTest }) {
  const [buddy, setBuddy] = useState(1)
  if (!world) return <p className="adventure-notice">Темите ще се появят тук, когато бъдат добавени.</p>
  const current = world.levels.find(level => level.is_unlocked && !level.is_completed)
  const levels = world.levels.length ? world.levels : Array.from({ length: world.total_levels }, (_, index) => ({ id: `locked-${index}`, title: `Ниво ${index + 1}`, is_unlocked: false }))
  const steps = [...levels, { id: 'test', title: 'Голямото предизвикателство', is_unlocked: world.has_active_test, is_completed: world.test_submitted }]
  const height = steps.length * 128 + 50
  const positions = steps.map((_, i) => ({ x: i % 2 ? 68 : 28, y: 60 + i * 128 }))
  const path = positions.map((point, i) => {
    if (!i) return `M ${point.x * 6} ${point.y}`
    const before = positions[i - 1]
    return `C ${before.x * 6} ${before.y + 80}, ${point.x * 6} ${point.y - 80}, ${point.x * 6} ${point.y}`
  }).join(' ')
  function openStep(item) {
    if (item.id === 'test') onOpenTest()
    else onOpenLevel(world, item)
  }
  return <section className="game-adventure" aria-label="Карта на приключението">
    <div className={`learning-map landscape-${worldIndex % 3}`}>
      <div className="map-title"><div><p>ТЕМА {String(worldIndex + 1).padStart(2, '0')}</p><h1>{world.title.replace(/ · 7$/, '')}</h1></div><span aria-label={`${world.completed_levels} от ${world.total_levels} нива завършени`}>{world.completed_levels} / {world.total_levels} ✦</span></div>
      {!world.is_unlocked && <p className="map-locked-note">Завърши предишната тема и нейния тест, за да отключиш тази тема.</p>}
      <div className="map-trail" style={{ height }}>
        <svg className="trail-line" viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" aria-hidden="true"><path d={path} /></svg>
        <span className="map-decoration map-star" aria-hidden="true">★</span><span className="map-decoration leaf leaf-one" aria-hidden="true" /><span className="map-decoration leaf leaf-two" aria-hidden="true" />
        <div className="trail-companion" aria-hidden="true" style={{ top: current ? positions[levels.indexOf(current)].y + 45 : 115, left: current && levels.indexOf(current) % 2 === 0 ? '65%' : '13%' }}><Buddy color={buddies[buddy].color} /></div>
        {steps.map((item, index) => {
          const active = current?.id === item.id || (!current && item.id === 'test' && item.is_unlocked && !item.is_completed)
          return <div className={`trail-stop ${item.is_completed ? 'stop-completed' : active ? 'stop-current' : 'stop-locked'}`} key={item.id} style={{ left: `${positions[index].x}%`, top: positions[index].y }}>
            {active && <span className="you-are-here">ТИ СИ ТУК</span>}
            <button disabled={!item.is_unlocked} onClick={() => openStep(item)} aria-label={`${item.title}${item.is_completed ? ' — завършено' : !item.is_unlocked ? ' — заключено' : ''}`} aria-current={active ? 'step' : undefined}>{item.is_completed ? '✓' : item.id === 'test' ? '⚑' : item.is_unlocked ? '▷' : <Lock />}</button>
            <span className="stop-title">{item.title}</span>
          </div>
        })}
      </div>
    </div>
    <div className="map-bottom"><section className="next-step"><span className="next-step-tag">СЛЕДВАЩА СТЪПКА</span><h3>{current?.title ?? (world.is_completed ? 'Темата е завършена!' : world.is_unlocked ? 'Голямото предизвикателство' : 'Нова тема те очаква')}</h3><p>{current?.description ?? (world.is_unlocked ? 'Всяка малка стъпка е голям напредък.' : 'Следвай пътечката и отключвай нови знания.')}</p>{current && <button className="adventure-primary" onClick={() => onOpenLevel(world, current)}>Хайде напред →</button>}</section>
      <fieldset className="buddy-picker"><legend>С кого ще учиш днес?</legend><div>{buddies.map((item, index) => <button key={item.name} aria-pressed={buddy === index} onClick={() => setBuddy(index)}><Buddy color={item.color} /><span>{item.name}</span></button>)}</div><p>Твоят спътник в това приключение.</p></fieldset>
    </div>
  </section>
}
