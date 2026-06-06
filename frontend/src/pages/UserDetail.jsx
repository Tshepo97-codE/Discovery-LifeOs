import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate }       from 'react-router-dom'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import {
  ArrowLeft, Activity, Utensils, Car, Brain,
  Zap, TrendingDown, Loader2, ToggleLeft, ToggleRight, Bolt
} from 'lucide-react'
import {
  getUser, getUserTimeline,
  getInterventions, getCounterfactual, streamExplanation
} from '../api.js'
import { Card, Stat, RiskBadge, Spinner, PhaseLabel, DomainBar } from '../components.jsx'
import { UserCounterfactualChart } from './CounterfactualChart.jsx'

const TEAL   = '#0D9488'
const CORAL  = '#E05A3A'
const AMBER  = '#D97706'
const PURPLE = '#7C6FF7'

// ── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 p-3 text-xs font-mono space-y-1"
         style={{ background: '#1F2937' }}>
      <p className="text-gray-400 mb-1">Day {label}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Gemini panel wrapper ──────────────────────────────────────────────────────
function GeminiCard({ title, icon: Icon, children, loading, color = 'teal' }) {
  const styles = {
    teal:  { border: 'border-teal-800/50',  bg: 'rgba(13,148,136,0.06)',  text: 'text-teal-400'  },
    amber: { border: 'border-amber-800/50', bg: 'rgba(217,119,6,0.06)',   text: 'text-amber-400' },
    coral: { border: 'border-red-800/50',   bg: 'rgba(224,90,58,0.06)',   text: 'text-red-400'   },
  }[color]
  return (
    <div className={`rounded-xl border p-5 ${styles.border}`} style={{ background: styles.bg }}>
      <div className={`flex items-center gap-2 mb-3 ${styles.text}`}>
        <Icon size={14} />
        <p className="text-xs font-mono uppercase tracking-widest">{title}</p>
        {loading && <Loader2 size={12} className="animate-spin ml-auto" />}
      </div>
      {loading
        ? <p className="text-xs text-gray-500 animate-pulse">Asking Gemini...</p>
        : children}
    </div>
  )
}

