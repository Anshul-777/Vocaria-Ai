import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, Download, ChevronDown, ChevronRight, Activity, ShieldCheck, UserCircle, CreditCard, Key, Server, Settings, AlertCircle } from 'lucide-react'
import { auditApi } from '@/api/client'
import { format } from 'date-fns'

const ACTION_MAP: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  login:               { label: 'User Logged In',      icon: UserCircle,  color: '#059669', bg: '#ecfdf5' },
  logout:              { label: 'User Logged Out',     icon: UserCircle,  color: '#6b7280', bg: '#f3f4f6' },
  register:            { label: 'Account Created',     icon: ShieldCheck, color: '#2563eb', bg: '#eff6ff' },
  profile_update:      { label: 'Profile Updated',     icon: Settings,    color: '#4b5563', bg: '#f3f4f6' },
  plan_change:         { label: 'Plan Updated',        icon: CreditCard,  color: '#d97706', bg: '#fffbeb' },
  api_key_create:      { label: 'API Key Created',     icon: Key,         color: '#2563eb', bg: '#eff6ff' },
  api_key_revoke:      { label: 'API Key Revoked',     icon: Key,         color: '#dc2626', bg: '#fef2f2' },
  voice_create:        { label: 'Voice Created',       icon: FileText,    color: '#2563eb', bg: '#eff6ff' },
  voice_delete:        { label: 'Voice Deleted',       icon: FileText,    color: '#dc2626', bg: '#fef2f2' },
  clone_start:         { label: 'Clone Job Started',   icon: Activity,    color: '#7c3aed', bg: '#f5f3ff' },
  clone_complete:      { label: 'Clone Job Finished',  icon: Activity,    color: '#059669', bg: '#ecfdf5' },
  generation_start:    { label: 'Generation Started',  icon: Server,      color: '#7c3aed', bg: '#f5f3ff' },
  generation_complete: { label: 'Generation Finished', icon: Server,      color: '#059669', bg: '#ecfdf5' },
  detection_start:     { label: 'Detection Started',   icon: Activity,    color: '#d97706', bg: '#fffbeb' },
  detection_complete:  { label: 'Detection Finished',  icon: Activity,    color: '#059669', bg: '#ecfdf5' },
  export_create:       { label: 'Data Exported',       icon: Download,    color: '#2563eb', bg: '#eff6ff' },
  evidence_export:     { label: 'Evidence Exported',   icon: ShieldCheck, color: '#d97706', bg: '#fffbeb' },
  settings_change:     { label: 'Settings Changed',    icon: Settings,    color: '#4b5563', bg: '#f3f4f6' },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const PAGE_SIZE = 50

  const load = async (p: number) => {
    setLoading(true)
    auditApi.list({ page: p, page_size: PAGE_SIZE }).then(d => {
      setLogs(d.logs || [])
      setTotal(d.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const filtered = search
    ? logs.filter(l => JSON.stringify(l).toLowerCase().includes(search.toLowerCase()))
    : logs

  const exportLogs = () => {
    const csv = ['timestamp,action,resource_type,resource_id,ip_address,status',
      ...filtered.map((l: any) => `${l.created_at},${l.action},${l.resource_type || ''},${l.resource_id || ''},${l.ip_address || ''},${l.status}`)
    ].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'audit_logs.csv'; a.click()
  }

  return (
    <div className="w-full space-y-8 pb-24">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Audit Logs</h1></div>
          <p className="text-gray-500 font-medium text-sm md:text-base max-w-lg">
            A comprehensive, immutable ledger of all system events, user actions, and security operations. 
            <span className="text-black font-semibold ml-1">{total.toLocaleString()} total events.</span>
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search logs..." 
              className="pl-10 pr-4 py-2.5 w-64 border border-gray-200 rounded-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white" 
            />
          </div>
          <button 
            onClick={exportLogs} 
            className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </motion.div>

      {/* Main Table Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center p-32">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-32 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-black mb-2">No audit logs found</h3>
            <p className="text-gray-500 font-medium text-sm">System events and user actions will appear here once tracked.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-12"></th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Event</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Resource</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">IP Address</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log: any) => {
                  const meta = ACTION_MAP[log.action] || { label: log.action, icon: AlertCircle, color: '#6b7280', bg: '#f3f4f6' }
                  const Icon = meta.icon
                  const isExpanded = expandedId === log.id
                  const hasDetails = log.details && Object.keys(log.details).length > 0

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`group hover:bg-gray-50/50 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-6 py-4">
                          {hasDetails ? (
                            <button className="text-gray-400 hover:text-black transition-colors">
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          ) : (
                            <span className="w-4 inline-block"></span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg, color: meta.color }}>
                              <Icon size={14} strokeWidth={2.5} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{meta.label}</div>
                              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider font-mono">{log.action}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.resource_type ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-700 capitalize">{log.resource_type}</span>
                              {log.resource_id && <span className="text-xs font-mono text-gray-400">{log.resource_id.slice(0, 12)}...</span>}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            {log.ip_address || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">
                              {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy') : '—'}
                            </span>
                            <span className="text-xs font-medium text-gray-500">
                              {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss a') : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gray-50/50 border-t border-gray-100"
                          >
                            <td colSpan={6} className="px-16 py-6">
                              <div className="bg-gray-900 rounded-xl p-4 shadow-inner overflow-x-auto">
                                <pre className="text-xs font-mono text-green-400 leading-relaxed">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <span className="text-sm font-semibold text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} results
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1} 
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setPage(p => p + 1)} 
                    disabled={logs.length < PAGE_SIZE} 
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
