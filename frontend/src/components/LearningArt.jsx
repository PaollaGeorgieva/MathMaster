export default function LearningArt({ kind = 'books' }) {
  return <svg viewBox="0 0 260 210" className="learning-art" aria-hidden="true">
    <ellipse cx="134" cy="187" rx="95" ry="12" fill="#262c5010" />
    <circle cx="131" cy="98" r="83" fill="currentColor" opacity=".09" />
    <g fill="none" stroke="currentColor" strokeWidth="3" opacity=".65"><path d="M34 50v14m-7-7h14M219 118v14m-7-7h14M200 35l4 7 8 1-6 6 1 8-7-4-7 4 1-8-6-6 8-1z" /><circle cx="40" cy="145" r="5" /></g>
    {kind === 'trophy' ? <>
      <path d="M86 53H56v27q0 33 42 35M174 53h30v27q0 33-42 35" fill="none" stroke="#f5b641" strokeWidth="13" />
      <path d="M80 36h100v48q0 53-50 53T80 84z" fill="#ffd568" /><path d="M130 36h50v48q0 53-50 53z" fill="#ffbd44" />
      <path d="M130 58l10 20 22 3-16 16 4 22-20-11-20 11 4-22-16-16 22-3z" fill="#fff9da" />
      <path d="M120 131h20v30h-20z" fill="#e7a433" /><rect x="96" y="156" width="68" height="13" rx="5" fill="#ffcf60" /><rect x="85" y="169" width="90" height="16" rx="6" fill="#7857d9" />
    </> : kind === 'geometry' ? <>
      <path d="M52 162L127 41l75 121z" fill="#5dbce6" stroke="#228ebb" strokeWidth="3" /><path d="M88 144l39-64 40 64z" fill="#e5f6ff" />
      <circle cx="165" cy="145" r="36" fill="#ffc85b" /><path d="M144 146h43m-21-21v43" stroke="#fff7db" strokeWidth="6" strokeLinecap="round" />
      <rect x="42" y="165" width="110" height="20" rx="7" fill="#9c80f1" />
    </> : <>
      <g transform="rotate(-8 120 130)"><rect x="51" y="145" width="154" height="33" rx="9" fill="#7052c6" /><path d="M66 151h132v19H66q-9-9 0-19" fill="#f6efff" /><path d="M72 159h119" stroke="#d2c5f5" strokeWidth="2" /></g>
      <g transform="rotate(7 123 125)"><rect x="51" y="112" width="144" height="32" rx="8" fill="#31bba0" /><path d="M66 118h122v19H66q-9-9 0-19" fill="#edfff8" /></g>
      <g transform="rotate(-5 117 104)"><rect x="64" y="79" width="134" height="32" rx="8" fill="#ffbe58" /><path d="M78 85h114v19H78q-9-9 0-19" fill="#fff9e8" /></g>
      <path d="M57 57l73-33 73 33-73 33z" fill="#9470ef" /><path d="M85 72v25q44 22 88 0V72l-43 18z" fill="#7953ce" /><path d="M198 59v44" stroke="#ffbc4a" strokeWidth="4" /><circle cx="198" cy="107" r="6" fill="#ffbc4a" />
    </>}
  </svg>
}
