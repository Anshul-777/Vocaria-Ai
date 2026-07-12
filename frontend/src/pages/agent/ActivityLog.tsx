import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, CalendarDays, ChevronDown,
  Clock, Phone, MessageSquare, ArrowUpRight, Bot,
  Search, Download, Eye, X, FileText, Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ConnectionRecord {
  id: string
  agent_id: string
  agent_name: string
  type: 'call' | 'chat' | 'api'
  status: 'completed' | 'missed' | 'in_progress' | 'failed'
  duration_seconds: number
  caller_id: string
  summary: string
  transcript?: string
  sentiment?: string
  created_at: string
}

interface AgentOption {
  id: string
  name: string
}

/* ─── Constants ────────────────────────────────────────────────────────── */

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  chat: MessageSquare,
  api: ArrowUpRight,
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Voice Call',
  chat: 'Text Chat',
  api: 'API Request',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
  missed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Missed' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Progress' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Failed' },
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ─── Detail Modal ─────────────────────────────────────────────────────── */

function RecordDetail({ record, onClose }: { record: ConnectionRecord; onClose: () => void }) {
  const TypeIcon = TYPE_ICONS[record.type] || Phone
  const status = STATUS_STYLES[record.status] || STATUS_STYLES.completed

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[90] w-auto sm:w-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Bot size={18} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-gray-900">{record.agent_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <TypeIcon size={12} className="text-gray-400" />
                <span className="text-[11.5px] text-gray-500">{TYPE_LABELS[record.type]}</span>
                <span className="text-gray-300">·</span>
                <span className="text-[11.5px] text-gray-500">{formatRelativeTime(record.created_at)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
              <div className="text-[11px] text-gray-500 font-medium mb-1">Status</div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
              <div className="text-[11px] text-gray-500 font-medium mb-1">Duration</div>
              <div className="text-[15px] font-bold text-gray-900">{formatDuration(record.duration_seconds)}</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
              <div className="text-[11px] text-gray-500 font-medium mb-1">Caller</div>
              <div className="text-[13px] font-semibold text-gray-800 truncate">{record.caller_id || 'Browser'}</div>
            </div>
          </div>

          {/* Summary */}
          {record.summary && (
            <div>
              <h3 className="text-[13px] font-semibold text-gray-700 mb-2">Summary</h3>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-[13px] text-gray-600 leading-relaxed">
                {record.summary}
              </div>
            </div>
          )}

          {/* Transcript */}
          {record.transcript && (
            <div>
              <h3 className="text-[13px] font-semibold text-gray-700 mb-2">Transcript</h3>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-[12.5px] text-gray-600 leading-relaxed font-mono max-h-[280px] overflow-y-auto">
                {record.transcript}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[11.5px] text-gray-400 text-right pt-2 border-t border-gray-50">
            {new Date(record.created_at).toLocaleString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </div>
        </div>
      </motion.div>
    </>
  )
}

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function ActivityLog() {
  const [records, setRecords] = useState<ConnectionRecord[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ConnectionRecord | null>(null)

  /* ─── Data Fetching ──────────────────────────────────────────────────── */

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
    } catch {
      setAgents([])
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      let query = supabase
        .from('agent_connections')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent)
      }
      if (selectedType !== 'all') {
        query = query.eq('type', selectedType)
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
      setRecords(data || [])
    } catch (err) {
      console.error('Failed to fetch activity log:', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])
  useEffect(() => { fetchRecords() }, [selectedAgent, selectedType, dateFrom, dateTo])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRecords()
    setRefreshing(false)
  }

  /* ─── Filtering ──────────────────────────────────────────────────────── */

  const filtered = records.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.agent_name.toLowerCase().includes(q) ||
      r.summary?.toLowerCase().includes(q) ||
      r.caller_id?.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    )
  })

  /* ─── Stats ──────────────────────────────────────────────────────────── */

  const stats = {
    total: records.length,
    completed: records.filter(r => r.status === 'completed').length,
    totalMinutes: Math.round(records.reduce((sum, r) => sum + r.duration_seconds, 0) / 60),
    avgDuration: records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.duration_seconds, 0) / records.length)
      : 0,
  }

  const hasFilters = dateFrom || dateTo || selectedAgent !== 'all' || selectedType !== 'all'

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Activity Log</h1>
          <p className="text-[13px] text-gray-500 mt-1">All conversations, calls, and interactions across your agents.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Sessions', value: stats.total, color: 'text-gray-900' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
          { label: 'Total Minutes', value: stats.totalMinutes, color: 'text-blue-600' },
          { label: 'Avg Duration', value: `${stats.avgDuration}s`, color: 'text-purple-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</div>
            <div className={`text-[22px] font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600">
          <CalendarDays size={14} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent outline-none text-[12.5px] text-gray-700 w-[110px]"
          />
          <span className="text-gray-300">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-transparent outline-none text-[12.5px] text-gray-700 w-[110px]"
          />
        </div>

        {/* Agent Filter */}
        <div className="relative">
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="h-10 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-[12.5px] text-gray-700 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          >
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-10 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-[12.5px] text-gray-700 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          >
            <option value="all">All Types</option>
            <option value="call">Voice Call</option>
            <option value="chat">Text Chat</option>
            <option value="api">API</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSelectedAgent('all'); setSelectedType('all'); setSearch('') }}
            className="h-10 px-3 rounded-xl text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center">
            <div className="inline-flex items-center gap-2 text-[13px] text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Loading activity...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 -m-5 rounded-full border border-dashed border-gray-200 opacity-60" />
              <div className="absolute inset-0 -m-10 rounded-full border border-dashed border-gray-100 opacity-40" />
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <FileText size={26} className="text-gray-300" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">No activity found</h3>
            <p className="text-[13px] text-gray-500 max-w-[360px] mx-auto">
              {hasFilters
                ? 'No sessions match your filters. Try adjusting your search criteria.'
                : 'Once your agents start having conversations, all activity will appear here with full transcripts and analytics.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1.6fr_0.8fr] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              {['Agent', 'Type', 'Status', 'Duration', 'Summary', 'When'].map(h => (
                <div key={h} className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">{h}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((record, i) => {
              const TypeIcon = TYPE_ICONS[record.type] || Phone
              const status = STATUS_STYLES[record.status] || STATUS_STYLES.completed

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedRecord(record)}
                  className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1.6fr_0.8fr] gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors items-center cursor-pointer group"
                >
                  {/* Agent */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <Bot size={14} className="text-indigo-500" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 truncate">{record.agent_name}</span>
                  </div>
                  {/* Type */}
                  <div className="flex items-center gap-2">
                    <TypeIcon size={13} className="text-gray-400" />
                    <span className="text-[12.5px] text-gray-600">{TYPE_LABELS[record.type]}</span>
                  </div>
                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                  {/* Duration */}
                  <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                    <Clock size={12} className="text-gray-400" />
                    {formatDuration(record.duration_seconds)}
                  </div>
                  {/* Summary */}
                  <div className="text-[12.5px] text-gray-500 truncate">{record.summary || '—'}</div>
                  {/* When */}
                  <div className="text-[12px] text-gray-500">
                    {formatRelativeTime(record.created_at)}
                  </div>
                </motion.div>
              )
            })}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <RecordDetail
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