// ── Intervention card ─────────────────────────────────────────────────────────
function IVCard({ iv }) {
  const iconMap  = { wellness: Activity, nutrition: Utensils, mobility: Car }
  const colorMap = { wellness: TEAL, nutrition: AMBER, mobility: PURPLE }
  const Icon  = iconMap[iv.domain]  || Zap
  const color = colorMap[iv.domain] || TEAL
  const urgencyStyle = {
    immediate: 'text-red-400   bg-red-900/20   border-red-800/40',
    this_week: 'text-amber-400 bg-amber-900/20 border-amber-800/40',
    ongoing:   'text-teal-400  bg-teal-900/20  border-teal-800/40',
  }[iv.urgency] || ''

  return (
    <div className="rounded-lg border border-gray-800 p-4 space-y-2 hover:border-gray-600 transition-colors"
         style={{ background: '#0F172A' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{iv.title}</p>
            <span className={`text-[10px] font-mono border rounded-full px-2 py-0.5 ${urgencyStyle}`}>
              {iv.urgency?.replace('_',' ')}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{iv.description}</p>
        </div>
      </div>
      {iv.reward && (
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color }}>
          <Zap size={10} />{iv.reward}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [user,     setUser]     = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Gemini states
  const [explanation,    setExplanation]    = useState('')
  const [interventions,  setInterventions]  = useState(null)
  const [counterfactual, setCounterfactual] = useState(null)
  const [loadingEx,      setLoadingEx]      = useState(false)
  const [loadingIv,      setLoadingIv]      = useState(false)
  const [loadingCf,      setLoadingCf]      = useState(false)
  const [streaming,      setStreaming]       = useState(false)

  // Counterfactual toggle (THE demo moment)
  const [cfVisible, setCfVisible] = useState(false)

  // Load-shedding toggle
  const [loadShedding, setLoadShedding] = useState(false)

  // Signal switcher
  const [signalView, setSignalView] = useState('risk')

  const esRef = useRef(null)

  useEffect(() => {
    Promise.all([getUser(id), getUserTimeline(id)])
      .then(([u, t]) => { setUser(u.data); setTimeline(t.data.timeline) })
      .finally(() => setLoading(false))
    return () => esRef.current?.close()
  }, [id])

  // ── Streaming explanation ──────────────────────────────────────────────────
  const loadExplanation = () => {
    if (explanation) return
    setLoadingEx(true)
    setStreaming(true)
    setExplanation('')

    const es = streamExplanation(id)
    esRef.current = es

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        es.close()
        setLoadingEx(false)
        setStreaming(false)
        return
      }
      try {
        const { chunk } = JSON.parse(e.data)
        setExplanation(prev => prev + chunk)
      } catch {}
    }
    es.onerror = () => {
      es.close()
      setLoadingEx(false)
      setStreaming(false)
    }
  }

  const loadInterventions = () => {
    if (interventions) return
    setLoadingIv(true)
    getInterventions(id, loadShedding)
      .then(r => setInterventions(r.data.interventions))
      .finally(() => setLoadingIv(false))
  }

  // ── Counterfactual: THE killer demo moment ────────────────────────────────
  const loadCounterfactual = () => {
    setCfVisible(true)
    if (counterfactual) return
    setLoadingCf(true)
    getCounterfactual(id)
      .then(r => setCounterfactual(r.data.counterfactual))
      .finally(() => setLoadingCf(false))
  }

  if (loading || !user) return <Spinner />

  const { user: profile, prediction, signal_snapshot } = user

  // ── Chart configuration ────────────────────────────────────────────────────
  const SIGNALS = {
    risk:      { keys: [
                  { k:'risk_score',    label:'Composite risk', color:CORAL },
                  { k:'wellness_risk', label:'Wellness',       color:TEAL  },
                  { k:'nutrition_risk',label:'Nutrition',      color:AMBER },
                  { k:'mobility_risk', label:'Mobility',       color:PURPLE},
                ], domain:[0,70] },
    wellness:  { keys: [
                  { k:'steps',          label:'Steps (÷100)',   color:TEAL,   transform:v=>v/100 },
                  { k:'sleep_hours',    label:'Sleep hrs',      color:PURPLE  },
                  { k:'app_engagement', label:'App engagement', color:AMBER   },
                ], domain:[0,120] },
    nutrition: { keys: [
                  { k:'healthy_food_pct', label:'Healthy food %',    color:TEAL,  transform:v=>v*100 },
                  { k:'meal_prep_score',  label:'Meal prep',          color:AMBER  },
                  { k:'sugar_index',      label:'Sugar index (×10)',   color:CORAL, transform:v=>v*10  },
                ], domain:[0,110] },
    mobility:  { keys: [
                  { k:'drive_score',  label:'Drive score',   color:TEAL  },
                  { k:'fatigue_risk', label:'Fatigue risk',  color:CORAL },
                ], domain:[0,110] },
  }

  const { keys: signalKeys, domain } = SIGNALS[signalView]
  const chartData = timeline.map(d => {
    const row = { day: d.day_index }
    signalKeys.forEach(({ k, transform }) => {
      const v = d[k]
      row[k] = v != null ? (transform ? transform(v) : v) : null
    })
    row.intervention = d.interventions?.length ? domain[1] * 0.93 : null
    return row
  })

  const isHigh = prediction?.risk_band === 'high'
  const isMod  = prediction?.risk_band === 'moderate'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/users')}
                className="mt-1 p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl text-white">{profile.name}</h1>
            <PhaseLabel phase={timeline[timeline.length-1]?.phase} />
            <RiskBadge band={prediction?.risk_band} score={prediction?.risk_score} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {profile.persona} · {profile.vitality_status} Vitality · {profile.city} · Age {profile.age}
          </p>
        </div>
        {/* Load-shedding toggle */}
        <button onClick={() => setLoadShedding(p => !p)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  loadShedding
                    ? 'border-amber-700 bg-amber-900/20 text-amber-400'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300'
                }`}>
          {loadShedding ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
          Load-shedding
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <Stat label="Risk score " value={prediction?.risk_score}
                color={isHigh ? 'text-red-400' : isMod ? 'text-amber-400' : 'text-teal-400'}
                sub={` ${prediction?.risk_band} risk band`} />
        </Card>
        <Card className="p-5">
          <Stat label="7-day warning " value={`${((prediction?.warning_prob||0)*100).toFixed(0)}%`}
                color="text-amber-400" sub=" high-risk probability" />
        </Card>
        <Card className="p-5">
          <Stat label="Avg steps 7d " value={Math.round(signal_snapshot?.avg_steps_7d||0).toLocaleString()}
                color="text-white" sub=" daily average" />
        </Card>
        <Card className="p-5">
          <Stat label="Avg sleep 7d " value={`${signal_snapshot?.avg_sleep_7d||0}h`}
                color="text-purple-400" sub=" per night" />
        </Card>
      </div>

      {/* Domain bars */}
      <Card className="p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-4">Domain risk breakdown</p>
        <div className="grid grid-cols-3 gap-6">
          <DomainBar label="Wellness "  value={prediction?.domain_breakdown?.wellness  || 0} color="teal"   />
          <DomainBar label="Nutrition " value={prediction?.domain_breakdown?.nutrition || 0} color="amber"  />
          <DomainBar label="Mobility "  value={prediction?.domain_breakdown?.mobility  || 0} color="purple" />
        </div>
      </Card>

      {/* Timeline chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-display text-xl text-white">84-day behavioural timeline</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Purple dots = interventions fired · vertical lines = phase boundaries
            </p>
          </div>
          <div className="flex gap-1 bg-gray-800/60 p-1 rounded-lg border border-gray-700">
            {[
              { key:'risk',      label:'Risk',      color:CORAL  },
              { key:'wellness',  label:'Wellness',  color:TEAL   },
              { key:'nutrition', label:'Nutrition', color:AMBER  },
              { key:'mobility',  label:'Mobility',  color:PURPLE },
            ].map(({ key, label, color }) => (
              <button key={key} onClick={() => setSignalView(key)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        signalView === key
                          ? 'bg-gray-700 text-white border border-gray-600'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={signalView === key ? { color } : {}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top:4, right:8, left:-16, bottom:0 }}>
            <defs>
              {signalKeys.map(({ k, color }) => (
                <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <ReferenceLine x={42} stroke={CORAL}  strokeDasharray="4 2" strokeWidth={1}
                           label={{ value:'Decline ▼', fill:CORAL,  fontSize:9, position:'insideTopRight' }} />
            <ReferenceLine x={71} stroke={TEAL}   strokeDasharray="4 2" strokeWidth={1}
                           label={{ value:'Recovery ▲', fill:TEAL, fontSize:9, position:'insideTopRight' }} />
            <XAxis dataKey="day" stroke="#374151"
                   tick={{ fontSize:10, fill:'#6B7280', fontFamily:'JetBrains Mono' }}
                   tickFormatter={v => `D${v}`} />
            <YAxis stroke="#374151"
                   tick={{ fontSize:10, fill:'#6B7280', fontFamily:'JetBrains Mono' }}
                   domain={domain} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize:11, color:'#9CA3AF' }} />

            {signalKeys.map(({ k, label, color }, i) => (
              i === 0
                ? <Area key={k} type="monotone" dataKey={k} name={label}
                        stroke={color} strokeWidth={2.5} fill={`url(#g_${k})`} dot={false} />
                : <Line key={k} type="monotone" dataKey={k} name={label}
                        stroke={color} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            ))}
            <Line type="monotone" dataKey="intervention" name="Intervention fired"
                  stroke={PURPLE} strokeWidth={0}
                  dot={{ fill:PURPLE, r:5, strokeWidth:0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Gemini panels ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Streaming explanation */}
        <GeminiCard title="Risk explanation" icon={Brain} loading={loadingEx && !explanation} color="teal">
          {!explanation && !loadingEx && (
            <button onClick={loadExplanation}
                    className="w-full text-xs text-teal-400 border border-teal-800/50 rounded-lg py-2.5
                               hover:bg-teal-900/20 transition-all font-mono">
              Ask Gemini to explain →
            </button>
          )}
          {explanation && (
            <p className="text-sm text-gray-300 leading-relaxed">
              {explanation}
              {streaming && <span className="inline-block w-1.5 h-4 bg-teal-400 ml-0.5 animate-pulse align-text-bottom" />}
            </p>
          )}
        </GeminiCard>

        {/* Interventions */}
        <GeminiCard title={`Interventions${loadShedding ? ' (load-shedding)' : ''}`}
                    icon={Zap} loading={loadingIv} color="amber">
          {!interventions && !loadingIv && (
            <button onClick={loadInterventions}
                    className="w-full text-xs text-amber-400 border border-amber-800/50 rounded-lg py-2.5
                               hover:bg-amber-900/20 transition-all font-mono">
              Generate interventions →
            </button>
          )}
          {interventions && (
            <div className="space-y-2">
              {interventions.map((iv, i) => <IVCard key={i} iv={iv} />)}
            </div>
          )}
        </GeminiCard>

        {/* Counterfactual — the killer demo moment */}
        <GeminiCard title="What happens without action?" icon={TrendingDown} loading={loadingCf} color="coral">
          {!cfVisible && !loadingCf && (
            <button onClick={loadCounterfactual}
                    className="w-full text-xs text-red-400 border border-red-800/50 rounded-lg py-2.5
                               hover:bg-red-900/20 transition-all font-mono group flex items-center justify-center gap-2">
              <Bolt size={12} className="group-hover:animate-pulse" />
              Show counterfactual →
            </button>
          )}
          {cfVisible && counterfactual && (
            <div className="space-y-3 text-sm">
              {/* WITHOUT */}
              <div className="p-3 rounded-lg border border-red-800/30" style={{ background:'rgba(224,90,58,0.07)' }}>
                <p className="text-[10px] text-red-400 font-mono mb-1 uppercase tracking-widest">Without intervention</p>
                <p className="text-gray-300 text-xs leading-relaxed">{counterfactual.without_intervention}</p>
              </div>
              {/* WITH */}
              <div className="p-3 rounded-lg border border-teal-800/30" style={{ background:'rgba(13,148,136,0.07)' }}>
                <p className="text-[10px] text-teal-400 font-mono mb-1 uppercase tracking-widest">With intervention</p>
                <p className="text-gray-300 text-xs leading-relaxed">{counterfactual.with_intervention}</p>
              </div>
              {/* Probability numbers */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg p-3" style={{ background:'rgba(224,90,58,0.08)' }}>
                  <p className="font-display text-3xl text-red-400">{counterfactual.disengagement_probability}%</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">disengagement risk</p>
                </div>
                <div className="rounded-lg p-3" style={{ background:'rgba(13,148,136,0.08)' }}>
                  <p className="font-display text-3xl text-teal-400">{counterfactual.claim_risk_reduction}%</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">claim risk reduction</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 text-center font-mono">
                Vitality status risk: <span className={
                  counterfactual.vitality_status_risk === 'high' ? 'text-red-400' :
                  counterfactual.vitality_status_risk === 'moderate' ? 'text-amber-400' : 'text-teal-400'
                }>{counterfactual.vitality_status_risk?.toUpperCase()}</span>
              </p>
            </div>
          )}
        </GeminiCard>
      </div>

      {/* ── Counterfactual comparison chart — reveals after toggle ─────────── */}
      {cfVisible && (
        <div className="rounded-xl border border-gray-800 p-6 space-y-2 animate-fade-up"
             style={{ background: '#111827' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <h3 className="font-display text-xl text-white">Counterfactual risk trajectory</h3>
            <span className="text-xs font-mono text-gray-500 border border-gray-700 rounded px-2 py-0.5 ml-auto">
              What would have happened without intervention
            </span>
          </div>
          <UserCounterfactualChart
            userId={id}
            visible={cfVisible}
            riskScore={prediction?.risk_score}
          />
        </div>
      )}

      {/* Signal snapshot */}
      <Card className="p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-4">7-day signal snapshot</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label:'Avg steps',      value: Math.round(signal_snapshot?.avg_steps_7d||0).toLocaleString(), unit:'steps/day'    },
            { label:'Avg sleep',      value: signal_snapshot?.avg_sleep_7d,   unit:'hrs/night'   },
            { label:'App engagement', value: signal_snapshot?.avg_app_engagement_7d, unit:'/100' },
            { label:'Healthy food',   value: `${Math.round((signal_snapshot?.avg_healthy_food_7d||0)*100)}%`, unit:'of purchases' },
            { label:'Drive score',    value: signal_snapshot?.avg_drive_score_7d, unit:'/100'    },
          ].map(({ label, value, unit }) => (
            <div key={label} className="text-center p-3 rounded-lg" style={{ background:'#0F172A' }}>
              <p className="font-display text-2xl text-white">{value ?? '—'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              <p className="text-[10px] text-gray-600">{unit}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}