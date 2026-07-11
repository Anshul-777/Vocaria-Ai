import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic2, Shield, Wand2, Globe, Activity, Zap, ArrowRight, Plus,
  TrendingUp, Clock, CheckCircle, AlertTriangle, Users, Gauge, Video, Star
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi, hubApi } from '@/api/client'
import { ProgressBar, Spinner } from '@/components/ui/index'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

// Removed aggressive module-level caching to ensure real-time data freshness

const QUICK_ACTIONS = [
  { icon: Mic2, label: 'Clone Voice', desc: 'Upload sample & clone', path: '/clone', color: 'from-blue-500 to-indigo-600' },
  { icon: Wand2, label: 'Generate Speech', desc: 'Text to expressive voice', path: '/generate', color: 'from-purple-500 to-pink-600' },
  { icon: Shield, label: 'Detect Deepfake', desc: 'Upload file for analysis', path: '/detection', color: 'from-red-500 to-orange-500' },
  { icon: Activity, label: 'Live Detection', desc: 'Real-time microphone', path: '/detection/live', color: 'from-emerald-400 to-teal-500' },
  { icon: Globe, label: 'Voice Hub', desc: 'Browse community voices', path: '/hub', color: 'from-cyan-400 to-blue-500' },
  { icon: Video, label: 'Studio', desc: 'Create audio formats', path: '/studio', color: 'from-amber-400 to-yellow-500' },
]

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [hubStats, setHubStats] = useState<any>(null)

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const name = user?.display_name ? user.display_name.split(' ')[0] : ''

    const withName = [
      `${time}, ${name}.`,
      `Welcome back, ${name}.`,
      `Ready to create, ${name}?`,
      `Great to see you, ${name}.`,
      `Hello, ${name}.`
    ]

    const withoutName = [
      `${time}.`,
      `Welcome back.`,
      `Ready to create?`,
      `Let's get started.`,
      `Studio is ready.`
    ]

    const choices = name ? [...withName, ...withoutName] : withoutName
    return choices[Math.floor(Math.random() * choices.length)]
  }, [user?.display_name])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)

      try {
        const [ov, tl, hub] = await Promise.all([
          analyticsApi.overview(),
          analyticsApi.timeline(14),
          hubApi.stats()
        ]);

        setOverview(ov)
        setTimeline(tl?.timeline || [])
        setHubStats(hub)

      } catch (e) {
        console.error("Dashboard fetch error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const planLimits = overview?.usage && Object.keys(overview.usage).length > 0
    ? overview.usage
    : {
      voice_profiles: { used: 0, limit: 3, percentage: 0 },
      generation_minutes: { used: 0, limit: 10, percentage: 0 }
    };

  return (
    <div className="w-full space-y-10 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3"><Gauge className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(to_right,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)] animate-text-pan" style={{ fontFamily: "'Playfair Display', serif" }}>{greeting}</h1></div>
          <p className="text-gray-500 font-medium mt-2 text-sm md:text-base">Your creative workspace is ready. Let's build something amazing today.</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.plan_tier === 'enterprise' && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md flex items-center gap-2">
              <Star size={16} fill="currentColor" /> Enterprise Plan
            </div>
          )}
          {user?.plan_tier !== 'enterprise' && (
            <Link to="/billing" className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all whitespace-nowrap">
              {user?.plan_tier === 'pro' ? 'Upgrade to Enterprise' : 'Upgrade to Pro'}
            </Link>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((a, i) => (
            <motion.button key={a.path} onClick={() => navigate(a.path)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="relative p-5 text-left group cursor-pointer border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all duration-300 overflow-hidden">

              {/* Colorful hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex items-center justify-center gap-4 w-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0`}>
                  <a.icon size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-black mb-1">{a.label}</div>
                  <div className="text-xs font-medium text-gray-500">{a.desc}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Stats Grid */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-5">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Mic2, label: "Voice Profiles", value: overview?.totals?.voice_profiles ?? 0, color: "text-blue-600", bg: "bg-blue-100" },
            { icon: Wand2, label: "Generations", value: overview?.totals?.generation_jobs ?? 0, color: "text-purple-600", bg: "bg-purple-100" },
            { icon: Shield, label: "Detections Run", value: overview?.totals?.detection_jobs ?? 0, color: "text-red-600", bg: "bg-red-100" },
            { icon: AlertTriangle, label: "Synthetic Found", value: overview?.totals?.synthetic_detected ?? 0, color: "text-orange-600", bg: "bg-orange-100" }
          ].map((stat, i) => (
            <div key={i} className="relative p-6 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-start gap-6 w-full px-2">
                <div className={`w-14 h-14 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shrink-0`}>
                  <stat.icon size={24} className={stat.color} />
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-black">{stat.value}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Main content row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 p-6 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Activity — Last 14 days</h3>
            <Link to="/analytics" className="text-xs text-black font-semibold hover:underline flex items-center gap-1 group">
              Full analytics <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="generations" name="Generations" stroke="#000000" fill="url(#genGrad)" strokeWidth={3} />
              <Area type="monotone" dataKey="detections" name="Detections" stroke="#8B5CF6" fill="url(#detGrad)" strokeWidth={3} />
            </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Usage & Plan */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Usage this month</h3>
            <span className="bg-gray-100 text-black px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
              {user?.plan_tier || 'FREE'}
            </span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-6 place-content-start">
            {Object.entries(planLimits).map(([key, val]: [string, any]) => {
              if (!val || typeof val !== 'object') return null
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const used = Math.round(val.used || 0)
              const limit = val.limit || 10 // Fallback limit for UI
              const isUnlimited = val.unlimited

              if (isUnlimited) {
                return (
                  <div key={key} className="flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full border-8 border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-black">∞</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Left</span>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-sm font-bold text-gray-800">{label}</div>
                      <div className="text-[11px] font-medium text-gray-500">Unlimited access</div>
                    </div>
                  </div>
                )
              }

              const percentageUsed = Math.min(100, Math.max(0, (used / limit) * 100));
              const percentageLeft = 100 - percentageUsed;
              const remaining = Math.max(0, limit - used);
              const radius = 46;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (percentageLeft / 100) * circumference;

              const isVoice = key.includes('voice') || key.includes('profile');
              const colorBase = isVoice ? 'text-blue-500' : 'text-purple-500';
              const strokeColor = percentageLeft < 15 ? 'stroke-red-500' : isVoice ? 'stroke-blue-500' : 'stroke-purple-500';
              const strokeBg = isVoice ? 'stroke-blue-50' : 'stroke-purple-50';
              const displayRemaining = Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(remaining);
              const textSize = displayRemaining.length > 3 ? 'text-xl' : displayRemaining.length > 2 ? 'text-2xl' : 'text-3xl';

              return (
                <div key={key} className="flex flex-col items-center group cursor-default">
                  <div className="relative w-32 h-32 flex items-center justify-center group/ring">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r={radius} fill="transparent" className={strokeBg} strokeWidth="10" />
                      <circle
                        cx="64" cy="64" r={radius} fill="transparent"
                        className={`${strokeColor} transition-all duration-1000 ease-out`}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>

                    {/* Default Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 group-hover/ring:opacity-0 group-hover/ring:scale-95">
                      <span className={`${textSize} font-black ${colorBase}`}>{displayRemaining}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Left</span>
                    </div>

                    {/* Detailed Hover Content inside ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 scale-105 transition-all duration-300 group-hover/ring:opacity-100 group-hover/ring:scale-100">
                      <span className="text-sm font-black text-gray-800">{percentageLeft.toFixed(0)}%</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Available</span>
                    </div>

                    {/* Floating Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover/ring:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/ring:translate-y-0 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg font-medium whitespace-nowrap z-50 shadow-xl pointer-events-none">
                      {used.toLocaleString()} used out of {limit.toLocaleString()} limit
                      {/* Little triangle arrow */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <div className="text-sm font-bold text-gray-800">{label}</div>
                    <div className="text-xs font-medium text-gray-500 mt-1">{used.toLocaleString()} / {limit.toLocaleString()} used</div>
                  </div>
                </div>
              )
            })}
          </div>

          {user?.plan_tier === 'free' && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-sm font-black text-black mb-1">🚀 Unlock Starter</div>
              <div className="text-xs font-medium text-gray-500 mb-4 leading-relaxed">Get 10x more voice profiles, streaming API access and Priority support.</div>
              <Link to="/billing" className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-900 transition-colors">
                Upgrade — $19/mo
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Community / Hub stats */}
      {hubStats && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Mic2, label: 'Public Voices', value: hubStats.public_voices?.toLocaleString() },
            { icon: Users, label: 'Active Users', value: hubStats.active_users?.toLocaleString() },
            { icon: Activity, label: 'Total Plays', value: hubStats.total_plays?.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <s.icon size={22} className="text-black" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{s.value}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

