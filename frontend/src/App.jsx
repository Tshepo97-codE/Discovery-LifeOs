import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Activity, Shield, Utensils, Car, LayoutDashboard, Users } from 'lucide-react'
import Dashboard  from './pages/Dashboard.jsx'
import UserDetail from './pages/UserDetail.jsx'
import UsersPage  from './pages/UsersPage.jsx'

const NAV = [
  { to: '/',      label: 'Platform ', icon: LayoutDashboard },
  { to: '/users', label: 'Users',    icon: Users           },
]

const DOMAINS = [
  { label: 'Vitality Pulse', icon: Activity, color: 'text-teal-400'   },
  { label: 'NutriSense',     icon: Utensils, color: 'text-amber-400'  },
  { label: 'SafeRoute',      icon: Car,      color: 'text-purple-400' },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B1120' }}>
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-8 sticky top-0 z-50"
              style={{ background: 'rgba(11,17,32,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <span className="font-display text-white text-lg leading-none">Discovery</span>
            <span className="font-display text-teal-400 text-lg leading-none ml-1">LifeOS</span>
          </div>
          <span className="text-xs text-gray-500 font-mono border border-gray-700 rounded px-2 py-0.5 ml-2">
            BETA
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-900/40 text-teal-400 border border-teal-800/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {DOMAINS.map(({ label, icon: Icon, color }) => (
            <div key={label}
                 className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-700 text-xs font-medium text-gray-400">
              <Icon size={11} className={color} />
              {label}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/"           element={<Dashboard />}  />
          <Route path="/users"      element={<UsersPage />}  />
          <Route path="/users/:id"  element={<UserDetail />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-800 px-6 py-3 flex items-center justify-between text-xs text-gray-600">
        <span>Discovery LifeOS — GradHack 2026 </span>
        <span className="font-mono">Predictive Behavioural Intelligence Platform</span>
      </footer>
    </div>
  )
}