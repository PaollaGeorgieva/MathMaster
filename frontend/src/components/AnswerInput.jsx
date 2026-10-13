import MathAnswer from './MathAnswer'
export default function AnswerInput({ question, value, onChange, disabled }) {
  const labels = question.startsWith('Определете броя на членовете') ? ['Брой членове', 'Степен', 'Коефициент пред x²', 'Свободен член']
    : question.startsWith('Определете коефициента и степента') ? ['Коефициент', 'Степен'] : null
  const options = question.includes('\nA:') && question.includes('\nB:') ? ['A', 'B']
    : question.startsWith('Определете вида на двойката') ? ['равни', 'противоположни', 'подобни', 'неподобни'] : null
  if (labels) {
    const parts = value.split(';')
    return <div className="answer-fields">{labels.map((label, i) => <label key={label}>{label}<input type="number" step="1" required disabled={disabled} value={parts[i] ?? ''} onChange={e => { const next = labels.map((_, j) => parts[j] ?? ''); next[i] = e.target.value; onChange(next.join(';')) }} /></label>)}</div>
  }
  if (options) return <fieldset className="answer-options"><legend>Твоят отговор</legend>{options.map(option => <label key={option}><input type="radio" name="practice-answer" value={option} checked={value === option} onChange={() => onChange(option)} required disabled={disabled} />{option}</label>)}</fieldset>
  return <MathAnswer value={value} onChange={onChange} disabled={disabled} />
}
