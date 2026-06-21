import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { detectionApi, getErrorMessage } from '@/api/client'
import { VerdictBadge, StatusBadge } from '@/components/ui/shared'
import { Spinner } from '@/components/ui/shared'

export function RecentDetections({ mode }: { mode?: 'file' | 'stream' }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadJobs = () => {
    setLoading(true)
    detectionApi.list({ page: 1, page_size: 5, mode })
      .then(d => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleDeleteJob = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    if (!window.confirm('Permanently delete this detection job?')) return;
    try {
      await detectionApi.delete(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      toast.success('Deleted permanently');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading && jobs.length === 0) return <div className="min-h-[200px] flex items-center justify-center"><Spinner /></div>
  if (!jobs.length && !loading) return null

  return (
    <div className="card rounded-2xl p-6 min-h-[200px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-700 text-surface-900">Recent Detections</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button onClick={() => setJobs([])} className="hover:bg-gray-200" style={{ padding: '4px 8px', border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, fontSize: 11, fontWeight: 500, transition: 'all 0.1s' }}>
              <X size={12} /> Clear List
            </button>
            <button onClick={loadJobs} style={{ padding: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex', borderRadius: 6 }}>
              <RefreshCw size={13} />
            </button>
          </div>
          <Link to="/profile?tab=detected" className="text-xs text-brand-600 font-600">View all</Link>
        </div>
      </div>
      <div className="space-y-2">
        {jobs.map(j => (
          <Link key={j.id} to={`/detection/${j.id}`}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 transition-all group">
            <div className="w-[120px] flex-shrink-0">
              <VerdictBadge verdict={j.verdict} />
            </div>
            <div className="flex-1 min-w-0 pr-4">
               <div className="text-sm font-700 text-surface-800 truncate font-mono">{j.id}</div>
               <div className="text-xs text-surface-500 truncate">{j.original_filename || (j.mode === 'stream' ? 'Live Session' : 'Unknown file')}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-surface-500 flex-shrink-0">
              <span className="w-12 text-right">{j.duration_seconds ? j.duration_seconds.toFixed(1) + 's' : '-'}</span>
              <span className="w-40 text-right tabular-nums">{new Date(j.created_at).toLocaleString()}</span>
              <div className="w-[88px] flex justify-end">
                <StatusBadge status={j.status} />
              </div>
              <button 
                onClick={(e) => handleDeleteJob(e, j.id)} 
                className="w-8 flex justify-center p-1.5 text-danger-500 opacity-50 hover:opacity-100 transition-opacity rounded-md hover:bg-danger-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
