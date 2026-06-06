// ── Shared UI Components ─────────────────────────────────────────────────────

export function Card({ children, className = '', glow = false }) {
  return (
    <div className={`rounded-xl border border-gray-800 card-hover relative overflow-hidden
                     ${glow ? 'glow-teal' : ''}
                     ${className}`}
         style={{ background: '#111827' }}>
      {children}
    </div>
  )
}

export function Stat({ label, value, sub, color = 'text-white', pulse = false }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">
        {label}
      </span>
      <span className={`text-3xl font-bold leading-none count-anim ${color} ${pulse ? 'animate-pulse-slow' : ''}`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-gray-500 mt-1">
          {sub}
        </span>
      )}
    </div>
  )
}

export function RiskBadge({ band, score }) {
  const cls = {
    low:      'risk-low',
    moderate: 'risk-moderate',
    high:     'risk-high',
  }[band] || 'risk-low'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {score !== undefined ? `${score}/100` : band?.toUpperCase()}
    </span>
  )
}

export function SectionHeader({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-teal-400 rounded-full animate-spin" />
    </div>
  )
}

export function PhaseLabel({ phase }) {
  const map = {
    baseline: { label: 'Baseline',  cls: 'text-teal-400  bg-teal-900/30  border-teal-800/40'  },
    decline:  { label: 'Decline ⚠', cls: 'text-red-400   bg-red-900/30   border-red-800/40'   },
    recovery: { label: 'Recovery ✓', cls: 'text-green-400 bg-green-900/30 border-green-800/40' },
  }
  const { label, cls } = map[phase] || map.baseline
  return (
    <span className={`text-xs font-mono border rounded-full px-2 py-0.5 ${cls}`}>
      {label}
    </span>
  )
}

export function DomainBar({ label, value, color }) {
  const colors = {
    teal:   { bar: '#0D9488', bg: 'rgba(13,148,136,0.12)' },
    amber:  { bar: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
    purple: { bar: '#7C6FF7', bg: 'rgba(124,111,247,0.12)' },
    coral:  { bar: '#E05A3A', bg: 'rgba(224,90,58,0.12)'  },
  }
  const c = colors[color] || colors.teal
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-300">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: c.bg }}>
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(value, 100)}%`, background: c.bar }} />
      </div>
    </div>
  )
}