import katex from 'katex'
import 'katex/dist/katex.min.css'
import './MathText.css'

// Retain support for older content written without LaTeX delimiters.
function PlainText({ value }) {
  const parts = value.split(/(\^(?:\{[^{}\n]+\}|\([^()\n]+\)|[+−-]?\d+(?:[.,]\d+)?|[a-zA-Z]))/g)
  return <span className="math-text">{parts.map((part, index) => {
    if (index % 2 === 0) return part
    let exponent = part.slice(1)
    if ((exponent.startsWith('{') && exponent.endsWith('}')) || (exponent.startsWith('(') && exponent.endsWith(')'))) exponent = exponent.slice(1, -1)
    return <sup key={index}>{exponent}</sup>
  })}</span>
}

export default function MathText({ text }) {
  const value = String(text ?? '').trimEnd()
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g
  const parts = []
  let start = 0
  for (const match of value.matchAll(pattern)) {
    parts.push(<PlainText key={`text-${start}`} value={value.slice(start, match.index)} />)
    // Only KaTeX-generated markup is inserted; prose remains escaped React text.
    // MathLive can leave an empty second superscript after editing a power.
    // It is invisible in the editor but KaTeX rejects it as a double superscript.
    const formula = (match[1] ?? match[2]).replace(/\^\{\s*\}/g, '')
    const html = katex.renderToString(formula, {
      displayMode: match[2] !== undefined,
      throwOnError: false,
      trust: false,
      maxSize: 20,
      maxExpand: 1000,
      strict: 'ignore',
      // MathLive uses displaylines for Enter-created rows. KaTeX needs an array.
      // A macro preserves nested braces (powers, fractions, roots) in its argument.
      macros: { '\\displaylines': '\\begin{array}{l}#1\\end{array}' },
    })
    parts.push(<span key={`math-${match.index}`} className="rendered-formula" dangerouslySetInnerHTML={{ __html: html }} />)
    start = match.index + match[0].length
  }
  parts.push(<PlainText key={`text-${start}`} value={value.slice(start)} />)
  return <span className="math-text">{parts}</span>
}
