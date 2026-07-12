import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Shield, Key, CreditCard, Bell,
  ExternalLink, Copy, CheckCircle2, Eye, EyeOff,
  AlertTriangle, Crown, Sparkles, Zap, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

/* ─── Plan Config ──────────────────────────────────────────────────────── */

const PLAN_META: Record<string, { name: string; icon: any; color: string; bg: string; credits: number }> = {
  free: { name: 'Free', icon: Zap, color: 'text-gray-600', bg: 'bg-gray-50', credits: 5000 },
  pro: { name: 'Pro', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', credits: 50000 },
  enterprise: { name: 'Enterprise', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', credits: -1 },
}

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function WorkspaceAccount() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [agentCount, setAgentCount] = useState(0)
  const [kbCount, setKbCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [loading, setLoading] = useState(true)

  const tier = (user?.plan_tier || 'free').toLowerCase()
  const plan = PLAN_META[tier] || PLAN_META.free
  const PlanIcon = plan.icon

  // Placeholder API key — in production, this would come from the backend
  const apiKey = `voc_${user?.id?.replace(/-/g, '').slice(0, 24) || 'xxxxxxxxxxxx'}`

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return

        const [agents, kbs, sessions] = await Promise.all([
          supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', userData.user.id),
          supabase.from('knowledge_bases').select('id', { count: 'exact', head: true }).eq('user_id', userData.user.id),
          supabase.from('agent_connections').select('id', { count: 'exact', head: true }).eq('user_id', userData.user.id),
        ])

        setAgentCount(agents.count || 0)
        setKbCount(kbs.count || 0)
        setSessionCount(sessions.count || 0)
      } catch (err) {
        console.error('Failed to fetch account stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopiedKey(true)
    toast.success('API key copied')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[900px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Workspace Account</h1>
        <p className="text-[13px] text-gray-500 mt-1">Manage your workspace settings, API access, and billing.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              Profile
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-4">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[18px] font-bold">
                  {(user?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-[16px] font-bold text-gray-900">{user?.display_name || 'User'}</div>
                <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { label: 'Agents', value: agentCount },
                { label: 'Knowledge Bases', value: kbCount },
                { label: 'Total Sessions', value: sessionCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
                  <div className="text-[20px] font-bold text-gray-900">{loading ? '—' : stat.value}</div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Plan & Billing */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={16} className="text-gray-500" />
              Plan & Billing
            </h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${plan.bg} flex items-center justify-center`}>
                  <PlanIcon size={20} className={plan.color} />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-gray-900">{plan.name} Plan</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">
                    {plan.credits > 0
                      ? `${plan.credits.toLocaleString()} credits/month`
                      : 'Unlimited credits'}
                  </div>
                </div>
              </div>

              {tier !== 'enterprise' ? (
                <button
                  onClick={() => navigate('/billing')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[12.5px] font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Sparkles size={13} />
                  Upgrade Plan
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[12px] font-bold">
                  <CheckCircle2 size={14} />
                  Maximum Plan
                </div>
              )}
            </div>

            {plan.credits > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between text-[12px] text-gray-500 mb-1.5">
                  <span>Credit Usage</span>
                  <span>0 / {plan.credits.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-[0%] rounded-full bg-indigo-500 transition-all duration-500" />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* API Key */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <Key size={16} className="text-gray-500" />
              API Access
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Use this API key to authenticate requests to the Vocaria Agent API. Keep it secret — do not expose it in client-side code.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2 font-mono text-[12.5px] text-gray-700 overflow-hidden">
                {apiKeyVisible ? apiKey : '•'.repeat(32)}
              </div>
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
              >
                {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={handleCopyKey}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
              >
                {copiedKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11.5px] text-amber-600">
              <AlertTriangle size={12} />
              <span>This is a preview key. Full API access will be available when the voice engine is deployed.</span>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <Shield size={16} className="text-gray-500" />
              Security
            </h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            {[
              { label: 'Two-Factor Authentication', status: 'Not enabled', action: 'Enable', locked: true },
              { label: 'Session Management', status: '1 active session', action: 'View', locked: true },
              { label: 'Audit Logs', status: 'Available', action: 'View', locked: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">{item.label}</div>
                  <div className="text-[11.5px] text-gray-500 mt-0.5">{item.status}</div>
                </div>
                <button
                  onClick={() => {
                    if (item.locked) toast('This feature is coming soon.', { icon: '🔒' })
                    else if (item.label === 'Audit Logs') navigate('/audit')
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11.5px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
