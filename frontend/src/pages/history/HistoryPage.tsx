// ─── History Page ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History, Wand2, Shield, Zap, ExternalLink, Search, User, Radio, Award, Bot, Clock, Filter, AlertTriangle } from 'lucide-react'
import { historyApi } from '@/api/client'
import { Reveal, VerdictBadge, EmptyState, Spinner } from '@/components/ui/shared'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

export function HistoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [jobType, setJobType] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' | 'completed' | 'failed' | 'processing'
  const [timeOrder, setTimeOrder] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    setLoading(true)
    historyApi.list({ page_size: 100, job_type: jobType || undefined })
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobType])

  const TABS = [
    { id: '', label: 'All Activities' },
    { id: 'profile', label: 'Voice Profiles' },
    { id: 'clone', label: 'Clone Jobs' },
    { id: 'generation', label: 'TTS Generations' },
    { id: 'detection', label: 'Deepfake Detections' },
    { id: 'live', label: 'Live Streams' },
    { id: 'quality', label: 'Quality Lab' },
    { id: 'agent', label: 'Voice Agents' },
  ]

  const STATUSES = [
    { id: '', label: 'All Statuses' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
    { id: 'processing', label: 'In Queue' },
  ]

  // Filter & sort logic on client
  const processed = items.filter((item: any) => {
    // Search query
    if (filter) {
      const query = filter.toLowerCase()
      const summaryMatch = (item.summary || '').toLowerCase().includes(query)
      const typeMatch = (item.type || '').toLowerCase().includes(query)
      const langMatch = (item.language || '').toLowerCase().includes(query)
      if (!summaryMatch && !typeMatch && !langMatch) return false
    }

    // Status filter
    if (statusFilter) {
      if (statusFilter === 'completed') {
        if (item.status !== 'completed' && item.status !== 'success') return false
      } else if (statusFilter === 'failed') {
        if (item.status !== 'failed') return false
      } else if (statusFilter === 'processing') {
        if (item.status !== 'processing' && item.status !== 'queued' && item.status !== 'pending') return false
      }
    }
    return true
  })

  // Sort logic
  processed.sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0
    return timeOrder === 'desc' ? tB - tA : tA - tB
  })

  const ICON_MAP: Record<string, any> = { 
    generation: Wand2, 
    detection: Shield, 
    clone: Zap,
    profile: User,
    live: Radio,
    quality: Award,
    agent: Bot
  }

  const COLOR_MAP: Record<string, string> = { 
    generation: '#7c3aed', 
    detection: '#dc2626', 
    clone: '#2563eb',
    profile: '#16a34a',
    live: '#0891b2',
    quality: '#d97706',
    agent: '#db2777'
  }

  // Type Tag badge renderer
  const TypeTag = ({ type }: { type: string }) => {
    const color = COLOR_MAP[type] || '#4b5563'
    const Icon = ICON_MAP[type] || History
    let displayLabel = type === 'generation' ? 'TTS' : type === 'quality' ? 'Quality' : type;
    
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wider border whitespace-nowrap"
        style={{ 
          background: `color-mix(in srgb, ${color} 6%, #ffffff)`, 
          borderColor: `color-mix(in srgb, ${color} 15%, #e5e7eb)`,
          color: color
        }}
      >
        <Icon size={10} />
        {displayLabel}
      </span>
    )
  }

  // Status Tag badge renderer
  const StatusTag = ({ status }: { status: string }) => {
    const isSuccess = status === 'completed' || status === 'success'
    const isFailed = status === 'failed'
    const isProcessing = status === 'processing' || status === 'queued' || status === 'pending'
    
    let label = status.toUpperCase()
    let classes = 'text-gray-500 bg-gray-50 border-gray-200'
    
    if (isSuccess) {
      classes = 'text-green-700 bg-green-50/50 border-green-200'
      label = 'SUCCESS'
    } else if (isFailed) {
      classes = 'text-rose-700 bg-rose-50/50 border-rose-200'
      label = 'FAILED'
    } else if (isProcessing) {
      classes = 'text-blue-700 bg-blue-50/50 border-blue-200'
      label = 'QUEUED'
    }
    
    return (
      <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border whitespace-nowrap", classes)}>
        {label}
      </span>
    )
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <Reveal>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3"><History className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-600 to-gray-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>History</h1></div>
            <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Your activity trail across Vocaria services.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                placeholder="Search summaries..." 
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all bg-white" 
              />
            </div>
            
            {/* Status Select */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shrink-0">
              <Filter size={11} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs font-700 uppercase tracking-wider bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Time Order Select */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shrink-0">
              <Clock size={11} className="text-gray-400" />
              <select
                value={timeOrder}
                onChange={e => setTimeOrder(e.target.value as any)}
                className="text-xs font-700 uppercase tracking-wider bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Categories Horizontal Tabs */}
      <Reveal delay={0.02}>
        <div className="border-b border-gray-200 pb-2 overflow-x-auto flex gap-2 no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setJobType(tab.id)
                setStatusFilter('')
              }}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-800 tracking-wider uppercase border transition-all whitespace-nowrap",
                jobType === tab.id
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-500 border-gray-200 hover:text-black hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Table Container Card */}
      <Reveal delay={0.04}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="flex justify-center items-center py-20"><Spinner size={24} /></div>
          ) : processed.length === 0 ? (
            <EmptyState 
              icon={History} 
              title="No activities found" 
              description={jobType ? "No execution history recorded in this category yet." : "Try resetting your search query or status filter."} 
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase font-800 tracking-wider">
                    <th className="py-3 px-4">Activity details</th>
                    <th className="py-3 px-4 text-center">Category</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Result</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processed.map((item: any) => {
                    const link = 
                      item.type === 'detection' ? `/detection/${item.id}` : 
                      item.type === 'generation' ? `/history` : 
                      item.type === 'clone' ? `/clone` : 
                      item.type === 'profile' ? `/voices` :
                      item.type === 'live' ? `/detection` :
                      item.type === 'quality' ? `/quality` : `/agent`

                    return (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50 transition-colors text-xs">
                        {/* Summary details */}
                        <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                          <div className="flex flex-col">
                            <span className="font-600 text-gray-900 line-clamp-1">
                              {item.summary || item.filename || item.verdict || item.mode || '—'}
                            </span>
                            <span className="text-[11px] text-gray-500 mt-0.5">
                              {item.type === 'profile' && `Language: ${item.language || 'Global'} · Gender: ${item.gender || 'Unknown'}`}
                              {item.type === 'clone' && `Mode: ${item.mode || 'zero_shot'}`}
                              {item.type === 'generation' && `Language: ${item.language || 'en'} · Length: ${item.summary?.length || 0} chars`}
                              {item.type === 'detection' && `File: ${item.filename || 'unknown'}`}
                              {item.type === 'live' && `Diarization: ${item.diarization_completed ? 'completed' : 'none'}`}
                              {item.type === 'quality' && `Suitability: ${item.suitability || 'Calculated'}`}
                              {item.type === 'agent' && `Duration: ${item.duration_seconds?.toFixed(0)}s`}
                            </span>
                            {item.status === 'failed' && item.error_message && (
                              <span className="text-rose-600 text-[10px] font-600 mt-1 flex items-center gap-1 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={item.error_message}>
                                <AlertTriangle size={9} className="shrink-0" /> <span className="truncate">{item.error_message}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category Tag */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <TypeTag type={item.type} />
                        </td>

                        {/* Status Tag */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <StatusTag status={item.status} />
                        </td>

                        {/* Outcome Metrics */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-600">
                          {item.type === 'detection' && item.verdict ? (
                            <VerdictBadge verdict={item.verdict} />
                          ) : item.type === 'live' && item.verdict ? (
                            <VerdictBadge verdict={item.verdict} />
                          ) : item.type === 'quality' && item.quality_score ? (
                            <span className="px-2 py-0.5 rounded text-xs font-700 bg-green-50 text-green-700 border border-green-100">
                              {(item.quality_score * 100).toFixed(0)}%
                            </span>
                          ) : item.type === 'clone' && item.quality_score ? (
                            <span className="px-2 py-0.5 rounded text-xs font-700 bg-blue-50 text-blue-700 border border-blue-100">
                              {(item.quality_score * 100).toFixed(0)}%
                            </span>
                          ) : item.type === 'agent' && item.messages_count ? (
                            <span className="text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                              {item.messages_count} msgs
                            </span>
                          ) : item.duration_seconds ? (
                            <span className="text-gray-500 font-500">
                              {item.duration_seconds.toFixed(0)}s
                            </span>
                          ) : '—'}
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs text-gray-400 font-500">
                          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '—'}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link 
                            to={link} 
                            className="inline-flex items-center justify-center p-1.5 border border-gray-200 rounded-lg hover:border-black text-gray-400 hover:text-black transition-all bg-white"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  )
}

export default HistoryPage
