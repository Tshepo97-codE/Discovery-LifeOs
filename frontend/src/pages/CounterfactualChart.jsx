/**
 * Discovery LifeOS — Counterfactual Comparison Chart
 * ====================================================
 * The single most important chart in the demo.
 *
 * Shows three things simultaneously:
 *   1. Actual risk trajectory (what happened with intervention)
 *   2. Projected trajectory (what would have happened without it)
 *   3. The gap between them — the measurable value of early intervention
 *
 * Used in two places:
 *   - Dashboard: platform-level overview (all users averaged)
 *   - UserDetail: per-user deep dive (revealed when counterfactual is triggered)
 */

import { useEffect, useState, useCallback } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from 'recharts'
import { TrendingDown, TrendingUp, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'

const BASE   = ''
const TEAL   = '#0D9488'
const CORAL  = '#E05A3A'
const AMBER  = '#D97706'
const PURPLE = '#7C6FF7'
const GRAY   = '#374151'

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CFTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const actual    = payload.find(p => p.dataKey === 'actual_risk'    || p.dataKey === 'avg_actual_risk')
  const projected = payload.find(p => p.dataKey === 'projected_risk' || p.dataKey === 'avg_projected_risk')
  const gap = (projected?.value != null && actual?.value != null)
    ? (projected.value - actual.value).toFixed(1)
    : null

  return (
    <div className="rounded-lg border border-gray-700 p-3 text-xs font-mono min-w-[160px]"
         style={{ background: '#1F2937' }}>
      <p className="text-gray-400 mb-2 border-b border-gray-700 pb-1">Day {label}</p>
      {actual && (
        <p style={{ color: TEAL }}>
          Actual: <span className="font-semibold">{actual.value?.toFixed(1)}</span>
        </p>
      )}
      {projected?.value != null && (
        <p style={{ color: CORAL }}>
          Projected: <span className="font-semibold">{projected.value?.toFixed(1)}</span>
        </p>
      )}
      {gap != null && (
        <p className="mt-1 pt-1 border-t border-gray-700" style={{ color: AMBER }}>
          Gap saved: <span className="font-semibold">−{gap} pts</span>
        </p>
      )}
    </div>
  )
}

// ── Stat callout card ─────────────────────────────────────────────────────────
function StatCallout({ icon: Icon, label, value, sub, color, animate = false }) {
  return (
    <div className={`rounded-xl p-4 border transition-all duration-500 ${animate ? 'scale-105' : ''}`}
         style={{ background: `${color}10`, borderColor: `${color}30` }}>
      <div className="flex items-start justify-between mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-3xl leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Per-user counterfactual chart ─────────────────────────────────────────────
export function UserCounterfactualChart({ userId, visible, riskScore }) {
  const [data,   setData]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !userId) return
    setLoading(true)
    axios.get(`${BASE}/api/users/${userId}/counterfactual-chart`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [visible, userId])

  if (!visible) return null

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-teal-400 rounded-full animate-spin" />
      </div>
    )
  }

  const { timeline, stats } = data
  const interventionDay     = stats.intervention_day

  // Build chart data — only show projected from day 71 onward
  const chartData = timeline.map(d => ({
    day:            d.day_index,
    actual_risk:    d.actual_risk,
    projected_risk: d.projected_risk,   // null before day 71 — line doesn't render
  }))

  return (
    <div className="space-y-4">
      {/* Stat callouts */}
      <div className="grid grid-cols-3 gap-3">
        <StatCallout
          icon={TrendingDown} color={CORAL}
          label="Peak without intervention"
          value={`${stats.peak_projected}`}
          sub="projected risk score at day 90"
          animate />
        <StatCallout
          icon={Zap} color={AMBER}
          label="Avg risk points saved"
          value={`−${stats.avg_risk_gap}`}
          sub="per day in recovery phase" />
        <StatCallout
          icon={TrendingUp} color={TEAL}
          label="Max gap (best day)"
          value={`−${stats.max_risk_gap}`}
          sub="largest single-day improvement" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-800 p-4" style={{ background: '#0F172A' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            Actual vs projected risk trajectory
          </p>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: TEAL, display: 'inline-block' }} />
              <span className="text-gray-400">Actual (with intervention)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: CORAL, display: 'inline-block', borderTop: `1px dashed ${CORAL}` }} />
              <span className="text-gray-400">Projected (no intervention)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded opacity-40" style={{ background: AMBER, display: 'inline-block' }} />
              <span className="text-gray-400">Gap = value saved</span>
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gActualUser" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TEAL}  stopOpacity={0.25} />
                <stop offset="95%" stopColor={TEAL}  stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gProjUser" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CORAL} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CORAL} stopOpacity={0}    />
              </linearGradient>
            </defs>

            {/* Phase shading */}
            <ReferenceArea x1={42}  x2={70} fill={CORAL} fillOpacity={0.04} />
            <ReferenceArea x1={71}  x2={83} fill={TEAL}  fillOpacity={0.04} />

            {/* Gap shading — amber fill between actual and projected */}
            <ReferenceArea x1={71} x2={83}
                           fill={AMBER} fillOpacity={0.08}
                           label={{ value: 'Gap = value saved', fill: AMBER, fontSize: 9, position: 'insideTop' }} />

            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />

            {/* Intervention reference line */}
            <ReferenceLine x={interventionDay}
                           stroke={PURPLE} strokeWidth={2} strokeDasharray="0"
                           label={{ value: '⚡ Intervention', fill: PURPLE, fontSize: 9, position: 'insideTopLeft' }} />

            <XAxis dataKey="day" stroke={GRAY}
                   tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                   tickFormatter={v => `D${v}`} />
            <YAxis stroke={GRAY}
                   tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                   domain={[0, 70]} />
            <Tooltip content={<CFTooltip />} />

            {/* Actual risk — solid teal */}
            <Area type="monotone" dataKey="actual_risk" name="Actual risk"
                  stroke={TEAL} strokeWidth={2.5}
                  fill="url(#gActualUser)" dot={false} connectNulls />

            {/* Projected risk — dashed coral, only from day 71 */}
            <Line type="monotone" dataKey="projected_risk" name="Projected (no intervention)"
                  stroke={CORAL} strokeWidth={2} strokeDasharray="6 3"
                  dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary sentence */}
        <p className="text-xs text-gray-500 mt-3 text-center font-mono italic">
          "{stats.summary}"
        </p>
      </div>
    </div>
  )
}

