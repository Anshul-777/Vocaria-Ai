import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Phone, Clock, CreditCard, TrendingUp, ImageIcon, CalendarDays } from 'lucide-react'
import api from '@/api/client'

interface DashboardMetrics {
  total_calls: number
  avg_duration: string
  credits_used: number
  avg_credits: number
}

const METRIC_CARDS: { key: string; label: string; icon: any; format: (v: any) => string; iconBg: string; iconColor: string }[] = [
  {
    key: 'total_calls',
    label: 'Numbers of Calls',
    icon: Phone,
    format: (v: any) => String(v),
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    key: 'avg_duration',
    label: 'Average Duration',
    icon: Clock,
    format: (v: any) => String(v),
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    key: 'credits_used',
    label: 'Credits Used',
    icon: CreditCard,
    format: (v: any) => Number(v).toFixed(2),
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  {
    key: 'avg_credits',
    label: 'Average Credits Used',
    icon: TrendingUp,
    format: (v: any) => Number(v).toFixed(2),
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
]

const TIME_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'] as const

export default function WorkspaceDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_calls: 0,
    avg_duration: '00:00',
    credits_used: 0,
    avg_credits: 0,
  })
  const [timeRange, setTimeRange] = useState<(typeof TIME_RANGES)[number]>('Last 7 days')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const res = await api.get('/agents/dashboard/metrics', { params: { range: timeRange } })
        setMetrics(res.data)
      } catch {
        // Backend endpoint may not exist yet — use defaults
        setMetrics({ total_calls: 0, avg_duration: '00:00', credits_used: 0, avg_credits: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [timeRange])

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">My Workspace</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2">
          {TIME_RANGES.map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                timeRange === range
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRIC_CARDS.map((card, i) => {
          const Icon = card.icon
          const value = (metrics as any)[card.key]

          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.iconBg} mb-4`}>
                <Icon size={20} className={card.iconColor} strokeWidth={1.8} />
              </div>
              <div className="text-[12.5px] font-medium text-gray-500 mb-1">{card.label}</div>
              <div className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">
                {loading ? (
                  <div className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse" />
                ) : (
                  card.format(value)
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Chart Area — Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-8 min-h-[320px] flex flex-col items-center justify-center"
      >
        <div className="relative mb-5">
          {/* Concentric rings */}
          <div className="absolute inset-0 -m-6 rounded-full border border-dashed border-gray-200 opacity-60" />
          <div className="absolute inset-0 -m-12 rounded-full border border-dashed border-gray-100 opacity-40" />
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
            <ImageIcon size={28} className="text-gray-300" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">No data available</h3>
        <p className="text-[13px] text-gray-500 text-center max-w-[320px]">
          Metrics are not available for the selected time period. Create an agent and start receiving calls to see your analytics here.
        </p>
      </motion.div>
    </div>
  )
}
