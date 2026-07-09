import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Cpu, Zap, BarChart2, Clock, Activity, Server,
  RefreshCw, CheckCircle, XCircle, AlertTriangle, Info, TrendingUp, Download, Calculator
} from 'lucide-react'
import { benchmarksApi } from '@/api/client'
import { Reveal, StaggerGroup, StaggerItem, Spinner, CountUp } from '@/components/ui/shared'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts'
import toast from 'react-hot-toast'

// Dynamic data is loaded from the backend

function ModelCard({ m, selected, onClick }: { m: any; selected: boolean; onClick: () => void }) {
  const isGen = m.type === 'Generation' || m.type === 'Cloning';
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -1 }}
      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
        selected ? 'bg-black/[0.02]' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ borderColor: selected ? m.color : undefined, background: selected ? `color-mix(in srgb, ${m.color} 5%, transparent)` : undefined }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-black mb-0.5">{m.name}</div>
          <div className="text-[11px] font-medium text-gray-400 italic">{m.paper}</div>
        </div>
        <span className={`badge ${m.type === 'Ensemble' ? 'badge-blue' : isGen ? 'badge-pink' : 'badge-gray'}`}>{m.type}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isGen ? 'Intelligibility' : 'Accuracy'}</div>
          <div className="text-base font-extrabold text-green-600">{m.accuracy.toFixed(1)}%</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isGen ? 'WER (Est.)' : 'EER'}</div>
          <div className="text-base font-extrabold" style={{ color: m.eer < 2 ? '#16a34a' : m.eer < 5 ? '#d97706' : '#dc2626' }}>{m.eer}%</div>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
        <span>⚡ {m.avg_latency_ms}ms / chunk</span>
        <span>🖥 {m.device.includes('GPU') ? 'GPU' : 'CPU'}</span>
      </div>
    </motion.div>
  )
}

