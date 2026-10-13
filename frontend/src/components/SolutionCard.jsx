import MathText from './MathText'

export default function SolutionCard({ explanation, hint, answer }) {
  return <div className="solution-stack">
    {hint && <details className="help-bubble"><summary>✦ Подсказка</summary><div><MathText text={hint} /></div></details>}
    {(explanation || answer) && <details className="solution-bubble"><summary>✎ Решение</summary>
      {explanation && <div className="solution-steps"><MathText text={explanation} /></div>}
      {answer && <div className="answer-chip"><span>Отговор</span><MathText text={answer} /></div>}
    </details>}
  </div>
}
