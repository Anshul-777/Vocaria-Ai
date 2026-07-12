import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, RefreshCw, CalendarDays, Filter, ChevronDown,
  Clock, Phone, MessageSquare, ArrowUpRight, Bot
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Connection {
  id: string
  agent_id: string
  agent_name: string
  type: 'call' | 'chat' | 'api'
  status: 'completed' | 'missed' | 'in_progress' | 'failed'
  duration_seconds: number
  caller_id: string
  summary: string
  created_at: string
}

interface AgentOption {
  id: string
  name: string
}

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  chat: MessageSquare,
  api: ArrowUpRight,
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  missed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function AgentConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchAgents = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      const { data } = await supabase
        .from('agents')
        .select('id, name')
        .eq('user_id', userData.user.id)
        .order('name')

      setAgents(data || [])
    } catch { setAgents([]) }
  }

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      let query = supabase
        .from('agent_connections')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent)
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        const end = new Date(dateTo)
        end.setDate(end.getDate() + 1)
        query = query.lt('created_at', end.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      setConnections(data || [])
    } catch (err) {
      console.error('Failed to fetch connections:', err)
      setConnections([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])
  useEffect(() => { fetchConnections() }, [selectedAgent, dateFrom, dateTo])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchConnections()
    setRefreshing(false)
  }

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Agent Connections</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">BETA</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <div className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-600">
            <CalendarDays size={15} className="text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent outline-none text-[13px] text-gray-700 w-[120px]"
              placeholder="From date"
            />
            <span className="text-gray-300">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent outline-none text-[13px] text-gray-700 w-[120px]"
              placeholder="To date"
            />
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="h-10 px-4 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          >
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {(dateFrom || dateTo || selectedAgent !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSelectedAgent('all') }}
            className="h-10 px-3 rounded-lg text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center">
            <div className="inline-flex items-center gap-2 text-[13px] text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Loading connections...
            </div>
          </div>
        ) : connections.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 -m-5 rounded-full border border-dashed border-gray-200 opacity-60" />
              <div className="absolute inset-0 -m-10 rounded-full border border-dashed border-gray-100 opacity-40" />
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <FileText size={26} className="text-gray-300" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">No conversations available</h3>
            <p className="text-[13px] text-gray-500 max-w-[340px] mx-auto">
              We couldn't find any conversations for this view. Once your agents start receiving connections, they'll appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1.5fr_1fr] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Agent</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duration</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Summary</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</div>
            </div>

            {connections.map((conn, i) => {
              const TypeIcon = TYPE_ICONS[conn.type] || Phone
              const status = STATUS_STYLES[conn.status] || STATUS_STYLES.completed

              return (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1.5fr_1fr] gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-indigo-500" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 truncate">{conn.agent_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TypeIcon size={14} className="text-gray-400" />
                    <span className="text-[12.5px] text-gray-600 capitalize">{conn.type}</span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {conn.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                    <Clock size={12} className="text-gray-400" />
                    {formatDuration(conn.duration_seconds)}
                  </div>
                  <div className="text-[12.5px] text-gray-500 truncate">{conn.summary || '—'}</div>
                  <div className="text-[12.5px] text-gray-500">
                    {new Date(conn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </motion.div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