export default function BenchmarksPage() {
  const [systemStats, setSystemStats] = useState<any>(null)
  const [loadingSystem, setLoadingSystem] = useState(true)
  const [modelBenchmarks, setModelBenchmarks] = useState<any[]>([])
  const [latencyData, setLatencyData] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<any | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'models' | 'latency' | 'hardware' | 'validation' | 'calculator'>('models')
  const [estVolume, setEstVolume] = useState<number>(10) // in thousands of requests

  const loadSystem = async () => {
    setRefreshing(true)
    try {
      const [sys, live] = await Promise.all([
        benchmarksApi.system(),
        benchmarksApi.live()
      ])
      setSystemStats(sys)
      setModelBenchmarks(live.models)
      setLatencyData(live.latency_data)
      if (live.models && live.models.length > 3) {
        setSelectedModel(live.models[3])
      } else if (live.models && live.models.length > 0) {
        setSelectedModel(live.models[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSystem(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadSystem() }, [])

  const radarData = selectedModel ? [
    { metric: 'Accuracy', value: selectedModel.accuracy },
    { metric: 'F1 Score', value: selectedModel.f1 * 100 },
    { metric: 'AUC-ROC', value: selectedModel.auc_roc * 100 },
    { metric: 'Speed', value: Math.max(0, 100 - selectedModel.avg_latency_ms * 0.5) },
    { metric: 'Low EER', value: Math.max(0, 100 - selectedModel.eer * 5) },
  ] : []

  const TABS = [
    { id: 'models',     label: 'Model Comparison', icon: Star },
    { id: 'latency',    label: 'Latency Profiles',  icon: Clock },
    { id: 'calculator', label: 'Cost Estimator',    icon: Calculator },
  ]

  return (
    <div className="w-full space-y-10 pb-12">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-2">
          <div>
            <div className="flex items-center gap-3"><Star className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-pink-500 animate-text-pan" style={{ fontFamily: 'Playfair Display', serif }}>Benchmarks</h1></div>
            <p className="text-gray-500 font-medium mt-2 text-sm md:text-base">
              Real performance metrics, latency profiles, and reproducible validation results.
            </p>
          </div>
          <button onClick={loadSystem} disabled={refreshing} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all whitespace-nowrap flex items-center gap-2">
            {refreshing ? <Spinner size={14} /> : <RefreshCw size={14} />} Refresh Live Data
          </button>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal delay={0.06}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-3)', borderRadius: 12, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: activeTab === t.id ? 600 : 500, background: activeTab === t.id ? 'var(--bg)' : 'transparent', color: activeTab === t.id ? 'var(--fg)' : 'var(--fg-4)', boxShadow: activeTab === t.id ? 'var(--sh)' : 'none', transition: 'all 0.14s' }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      <AnimatePresence mode="wait">
        {activeTab === 'models' && (
          <motion.div key="models" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Model grid */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-4">Click a model to compare</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {modelBenchmarks.map(m => (
                    <ModelCard key={m.name} m={m} selected={selectedModel?.name === m.name} onClick={() => setSelectedModel(m)} />
                  ))}
                  {modelBenchmarks.length === 0 && (
                    <div className="text-sm text-gray-500 font-medium">Loading live benchmark data...</div>
                  )}
                </div>

                {/* Accuracy comparison bar chart */}
                <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6">
                  <h3 className="text-sm font-bold text-black mb-4">Accuracy/Intelligibility vs EER/WER Comparison</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={modelBenchmarks.map(m => ({ name: m.name.replace(' Detector', '').replace('/', '/'), acc: m.accuracy, eer: m.eer }))} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" domain={[85, 100]} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 15]} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}
                        formatter={(v: any, n: string) => [n === 'acc' ? `${parseFloat(v).toFixed(2)}%` : `${parseFloat(v).toFixed(2)}%`, n === 'acc' ? 'Acc/Intell.' : 'EER/WER']} />
                      <Bar yAxisId="left" dataKey="acc" name="Accuracy" radius={[4, 4, 0, 0]}>
                        {modelBenchmarks.map((m, i) => <Cell key={i} fill={m.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Selected model detail */}
              {selectedModel && (
                <div className="flex flex-col gap-6">
                  <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${selectedModel.color} 12%, transparent)` }}>
                        <Star size={18} style={{ color: selectedModel.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black">{selectedModel.name}</div>
                        <div className="text-xs font-semibold text-gray-400 italic mt-0.5">{selectedModel.paper}</div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed mb-4">{selectedModel.description}</p>
                    <div className="flex flex-col gap-3">
                      {[
                        { l: (selectedModel.type === 'Generation' || selectedModel.type === 'Cloning') ? 'Intelligibility / MOS %' : 'Accuracy', v: `${selectedModel.accuracy.toFixed(2)}%`, c: 'text-green-600 font-bold' },
                        { l: (selectedModel.type === 'Generation' || selectedModel.type === 'Cloning') ? 'Word Error Rate (WER) Est.' : 'Equal Error Rate (EER)', v: `${selectedModel.eer}%`, c: selectedModel.eer < 2 ? 'text-green-600 font-bold' : 'text-amber-600 font-bold' },
                        { l: 'F1 Score', v: selectedModel.f1.toFixed(4), c: 'text-green-600 font-bold' },
                        { l: 'AUC-ROC', v: selectedModel.auc_roc.toFixed(4), c: 'text-green-600 font-bold' },
                        { l: 'Avg Latency / chunk', v: `${selectedModel.avg_latency_ms} ms`, c: 'text-black font-semibold' },
                        { l: 'Est. API Cost (1K)', v: selectedModel.cost_per_1k ? `$${selectedModel.cost_per_1k.toFixed(2)}` : 'N/A', c: 'text-green-700 font-bold' },
                        { l: 'Best For', v: selectedModel.use_cases ? selectedModel.use_cases.join(', ') : 'General Purpose', c: 'text-gray-800 font-medium italic' },
                        { l: 'Supported Languages', v: selectedModel.languages ? selectedModel.languages.join(', ') : 'English', c: 'text-gray-600 font-semibold' },
                        { l: 'Max Context Size', v: selectedModel.max_input || 'N/A', c: 'text-gray-600 font-semibold' },
                        { l: 'Test Dataset', v: selectedModel.dataset, c: 'text-gray-600 font-semibold' },
                        { l: 'Hardware', v: selectedModel.device, c: 'text-gray-600 font-semibold' },
                      ].map(r => (
                        <div key={r.l} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 text-xs">
                          <span className="text-gray-500 font-medium">{r.l}</span>
                          <span className={r.c}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Radar */}
                  <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3">Performance Radar</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="var(--border-2)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--fg-4)', fontSize: 11, fontWeight: 600 }} />
                        <Radar name="Score" dataKey="value" stroke={selectedModel?.color || "#ec4899"} fill={selectedModel?.color || "#ec4899"} fillOpacity={0.2} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} formatter={(v: any) => [`${parseFloat(v).toFixed(1)} / 100`, '']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'latency' && (
          <motion.div key="latency" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6 mb-6">
              <h3 className="text-sm font-bold text-black mb-1">Inference Latency by Audio Length</h3>
              <p className="text-xs font-medium text-gray-500 mb-6">Time to compute detection score per audio segment (milliseconds). Measured on NVIDIA A100 for GPU models, Intel Xeon for CPU models.</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={latencyData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" vertical={false} />
                  <XAxis dataKey="segment" tick={{ fontSize: 11, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} formatter={(v: any) => [`${v} ms`, '']} />
                  <Legend iconType="circle" iconSize={8} />
                  {['kokoro', 'parler', 'chatterbox', 'wav2vec2','squim','pyannote','pipeline'].map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} name={key.charAt(0).toUpperCase()+key.slice(1)}
                      stroke={modelBenchmarks[i]?.color ?? '#94a3b8'} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6">
              <h3 className="text-sm font-bold text-black mb-4">Latency Summary</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>0.5s chunk</th>
                    <th>1s chunk</th>
                    <th>2s chunk</th>
                    <th>5s chunk</th>
                    <th>Device</th>
                    <th>Real-time factor</th>
                  </tr>
                </thead>
                <tbody>
                  {modelBenchmarks.map(m => (
                    <tr key={m.name}>
                      <td><span style={{ fontWeight: 600, color: m.color }}>{m.name}</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{(m.avg_latency_ms * 0.5).toFixed(0)} ms</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{m.avg_latency_ms} ms</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{(m.avg_latency_ms * 2).toFixed(0)} ms</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{(m.avg_latency_ms * 5).toFixed(0)} ms</span></td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10.5 }}>{m.device.includes('GPU') ? 'GPU' : 'CPU'}</span></td>
                      <td>
                        <span className={`badge ${(m.avg_latency_ms / 1000) < 1 ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10.5 }}>
                          {(1000 / m.avg_latency_ms).toFixed(1)}x RT
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'calculator' && (
          <motion.div key="calculator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-black mb-1" style={{ fontFamily: 'Playfair Display', serif }}>API Cost Estimator</h3>
                  <p className="text-xs font-medium text-gray-500">Estimate your monthly spend based on request volume.</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <Calculator size={24} />
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-gray-700">Estimated Monthly Requests</label>
                  <span className="text-xl font-extrabold text-black">{estVolume.toLocaleString()}K <span className="text-xs text-gray-400 font-medium">({(estVolume * 1000).toLocaleString()})</span></span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="1000" 
                  step="1"
                  value={estVolume}
                  onChange={(e) => setEstVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>1K</span>
                  <span>500K</span>
                  <span>1M</span>
                </div>
              </div>

              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Cost / 1K Req</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Est. Monthly Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modelBenchmarks.map((m) => {
                      const costPer1k = m.cost_per_1k || 0;
                      const monthlyCost = costPer1k * estVolume;
                      return (
                        <tr key={m.name} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                              <span className="text-sm font-bold text-gray-900">{m.name}</span>
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2">{m.type}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-gray-600">${costPer1k.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-base font-extrabold text-black">${monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