// ── Platform-level overview chart (Dashboard page) ────────────────────────────
export function DashboardCounterfactualChart() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    axios.get(`${BASE}/api/dashboard/counterfactual-overview`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-gray-800 p-6" style={{ background: '#111827' }}>
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-teal-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const { timeline, platform_stats } = data

  const chartData = timeline.map(d => ({
    day:                 d.day_index,
    avg_actual_risk:     d.avg_actual_risk,
    avg_projected_risk:  d.avg_projected_risk,
  }))

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ background: '#111827' }}>
      {/* Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-400" />
              <h3 className="font-display text-xl text-white">
                Platform counterfactual impact
              </h3>
            </div>
            <p className="text-xs text-gray-400 max-w-xl">
              Average risk across all {platform_stats.users_count} monitored users —
              the <span style={{ color: CORAL }}>dashed line</span> shows where
              users would have been without AI intervention.
              The <span style={{ color: AMBER }}>amber gap</span> is the measurable value
              of proactive behavioural intelligence.
            </p>
          </div>
          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white
                       border border-gray-700 rounded-lg px-3 py-1.5 transition-all">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Platform stat strip */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="rounded-lg p-3" style={{ background: 'rgba(224,90,58,0.08)', border: '1px solid rgba(224,90,58,0.2)' }}>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Avg gap — all users</p>
            <p className="font-display text-2xl" style={{ color: AMBER }}>
              −{platform_stats.avg_risk_gap_all_users} pts
            </p>
            <p className="text-[10px] text-gray-500">per day in recovery phase</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Intervention day</p>
            <p className="font-display text-2xl" style={{ color: TEAL }}>
              Day {platform_stats.intervention_day}
            </p>
            <p className="text-[10px] text-gray-500">early warning fires</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(124,111,247,0.08)', border: '1px solid rgba(124,111,247,0.2)' }}>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Users protected</p>
            <p className="font-display text-2xl" style={{ color: PURPLE }}>
              {platform_stats.users_count}
            </p>
            <p className="text-[10px] text-gray-500">across all domains</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={`transition-all duration-500 overflow-hidden ${expanded ? 'max-h-[500px]' : 'max-h-[320px]'}`}>
        <div className="p-5">
          {/* Legend */}
          <div className="flex items-center gap-6 mb-4 text-[11px] font-mono">
            <span className="flex items-center gap-2">
              <span className="w-4 h-0.5 rounded" style={{ background: TEAL, display: 'inline-block' }} />
              <span className="text-gray-400">Actual (with intervention)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed" style={{ borderColor: CORAL, display: 'inline-block' }} />
              <span className="text-gray-400">Projected (no intervention)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-3 rounded opacity-50" style={{ background: AMBER, display: 'inline-block' }} />
              <span className="text-gray-400">Value gap</span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={expanded ? 320 : 200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gActualDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TEAL}  stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gProjDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CORAL} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CORAL} stopOpacity={0}   />
                </linearGradient>
              </defs>

              {/* Phase background */}
              <ReferenceArea x1={0}  x2={41} fill={GRAY}  fillOpacity={0.03} />
              <ReferenceArea x1={42} x2={70} fill={CORAL} fillOpacity={0.05} />
              <ReferenceArea x1={71} x2={83} fill={TEAL}  fillOpacity={0.04} />

              {/* The gap — amber shading between the two lines */}
              <ReferenceArea x1={71} x2={83}
                             fill={AMBER} fillOpacity={0.10} />

              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />

              {/* Phase labels */}
              <ReferenceLine x={0}  stroke="transparent"
                             label={{ value: 'Baseline →', fill: '#4B5563', fontSize: 9, position: 'insideTopLeft' }} />
              <ReferenceLine x={42} stroke={CORAL} strokeWidth={1} strokeDasharray="4 2"
                             label={{ value: 'Decline →', fill: CORAL, fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine x={71} stroke={PURPLE} strokeWidth={2}
                             label={{ value: '⚡', fill: PURPLE, fontSize: 12, position: 'insideTopLeft' }} />

              <XAxis dataKey="day" stroke={GRAY}
                     tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                     tickFormatter={v => v % 7 === 0 ? `W${Math.ceil(v/7)}` : ''} />
              <YAxis stroke={GRAY}
                     tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                     domain={[0, 55]} />
              <Tooltip content={<CFTooltip />} />

              {/* Actual — solid teal area */}
              <Area type="monotone" dataKey="avg_actual_risk" name="Actual (avg)"
                    stroke={TEAL} strokeWidth={2.5}
                    fill="url(#gActualDash)" dot={false} connectNulls />

              {/* Projected — dashed coral line, only from day 71 */}
              <Line type="monotone" dataKey="avg_projected_risk" name="Projected (no intervention)"
                    stroke={CORAL} strokeWidth={2} strokeDasharray="6 3"
                    dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Bottom annotation */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: AMBER, opacity: 0.6 }} />
            <p className="text-[11px] text-gray-500 font-mono">
              Amber region = risk points prevented by AI-driven early intervention
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}