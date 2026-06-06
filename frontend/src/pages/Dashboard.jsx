import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, Zap, Users, Target, ChevronRight, AlertTriangle } from 'lucide-react'
import { getDashboardSummary, getUsers, getUserTimeline } from '../api.js'
import { Card, Stat, RiskBadge, SectionHeader, Spinner, PhaseLabel } from '../components.jsx'
import { DashboardCounterfactualChart } from './CounterfactualChart.jsx'

const TEAL   = '#0D9488'
const CORAL  = '#E05A3A'
const AMBER  = '#D97706'
const PURPLE = '#7C6FF7'

// Custom tooltip for charts
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 p-3 text-xs font-mono"
         style={{ background: '#1F2937' }}>
      <p className="text-gray-400 mb-1">Day {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [summary,  setSummary]  = useState(null)
  const [users,    setUsers]    = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading,  setLoading]  = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getUsers(),
      getUserTimeline('USR_001'),  // primary demo user for chart
    ]).then(([s, u, t]) => {
      setSummary(s.data)
      setUsers(u.data.users)
      setTimeline(t.data.timeline)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const { platform, risk_arc, model_performance } = summary || {}

  // Phase reference lines data for the main chart
  const chartData = timeline.map(d => ({
    day:       d.day_index,
    risk:      d.risk_score,
    wellness:  d.wellness_risk,
    nutrition: d.nutrition_risk,
    mobility:  d.mobility_risk,
    phase:     d.phase,
    ls:        d.load_shedding ? d.risk_score : null,
  }))

  // Weekly aggregated data for bar chart
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const week = timeline.filter(d => d.week === i + 1)
    return {
      week:      `W${i + 1}`,
      avg_risk:  week.length ? +(week.reduce((a, b) => a + b.risk_score, 0) / week.length).toFixed(1) : 0,
      phase:     week[0]?.phase || 'baseline',
    }
  })

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Hero header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="font-display text-4xl text-white leading-tight">
            Behavioural Intelligence
            <span className="block text-teal-400"> Platform Overview</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-lg">
            Predictive risk monitoring across wellness, nutrition, and mobility —
            intervening before negative outcomes occur.
          </p>
        </div>
        {/* Model accuracy badge */}
        <div className="rounded-xl border border-teal-800/50 p-4 text-right"
             style={{ background: 'rgba(13,148,136,0.08)' }}>
          <p className="text-xs text-teal-400 font-mono uppercase tracking-widest mb-1">Model accuracy</p>
          <p className="font-display text-3xl text-white">{model_performance?.warning_auc}</p>
          <p className="text-xs text-gray-400">AUC-ROC — early warning</p>
          <div className="mt-2 flex gap-3 text-xs font-mono justify-end">
            <span className="text-gray-400">MAE <span className="text-white">{model_performance?.risk_mae}</span></span>
            <span className="text-gray-400">R² <span className="text-white">{model_performance?.risk_r2}</span></span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Users monitored',      value: platform?.total_users,         sub: 'across all domains',     color: 'text-white',   icon: Users    },
          { label: 'Interventions fired',  value: platform?.interventions_fired,  sub: 'proactive actions taken', color: 'text-teal-400', icon: Zap      },
          { label: 'Avg effectiveness',    value: `${platform?.avg_effectiveness}%`, sub: 'of interventions worked', color: 'text-amber-400', icon: Target   },
          { label: 'Users responded',      value: platform?.users_responded,      sub: 'acted on interventions', color: 'text-purple-400', icon: TrendingUp },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">{label}</p>
              <Icon size={14} className="text-gray-600" />
            </div>
            <p className={`font-display text-3xl leading-none count-anim ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-2">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Risk arc summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Baseline avg risk',  value: risk_arc?.baseline_avg, phase: 'baseline', color: TEAL  },
          { label: 'Peak risk (decline)', value: risk_arc?.peak_avg,    phase: 'decline',  color: CORAL },
          { label: 'Recovery avg risk',  value: risk_arc?.recovery_avg, phase: 'recovery', color: TEAL  },
        ].map(({ label, value, phase, color }) => (
          <Card key={label} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <span className="font-display text-lg" style={{ color }}>{value}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <PhaseLabel phase={phase} />
            </div>
          </Card>
        ))}
      </div>

      {/* Main risk timeline chart */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-display text-xl text-white">Risk score timeline — USR_001 (High Performer)</h3>
            <p className="text-xs text-gray-500 mt-1">
              Cross-domain composite risk score across 84 days.
              <span className="text-red-400 ml-2"> Red zone = decline detected.</span>
              <span className="text-green-400 ml-2"> Green zone = post-intervention recovery.</span>
            </p>
          </div>
          <div className="flex gap-2 text-xs font-mono">
            <span className="px-2 py-1 rounded border border-gray-700 text-gray-400">Days 1–42: Baseline</span>
            <span className="px-2 py-1 rounded border border-red-800/50 text-red-400">Days 43–70: Decline</span>
            <span className="px-2 py-1 rounded border border-green-800/50 text-green-400">Days 71–84: Recovery</span>
          </div>
        </div>

        {/* Phase background bands */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CORAL} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CORAL} stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gWell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL}   stopOpacity={0.15} />
                  <stop offset="95%" stopColor={TEAL}   stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="day" stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                     tickFormatter={v => `D${v}`} />
              <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                     domain={[0, 70]} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'DM Sans' }} />

              {/* Reference: decline phase start */}
              <Area type="monotone" dataKey="wellness"  name="Wellness risk"
                    stroke={TEAL}   strokeWidth={1} fill="url(#gWell)" strokeDasharray="4 2" dot={false} />
              <Area type="monotone" dataKey="nutrition" name="Nutrition risk"
                    stroke={AMBER}  strokeWidth={1} fill="none"        strokeDasharray="4 2" dot={false} />
              <Area type="monotone" dataKey="mobility"  name="Mobility risk"
                    stroke={PURPLE} strokeWidth={1} fill="none"        strokeDasharray="4 2" dot={false} />
              <Area type="monotone" dataKey="risk"      name="Composite risk"
                    stroke={CORAL}  strokeWidth={2.5} fill="url(#gRisk)" dot={false} />

              {/* Load-shedding markers */}
              <Area type="monotone" dataKey="ls" name="Load-shedding"
                    stroke="#F59E0B" strokeWidth={0} fill="none"
                    dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Weekly bar chart + users table side by side */}
      <div className="grid grid-cols-5 gap-4">

        {/* Weekly avg risk bar chart */}
        <Card className="col-span-2 p-6">
          <h3 className="font-display text-lg text-white mb-4">Weekly avg risk</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="week" stroke="#374151"
                     tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#374151"
                     tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }} domain={[0, 60]} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="avg_risk" name="Avg risk" radius={[4, 4, 0, 0]}
                   fill={TEAL}
                   label={false}
                   // colour bars by phase
                   isAnimationActive={true}>
                {weeklyData.map((entry, i) => (
                  <rect key={i} fill={
                    entry.phase === 'decline'  ? CORAL :
                    entry.phase === 'recovery' ? TEAL  : '#374151'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Users at-a-glance */}
        <Card className="col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-white">Monitored users</h3>
            <button onClick={() => navigate('/users')}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.user_id}
                   onClick={() => navigate(`/users/${u.user_id}`)}
                   className="flex items-center justify-between p-3 rounded-lg border border-gray-800
                              hover:border-gray-600 cursor-pointer transition-all hover:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-medium flex-shrink-0"
                       style={{ background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}>
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.persona} · {u.vitality_status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhaseLabel phase={u.phase} />
                  <RiskBadge band={u.risk_band} score={u.latest_risk} />
                  <ChevronRight size={14} className="text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Counterfactual impact chart ── */}
      <DashboardCounterfactualChart />

      {/* Model performance footer */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-400" />
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">Model performance metrics</p>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Risk Score MAE',     value: model_performance?.risk_mae,    sub: 'avg error (0–100 scale)' },
            { label: 'Risk Score R²',      value: model_performance?.risk_r2,     sub: 'variance explained'       },
            { label: 'Early Warning AUC',  value: model_performance?.warning_auc, sub: '7-day advance detection'  },
            { label: 'Early Warning F1',   value: model_performance?.warning_f1,  sub: 'precision × recall'       },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">{label}</p>
              <p className="font-display text-2xl text-teal-400 mt-1">{value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}