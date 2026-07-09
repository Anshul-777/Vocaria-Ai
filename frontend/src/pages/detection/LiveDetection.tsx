import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Square, Mic, MicOff, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Reveal, WaveBars, VerdictBadge, StatusBadge } from '@/components/ui/shared'
import { RecentDetections } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

interface ChunkResult {
  chunk_idx: number
  timestamp_ms: number
  ensemble_score: number
  verdict: string
  is_suspicious: boolean
  model_scores: Record<string, number>
  speakers: {
    id: string
    probabilities: { ai_generated: number, real: number }
    is_suspicious: boolean
    duration_sec: number
  }[]
  flagged_reasons: string[]
  latency_ms: number
  session_stats: {
    total_chunks: number
    suspicious_count: number
    avg_score: number
    max_score: number
    session_verdict: string
    elapsed_seconds: number
  }
}

function ScoreGauge({ score, size = 96, label, tooltip, subtext = 'risk' }: { score: number; size?: number, label?: string, tooltip?: string, subtext?: string }) {
  const radius = (size - 12) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.min(1, score)
  const dashLen = circ * 0.75
  const offset = dashLen * (1 - pct)
  const color = score >= 0.65 ? '#dc2626' : score >= 0.4 ? '#d97706' : '#16a34a'

  return (
    <div className="flex flex-col items-center" title={tooltip}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-135deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-3)" strokeWidth={6} strokeDasharray={`${dashLen} ${circ - dashLen}`} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dashLen - offset} ${circ - (dashLen - offset)}`}
          strokeLinecap="round" style={{ transition: 'all 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{(score * 100).toFixed(0)}%</div>
        <div style={{ fontSize: size * 0.115, color: 'var(--surface-400)', marginTop: 2 }}>{subtext}</div>
      </div>
      </div>
      {label && <div className="text-[11px] font-600 text-surface-500 uppercase mt-2 tracking-wider">{label}</div>}
    </div>
  )
}

function ModelBar({ name, score }: { name: string; score?: number }) {
  const v = score ?? 0
  const color = v >= 0.65 ? '#dc2626' : v >= 0.4 ? '#d97706' : '#16a34a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 72, fontSize: 11.5, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: 5, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div animate={{ width: `${v * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }} />
      </div>
      <div style={{ width: 36, fontSize: 12, fontWeight: 700, textAlign: 'right', color, flexShrink: 0 }}>{(v * 100).toFixed(0)}%</div>
    </div>
  )
}

