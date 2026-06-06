import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { getUsers } from '../api.js'

const VITALITY_COLORS = {
  Diamond: 'text-cyan-300',
  Gold:    'text-yellow-400',
  Silver:  'text-gray-300',
  Blue:    'text-blue-400',
}

const PHASE_STYLES = {
  baseline: 'text-teal-400  bg-teal-900/30  border-teal-800/40',
  decline:  'text-red-400   bg-red-900/30   border-red-800/40',
  recovery: 'text-green-400 bg-green-900/30 border-green-800/40',
}

const RISK_STYLES = {
  low:      'bg-teal-900/20  text-teal-300',
  moderate: 'bg-amber-900/20 text-amber-300',
  high:     'bg-red-900/20   text-red-300',
}

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getUsers()
      .then(r => setUsers(r.data.users))
      .catch(e => console.error('Failed to load users:', e))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.persona.toLowerCase().includes(query.toLowerCase())
  )

  function goToUser(userId) {
    navigate(`/users/${userId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-teal-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Monitored Users</h1>
          <p className="text-sm text-gray-400 mt-1">
            {users.length} users · click a user to see their full behavioural timeline
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users..."
            className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-sm
                       text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-all"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(u => (
          <button
            key={u.user_id}
            onClick={() => goToUser(u.user_id)}
            className="w-full text-left rounded-xl border border-gray-800 p-5
                       hover:border-gray-600 hover:bg-gray-800/30 cursor-pointer transition-all"
            style={{ background: '#111827' }}
          >
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center
                              text-sm font-mono font-semibold flex-shrink-0"
                   style={{ background: 'rgba(13,148,136,0.12)', color: '#2DD4BF',
                            border: '1px solid rgba(13,148,136,0.25)' }}>
                {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{u.name}</p>
                  <span className={`text-xs font-mono border rounded-full px-2 py-0.5 ${PHASE_STYLES[u.phase] || PHASE_STYLES.baseline}`}>
                    {u.phase === 'recovery' ? 'Recovery ✓' : u.phase === 'decline' ? 'Decline ⚠' : 'Baseline'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {u.persona} ·{' '}
                  <span className={VITALITY_COLORS[u.vitality_status] || 'text-gray-400'}>
                    {u.vitality_status} Vitality
                  </span>
                  {' '}· {u.city}
                </p>
              </div>

              {/* Risk score */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Risk score</p>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full font-medium ${RISK_STYLES[u.risk_band] || RISK_STYLES.low}`}>
                    {u.latest_risk}/100
                  </span>
                </div>
                <ChevronRight size={16} className="text-gray-600" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}