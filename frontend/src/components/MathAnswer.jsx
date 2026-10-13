import { useEffect, useRef, useState } from 'react'
import 'mathlive/fonts.css'
import './MathAnswer.css'

import { answerText } from '../services/mathAnswer'
export default function MathAnswer({ value, onChange, disabled, label = 'Твоят отговор' }) {
  const host = useRef(null)
  const field = useRef(null)
  const latest = useRef({ value, onChange, disabled })
  const [ready, setReady] = useState(false)
  useEffect(() => { latest.current = { value, onChange, disabled } }, [value, onChange, disabled])
  useEffect(() => {
    let cancelled = false
    let dispose = () => {}
    import('mathlive').then(({ MathfieldElement }) => {
      if (cancelled || !MathfieldElement) return
      MathfieldElement.fontsDirectory = null
      MathfieldElement.soundsDirectory = null
      const mathfield = new MathfieldElement()
      mathfield.mathVirtualKeyboardPolicy = 'auto'
      mathfield.setAttribute('aria-label', label)
      mathfield.setValue(latest.current.value.replace(/\^(-?\d+)/g, '^{$1}'), { silenceNotifications: true })
      mathfield.readOnly = Boolean(latest.current.disabled)
      const input = () => latest.current.onChange(answerText(mathfield.getValue('ascii-math')))
      mathfield.addEventListener('input', input)
      host.current.appendChild(mathfield)
      field.current = mathfield
      setReady(true)
      dispose = () => { mathfield.removeEventListener('input', input); mathfield.remove(); field.current = null }
    }).catch(() => { /* The ordinary answer field remains usable if the keyboard cannot load. */ })
    return () => { cancelled = true; dispose() }
  }, [label])
  useEffect(() => {
    if (!field.current) return
    if (answerText(field.current.getValue('ascii-math')) !== value) field.current.setValue(value.replace(/\^(-?\d+)/g, '^{$1}'), { silenceNotifications: true })
    field.current.readOnly = Boolean(disabled)
  }, [value, disabled])
  return <div className="math-answer"><span>{label}</span>{!ready && <input aria-label={label} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} />}<div ref={host} />{ready && <button type="button" className="quiet-button" disabled={disabled} onClick={() => { field.current?.focus(); window.mathVirtualKeyboard?.show() }}>▦ Математическа клавиатура</button>}</div>
}
