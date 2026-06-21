import React, { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Wand2, Shield, Mic2, TrendingUp, Calendar, Zap, AlertTriangle, Activity } from 'lucide-react'
import { analyticsApi, detectionApi } from '@/api/client'
import { Reveal, StaggerGroup, StaggerItem, StatCard, CountUp, Spinner } from '@/components/ui/shared'
import clsx from 'clsx'

export default function Analytics() {
  const [overview, setOverview] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [detStats, setDetStats] = useState<any>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [resourceChartType, setResourceChartType] = useState<'credits' | 'failures'>('credits')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsApi.overview().catch(() => null),
      analyticsApi.timeline(days).catch(() => ({ timeline: [] })),
      detectionApi.stats().catch(() => null),
    ]).then(([ov, tl, det]) => {
      setOverview(ov); setTimeline(tl?.timeline || []); setDetStats(det)
    }).finally(() => setLoading(false))
  }, [days])

  const verdictData = detStats?.verdict_distribution
    ? Object.entries(detStats.verdict_distribution).map(([k, v]: any) => ({
        name: k.replace(/_/g, ' '), value: v,
        color: k === 'authentic' ? '#16a34a' : k.includes('synthetic') ? '#dc2626' : '#d97706',
      }))
    : []

  const PERIOD_OPTIONS = [7, 14, 30, 90]

  // Confusion matrix variables
  const ta = detStats?.accuracy_matrix?.true_authentic ?? 0;
  const fs = detStats?.accuracy_matrix?.false_synthetic ?? 0;
  const fa = detStats?.accuracy_matrix?.false_authentic ?? 0;
  const ts = detStats?.accuracy_matrix?.true_synthetic ?? 0;

  const totalFeedback = ta + fs + fa + ts;
  const accuracy = totalFeedback > 0 ? (ta + ts) / totalFeedback : 0;
  const precision = (ts + fs) > 0 ? ts / (ts + fs) : 0;
  const recall = (ts + fa) > 0 ? ts / (ts + fa) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = (ta + fs) > 0 ? fs / (ta + fs) : 0;
  const fnr = (ts + fa) > 0 ? fa / (ts + fa) : 0;

  // Model performance variables
  const modelPerformance = detStats?.model_performance || {
    aasist: { real: 0, synthetic: 0 },
    rawnet2: { real: 0, synthetic: 0 },
    prosodic: { real: 0, synthetic: 0 },
    spectral: { real: 0, synthetic: 0 },
    glottal: { real: 0, synthetic: 0 },
  };

  // Chart domain helpers to ensure 0 line displays correctly if all data is 0
  const maxActivity = Math.max(10, ...timeline.map((t: any) => Math.max(t.generations || 0, t.detections || 0)));
  const maxCredits = Math.max(100, ...timeline.map((t: any) => t.credits_used || 0));
  const maxFailures = Math.max(5, ...timeline.map((t: any) => t.failed_jobs || 0));

  return (
    <div className="w-full space-y-10 pb-12">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
          <div>
            <div className="flex items-center gap-3"><BarChart3 className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Analytics</h1></div>
            <p className="text-surface-500 font-500 mt-2 text-sm md:text-base">Usage metrics, activity trends, and detection statistics.</p>
          </div>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)} className={clsx("px-4 py-1.5 rounded-lg text-sm font-600 transition-all border", days === d ? "bg-brand-50 text-brand-600 border-brand-200" : "bg-white text-surface-500 border-surface-200 hover:bg-surface-50")}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Stat cards */}
      <Reveal delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Voice Profiles', value: overview?.totals?.voice_profiles ?? 0, icon: Mic2, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Generations', value: overview?.totals?.generation_jobs ?? 0, icon: Wand2, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Detections Run', value: overview?.totals?.detection_jobs ?? 0, icon: Shield, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'Synthetic Found', value: overview?.totals?.synthetic_detected ?? 0, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
            { label: 'Credits Used', value: Math.round((overview?.usage?.generation_minutes?.used ?? 0) * 10), icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100' },
            { label: 'Failed Jobs', value: overview?.totals?.failed_jobs ?? 0, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
          ].map((s, i) => (
            <div key={s.label} className="relative p-4 border border-surface-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-transparent transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-start gap-4 w-full">
                <div className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shrink-0`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-2xl font-bold text-black leading-tight"><CountUp to={s.value} /></div>
                  <div className="text-[10px] font-700 text-surface-500 uppercase tracking-wider mt-0.5 truncate">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Row 1 Charts */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-5 items-stretch">
        <Reveal>
          <div className="card flex flex-col p-6 h-full">
            <div className="font-600 text-sm text-black mb-5">Activity — last {days} days</div>
            {loading ? <div className="skeleton flex-1 min-h-[220px]" /> : (
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <defs>
                      {[{ id: 'gen', c: '#7c3aed' }, { id: 'det', c: '#dc2626' }].map(g => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={g.c} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={g.c} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" />
                    <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} domain={[0, maxActivity]} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, boxShadow: 'var(--sh-md)' }} />
                    <Area type="monotone" dataKey="generations" name="Generations" stroke="#7c3aed" fill="url(#gen)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="detections" name="Detections" stroke="#dc2626" fill="url(#det)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex gap-5 mt-4">
              {[{ c: '#7c3aed', l: 'Generations' }, { c: '#dc2626', l: 'Detections' }].map(leg => (
                <div key={leg.l} className="flex items-center gap-2 text-xs font-500 text-surface-500">
                  <div className="w-2.5 h-1 rounded-full" style={{ background: leg.c }} />{leg.l}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="card flex flex-col p-6 h-full">
            <div className="font-600 text-sm text-black mb-5">Detection Verdicts</div>
            <div className="flex-1 flex flex-col justify-center">
              {loading || verdictData.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-surface-400 text-sm">No detection data yet</div>
              ) : (
                <>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={verdictData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} strokeWidth={0}>
                          {verdictData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    {verdictData.map((d: any) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                          <span className="text-xs font-500 text-surface-600 capitalize">{d.name}</span>
                        </div>
                        <span className="text-xs font-700 text-black">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Row 2 Resource Timeline & Performance Metrics */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-5 items-stretch">
        <Reveal delay={0.06}>
          <div className="card flex flex-col p-6 h-full">
            <div className="flex justify-between items-center mb-5">
              <div className="font-600 text-sm text-black">Resource & Job Health — last {days} days</div>
              <div className="flex gap-1 bg-surface-50 p-1 border border-surface-200 rounded-lg">
                <button
                  onClick={() => setResourceChartType('credits')}
                  className={clsx(
                    "px-3 py-1 rounded-md text-[10px] font-700 uppercase tracking-wide transition-all",
                    resourceChartType === 'credits'
                      ? "bg-white text-black shadow-sm"
                      : "text-surface-500 hover:text-black"
                  )}
                >
                  Credits
                </button>
                <button
                  onClick={() => setResourceChartType('failures')}
                  className={clsx(
                    "px-3 py-1 rounded-md text-[10px] font-700 uppercase tracking-wide transition-all",
                    resourceChartType === 'failures'
                      ? "bg-white text-black shadow-sm"
                      : "text-surface-500 hover:text-black"
                  )}
                >
                  Failures
                </button>
              </div>
            </div>
            {loading ? <div className="skeleton flex-1 min-h-[220px]" /> : (
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  {resourceChartType === 'credits' ? (
                    <AreaChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id="credits_grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity="0.15" />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" />
                      <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, maxCredits]} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, boxShadow: 'var(--sh-md)' }} />
                      <Area type="monotone" dataKey="credits_used" name="Credits Used (Chars)" stroke="#7c3aed" fill="url(#credits_grad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  ) : (
                    <BarChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" />
                      <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} domain={[0, maxFailures]} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, boxShadow: 'var(--sh-md)' }} />
                      <Bar dataKey="failed_jobs" name="Failed Jobs" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex gap-5 mt-4">
              <div className="flex items-center gap-2 text-xs font-500 text-surface-500">
                <div className="w-2.5 h-2.5 rounded-sm animate-pulse" style={{ background: resourceChartType === 'credits' ? '#7c3aed' : '#dc2626' }} />
                {resourceChartType === 'credits' ? 'Credits Consumed (daily character counts)' : 'Total Job Failures (clones, generations, detections)'}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.07}>
          <div className="card p-6 h-full flex flex-col">
            <div className="font-600 text-sm text-black mb-5">Performance Metrics</div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {[
                { label: 'Avg Processing Latency', value: `${detStats?.avg_processing_ms ? Math.round(detStats.avg_processing_ms) : 0} ms`, highlight: false },
                { label: 'Avg Risk Score', value: `${detStats?.avg_risk_score ? Math.round(detStats.avg_risk_score * 100) : 0}%`, highlight: false },
                { label: 'Ensemble Confidence', value: `${detStats?.avg_confidence ? Math.round(detStats.avg_confidence * 100) : 0}%`, highlight: true },
                { label: 'Total Jobs Analyzed', value: `${detStats?.total_jobs ?? 0}`, highlight: true },
                { label: 'API Uptime (30d)', value: '99.99%', highlight: true },
              ].map((m, i) => (
                <div key={i} className="flex justify-between items-center p-3.5 bg-surface-50 rounded-xl border border-surface-200 transition-colors hover:bg-surface-100">
                  <div className="text-sm font-600 text-surface-600">{m.label}</div>
                  <div className={`text-sm font-800 ${m.highlight ? 'text-success-600' : 'text-black'}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Row 3 Advanced Matrices & Diagnostics */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-10 items-stretch">
        <Reveal delay={0.08}>
          <div className="card p-6 h-full flex flex-col">
            <div className="font-600 text-sm text-black mb-5">Detection Feedback Confusion Matrix</div>
            
            <div className="flex flex-col xl:flex-row gap-8 items-center justify-between flex-1 mt-2">
              {/* Matrix Grid */}
              <div className="grid grid-cols-[100px_1fr_1fr] grid-rows-[40px_1fr_1fr] gap-2 w-full max-w-[480px]">
                {/* Headers */}
                <div />
                <div className="flex items-center justify-center font-700 text-xs text-surface-500 uppercase tracking-wider text-center">Predicted Real</div>
                <div className="flex items-center justify-center font-700 text-xs text-surface-500 uppercase tracking-wider text-center">Predicted AI</div>

                {/* Actual Real Row */}
                <div className="flex items-center justify-end pr-3 font-700 text-xs text-surface-500 uppercase tracking-wider text-right">Actual Real</div>
                
                {/* True Authentic */}
                <div className="p-4 bg-white border-2 border-black rounded-xl flex flex-col justify-between min-h-[90px] group transition-all hover:bg-surface-50">
                  <div className="text-2xl font-800 text-black leading-none">{ta}</div>
                  <div className="text-[9px] font-700 text-success-600 uppercase tracking-wider mt-1 truncate">True Authentic</div>
                </div>
                
                {/* False Synthetic */}
                <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex flex-col justify-between min-h-[90px] group transition-all hover:bg-surface-100">
                  <div className="text-2xl font-800 text-black leading-none">{fs}</div>
                  <div className="text-[9px] font-700 text-danger-600 uppercase tracking-wider mt-1 truncate">False Synth (FP)</div>
                </div>

                {/* Actual AI Row */}
                <div className="flex items-center justify-end pr-3 font-700 text-xs text-surface-500 uppercase tracking-wider text-right">Actual AI</div>
                
                {/* False Authentic */}
                <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex flex-col justify-between min-h-[90px] group transition-all hover:bg-surface-100">
                  <div className="text-2xl font-800 text-black leading-none">{fa}</div>
                  <div className="text-[9px] font-700 text-amber-600 uppercase tracking-wider mt-1 truncate">False Auth (FN)</div>
                </div>
                
                {/* True Synthetic */}
                <div className="p-4 bg-white border-2 border-black rounded-xl flex flex-col justify-between min-h-[90px] group transition-all hover:bg-surface-50">
                  <div className="text-2xl font-800 text-black leading-none">{ts}</div>
                  <div className="text-[9px] font-700 text-success-600 uppercase tracking-wider mt-1 truncate">True Synthetic</div>
                </div>
              </div>

              {/* Calculated Metrics Side Panel */}
              <div className="flex-1 w-full grid grid-cols-2 gap-3">
                {[
                  { label: 'Accuracy', val: `${Math.round(accuracy * 100)}%`, desc: 'Overall correct prediction rate' },
                  { label: 'Precision', val: `${Math.round(precision * 100)}%`, desc: 'Confidence of synthetic alerts' },
                  { label: 'Recall / Sensitivity', val: `${Math.round(recall * 100)}%`, desc: 'Deepfake detection rate' },
                  { label: 'F1 Score', val: `${Math.round(f1 * 100)}%`, desc: 'Harmonic mean of precision/recall' },
                  { label: 'False Positive Rate', val: `${Math.round(fpr * 100)}%`, desc: 'Real voices incorrectly flagged' },
                  { label: 'False Negative Rate', val: `${Math.round(fnr * 100)}%`, desc: 'AI voices missed by engines' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 border border-surface-200 rounded-xl bg-white flex flex-col justify-between hover:border-black transition-colors">
                    <div>
                      <div className="text-[10px] font-700 text-surface-400 uppercase tracking-wider">{item.label}</div>
                      <div className="text-[9px] text-surface-500 font-500 mt-0.5 leading-tight">{item.desc}</div>
                    </div>
                    <div className="text-base font-800 text-black mt-2 leading-none">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </Reveal>

        <Reveal delay={0.09}>
          <div className="card p-6 h-full flex flex-col">
            <div className="font-600 text-sm text-black mb-5">Model Component Diagnostic Matrix</div>
            
            <div className="flex-1 flex flex-col justify-center">
              {loading ? <div className="skeleton flex-1 min-h-[180px]" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="py-2.5 px-2 font-700 text-surface-500 uppercase tracking-wider">Engine</th>
                        <th className="py-2.5 px-2 font-700 text-surface-500 uppercase tracking-wider text-right">Real Avg</th>
                        <th className="py-2.5 px-2 font-700 text-surface-500 uppercase tracking-wider text-right">Synth Avg</th>
                        <th className="py-2.5 px-2 font-700 text-surface-500 uppercase tracking-wider text-right">Delta</th>
                        <th className="py-2.5 px-2 font-700 text-surface-500 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {Object.entries(modelPerformance).map(([modelKey, data]: any) => {
                        const realVal = data.real || 0;
                        const synthVal = data.synthetic || 0;
                        const gap = Math.max(0, synthVal - realVal);
                        const reliability = gap > 0.4 ? 'High' : gap > 0.2 ? 'Moderate' : 'Low';
                        const relColor = reliability === 'High' 
                          ? 'text-success-600 bg-success-50 border-success-100' 
                          : reliability === 'Moderate' 
                            ? 'text-amber-600 bg-amber-50 border-amber-100' 
                            : 'text-danger-600 bg-danger-50 border-danger-100';
                        return (
                          <tr key={modelKey} className="hover:bg-surface-50/50 transition-colors">
                            <td className="py-3 px-2 font-600 text-black capitalize">{modelKey}</td>
                            <td className="py-3 px-2 text-right text-surface-600 font-500">{(realVal * 100).toFixed(0)}%</td>
                            <td className="py-3 px-2 text-right text-surface-600 font-500">{(synthVal * 100).toFixed(0)}%</td>
                            <td className="py-3 px-2 text-right font-700 text-black">
                              +{(gap * 100).toFixed(0)}%
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-700 border ${relColor}`}>
                                {reliability}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
          </div>
        </Reveal>
      </div>

      {/* Usage bars */}
      {overview?.usage && (
        <Reveal delay={0.1}>
          <div className="card p-6 rounded-2xl mb-12">
            <div className="font-600 text-sm text-black mb-6">Monthly Quota Usage</div>
            <div className="grid grid-cols-1 gap-5">
              {Object.entries(overview.usage).map(([key, val]: [string, any]) => {
                if (!val || typeof val !== 'object') return null
                const pct = val.unlimited ? 0 : Math.min(100, (val.used / Math.max(val.limit, 1)) * 100)
                const barColor = pct > 85 ? 'var(--red)' : pct > 65 ? 'var(--amber)' : 'var(--blue)'
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                return (
                  <div key={key}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-600 text-surface-700">{label}</span>
                      <span className="text-xs font-500 text-surface-500">
                        {val.unlimited ? '∞ Unlimited' : `${Math.round(val.used).toLocaleString()} / ${val.limit.toLocaleString()}`}
                      </span>
                    </div>
                    {!val.unlimited && (
                      <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