export default function LiveDetection() {
  const { accessToken } = useAuthStore()
  const [running, setRunning]         = useState(false)
  const [connected, setConnected]     = useState(false)
  const [countdown, setCountdown]     = useState<number | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [latest, setLatest]           = useState<ChunkResult | null>(null)
  const [timeline, setTimeline]       = useState<{ t: number; score: number }[]>([])
  const [sessionVerdict, setVerdict]  = useState<string>('–')
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [micAllowed, setMicAllowed]   = useState(true)
  const [threshold]                   = useState(0.65)
  const [detectedSpeakers, setDetectedSpeakers] = useState<Record<string, { id: string, probabilities: { ai_generated: number, real: number }, is_suspicious: boolean, duration_sec: number }>>({})
  
  const navigate = useNavigate()

  const [connecting, setConnecting]   = useState(false)

  const wsRef       = useRef<WebSocket | null>(null)
  const mediaRef    = useRef<MediaStream | null>(null)
  const processorRef= useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const chunkRef    = useRef<number>(0)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  const encodeFloat32ToWav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buf = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buf)
    const w = (off: number, v: number, b: number) => b === 2 ? view.setUint16(off, v, true) : b === 4 ? view.setUint32(off, v, true) : view.setUint8(off, v)
    const writeStr = (off: number, str: string) => [...str].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)))
    writeStr(0, 'RIFF'); w(4, 36 + samples.length * 2, 4); writeStr(8, 'WAVE')
    writeStr(12, 'fmt '); w(16, 16, 4); w(20, 1, 2); w(22, 1, 2)
    w(24, sampleRate, 4); w(28, sampleRate * 2, 4); w(32, 2, 2); w(34, 16, 2)
    writeStr(36, 'data'); w(40, samples.length * 2, 4)
    const vol = 0x8000
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(44 + i * 2, s < 0 ? s * vol : s * (vol - 1), true)
    }
    return buf
  }


  const startSession = useCallback(async () => {
    // Force cleanup any dangling state
    if (mediaRef.current) mediaRef.current.getTracks().forEach(t => t.stop())
    if (wsRef.current) wsRef.current.close()
    
    setError(null); setTimeline([]); setLatest(null); setVerdict('–'); setFeedbackGiven(false); setDetectedSpeakers({})
    chunkRef.current = 0
    setConnecting(true)

    // Mic permission
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }, video: false })
      mediaRef.current = stream
      setMicAllowed(true)
    } catch (err) {
      setMicAllowed(false)
      setConnecting(false)
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(`Microphone access failed: ${errMessage}. Make sure you are on localhost or HTTPS.`)
      return
    }

    // WebSocket
    let currentToken = accessToken
    if (!currentToken) {
      const { data: { session } } = await supabase.auth.getSession()
      currentToken = session?.access_token || null
    }

    const ws = new WebSocket(`${WS_URL}/ws/detect/stream?token=${currentToken}&session_id=live-${Date.now()}&confidence_threshold=${threshold}`)
    wsRef.current = ws

    ws.onopen = () => { setConnected(true); setRunning(true); setConnecting(false) }
    ws.onclose = (e) => { 
      setConnected(false)
      setRunning(false)
      setConnecting(false)
      processorRef.current?.disconnect()
      audioCtxRef.current?.close()
      mediaRef.current?.getTracks().forEach(t => t.stop())
      if (e.code !== 1000 && e.code !== 1005) {
        setError(`Connection closed unexpectedly (code: ${e.code}). The backend server might have crashed or rejected the connection.`)
      }
    }
    ws.onerror = () => {
      setConnecting(false)
      setError('WebSocket connection failed. Check your server is running.')
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'error') {
          setError(`Stream Error: ${msg.message}`)
        } else if (msg.type === 'chunk_result') {
          setLatest(msg)
          setTimeline(prev => [...prev.slice(-120), { t: chunkRef.current, score: msg.ensemble_score }])
          if (msg.session_stats?.session_verdict) setVerdict(msg.session_stats.session_verdict)
          
          if (msg.speakers && msg.speakers.length > 0) {
            setDetectedSpeakers(prev => {
              const next = { ...prev }
              msg.speakers.forEach((spk: any) => {
                if (!next[spk.id]) next[spk.id] = { ...spk }
                else {
                  next[spk.id].duration_sec += spk.duration_sec
                  next[spk.id].probabilities = spk.probabilities
                  if (spk.is_suspicious) next[spk.id].is_suspicious = true
                }
              })
              return next
            })
          }
        } else if (msg.type === 'session_summary') {
          if (msg.job_id) {
            toast.success("Live session saved successfully!")
            navigate(`/detection/${msg.job_id}`)
          }
        }
      } catch {}
    }

    // Audio pipeline
    const ctx = new AudioContext({ sampleRate: 16000 })
    audioCtxRef.current = ctx
    const src = ctx.createMediaStreamSource(stream)
    const proc = ctx.createScriptProcessor(8192, 1, 1)
    processorRef.current = proc

    proc.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const samples = e.inputBuffer.getChannelData(0)
      const wav = encodeFloat32ToWav(new Float32Array(samples), ctx.sampleRate)
      ws.send(wav)
      chunkRef.current++
    }

    src.connect(proc); proc.connect(ctx.destination)
  }, [accessToken, threshold])

  const stopSession = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
    setConnecting(false)
    processorRef.current?.disconnect()
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close().catch(()=>{})
    mediaRef.current?.getTracks().forEach(t => t.stop())
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: 'end_stream' })) } catch(e){}
      wsRef.current.close(1000, 'User ended session')
    }
    setRunning(false); setConnected(false)
  }, [])

  useEffect(() => () => { stopSession() }, [stopSession])

  const startWithCountdown = useCallback(() => {
    setCountdown(3)
    let count = 3
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = setInterval(() => {
      count--
      if (count > 0) setCountdown(count)
      else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
        setCountdown(null)
        startSession()
      }
    }, 1000)
  }, [startSession])

  const verdictColor = sessionVerdict === 'synthetic' ? '#dc2626' : sessionVerdict === 'suspicious' ? '#d97706' : sessionVerdict === 'authentic' ? '#16a34a' : 'var(--fg-4)'
  const stats = latest?.session_stats

  return (
    <div className="w-full space-y-6 pb-12">
      <Reveal>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3"><Activity className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-pink-500 animate-text-pan" style={{ fontFamily: 'Playfair Display', serif }}>Live Detection</h1></div>
            <p className="text-surface-500 text-sm mt-1">Real-time deepfake analysis from microphone. 5-model ensemble scores every audio chunk.</p>
          </div>
          <div className="flex items-center gap-3">
            {running ? (
              <button onClick={stopSession} className="btn-danger flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-700 transition-colors shadow-sm">
                <Square size={16} fill="white" /> Stop Session
              </button>
            ) : countdown !== null ? (
              <button onClick={stopSession} className="btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-700 shadow-sm border border-surface-200">
                <Square size={14} fill="currentColor" /> Starting in {countdown}...
              </button>
            ) : connecting ? (
              <button onClick={stopSession} className="btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-700 shadow-sm border border-surface-200">
                <div className="w-4 h-4 border-2 border-surface-400 border-t-surface-600 rounded-full animate-spin" /> Connecting...
              </button>
            ) : (
              <button onClick={startWithCountdown} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-700 transition-colors shadow-sm">
                <Mic size={16} /> Start Live Detection
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {error && (
        <div className="px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-600 flex items-center gap-2 font-500">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* Left: Timeline + waveform */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Reveal>
            <div className="card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="font-700 text-sm text-surface-900">Audio Input</div>
                {running ? (
                  <div className="flex items-center gap-2">
                    <Mic size={16} className="text-brand-500" />
                    <WaveBars color="var(--brand-500)" bars={20} height={28} active={running} />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-surface-400 text-sm font-500">
                    <MicOff size={16} /> Microphone idle
                  </div>
                )}
              </div>
              <div style={{ height: 180 }}>
                {timeline.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" />
                      <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 10, fill: 'var(--fg-5)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, boxShadow: 'var(--sh-md)' }}
                        formatter={(v: any) => [`${(v*100).toFixed(1)}%`, 'Risk Score']}
                        labelFormatter={l => `Chunk ${l}`}
                      />
                      <Area type="monotone" dataKey="score" stroke="var(--blue)" fill="url(#liveGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-5)', fontSize: 13.5 }}>
                    {running ? 'Waiting for first audio chunk…' : 'Start session to see live timeline'}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-6 rounded-2xl">
              <div className="font-700 text-sm text-surface-900 mb-5">Per-Model Scores (last chunk)</div>
              <div className="flex flex-col gap-3">
                {latest?.model_scores ? Object.entries(latest.model_scores).map(([m, s]) => (
                  <ModelBar key={m} name={m} score={s as number} />
                )) : (
                  <div className="text-sm text-surface-400">Waiting for data...</div>
                )}
              </div>
              {latest?.flagged_reasons?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-surface-100">
                  <div className="text-xs font-700 text-surface-500 mb-2 uppercase tracking-wide">Flagged signals</div>
                  <div className="flex flex-wrap gap-1.5">
                    {latest.flagged_reasons.map(r => (
                      <span key={r} className="text-[11px] bg-danger-100 text-danger-700 font-600 px-2 py-0.5 rounded-md">{r.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {Object.keys(detectedSpeakers).length > 0 && (
            <Reveal delay={0.06}>
              <div className="card p-6 rounded-2xl">
                <div className="font-700 text-sm text-surface-900 mb-4">Detected Speakers</div>
                <div className="flex flex-col gap-3">
                  {Object.values(detectedSpeakers).map((spk, idx) => {
                    const aiScore = spk.probabilities?.ai_generated || 0;
                    const color = aiScore >= 0.65 ? 'text-danger-600' : 'text-success-600';
                    const badgeClass = aiScore >= 0.65 ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700';
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-200">
                        <div>
                          <div className="font-600 text-sm text-surface-800">{spk.id}</div>
                          <div className="text-xs text-surface-500 mt-0.5">Active: {spk.duration_sec.toFixed(1)}s</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-700 px-2 py-1 uppercase rounded-md ${badgeClass}`}>
                            {aiScore >= 0.65 ? 'Synthetic' : 'Authentic'}
                          </span>
                          <div className={`font-700 text-sm ${color}`}>
                            {(aiScore * 100).toFixed(0)}% Risk
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Reveal>
          )}
        </div>

        {/* Right: Session verdict & stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Reveal delay={0.06}>
            <div className="card p-6 rounded-2xl text-center flex flex-col items-center">
              <div className="text-xs font-700 text-surface-500 uppercase tracking-wide mb-5">Session Verdict</div>
              
              <div className="flex items-center justify-center gap-12 w-full mt-2 mb-4 px-2">
                <ScoreGauge score={latest?.ensemble_score ?? 0} size={76} label="Current" tooltip="Risk score of the latest 512ms audio chunk" subtext="risk" />
                <ScoreGauge score={stats?.avg_score ?? 0} size={108} label="Average" tooltip="Rolling average risk score across the entire session" subtext="score" />
                <ScoreGauge score={stats?.max_score ?? 0} size={76} label="Peak" tooltip="Highest single chunk risk score detected in this session" subtext="max" />
              </div>

              <div className="mt-6 px-4 py-1.5 rounded-full inline-block text-sm font-700" style={{ color: verdictColor, background: `color-mix(in srgb, ${verdictColor} 10%, transparent)` }}>
                {sessionVerdict === '–' ? 'Awaiting data' : sessionVerdict.charAt(0).toUpperCase() + sessionVerdict.slice(1)}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card p-6 rounded-2xl">
              <div className="font-700 text-sm text-surface-900 mb-4">Session Stats</div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Total chunks', value: stats?.total_chunks ?? 0 },
                  { label: 'Suspicious chunks', value: stats?.suspicious_count ?? 0 },
                  { label: 'Max risk score', value: stats ? `${(stats.max_score * 100).toFixed(1)}%` : '—' },
                  { label: 'Avg risk score', value: stats ? `${(stats.avg_score * 100).toFixed(1)}%` : '—' },
                  { label: 'Duration', value: stats ? `${stats.elapsed_seconds.toFixed(0)}s` : '—' },
                  { label: 'Last latency', value: latest ? `${latest.latency_ms.toFixed(0)}ms` : '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-sm text-surface-500 font-500">{row.label}</span>
                    <span className="text-sm font-600 text-surface-800">{row.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {!running && stats && stats.total_chunks > 0 && (
            <Reveal delay={0.1}>
              <div className="card p-6 rounded-2xl">
                <div className="font-700 text-sm text-surface-900 mb-4">Session Feedback</div>
                {!feedbackGiven ? (
                  <div>
                    <p className="text-xs text-surface-500 mb-4">Was this live detection session accurate overall?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setFeedbackGiven(true); toast.success('Feedback recorded. Thank you!') }} className="flex-1 flex items-center justify-center gap-2 py-2 border border-surface-200 rounded-lg text-sm font-600 text-surface-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all cursor-pointer">
                        <ThumbsUp size={14} /> Accurate
                      </button>
                      <button onClick={() => { setFeedbackGiven(true); toast.success('Feedback recorded. Thank you!') }} className="flex-1 flex items-center justify-center gap-2 py-2 border border-surface-200 rounded-lg text-sm font-600 text-surface-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer">
                        <ThumbsDown size={14} /> Inaccurate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-600">
                    <CheckCircle size={16} />
                    Thank you for your feedback!
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>

      <RecentDetections mode="stream" />
    </div>
  )
}

