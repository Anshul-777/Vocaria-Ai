import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Upload, FileAudio, Plus, Check, AlertTriangle, ChevronDown, RefreshCw, Mic, X, Play, Square, Sparkles, ExternalLink, Download } from 'lucide-react'
import { voicesApi, cloningApi, qualityApi, agentApi, getErrorMessage } from '@/api/client'
import { Link } from 'react-router-dom'
import { Reveal, StaggerGroup, StaggerItem, StatusBadge, WaveBars, PageHeader, Spinner, EmptyState } from '@/components/ui/shared'
import WaveformVisualizer from '@/components/audio/WaveformVisualizer'
import toast from 'react-hot-toast'

const QUALITY_COLOR = (s: number) => s >= 75 ? 'var(--green)' : s >= 50 ? 'var(--amber)' : 'var(--red)'

export default function ClonePage() {
  const [step, setStep]           = useState<1|2|3>(1)
  const [voices, setVoices]       = useState<any[]>([])
  const [selectedVoice, setVoice] = useState('')
  const [mode, setMode]           = useState<'zero_shot'|'fine_tune'>('zero_shot')
  const [samples, setSamples]     = useState<File[]>([])
  const [quality, setQuality]     = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [jobs, setJobs]           = useState<any[]>([])

  const [jobsLoading, setJobsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [testPhrase, setTestPhrase] = useState('')
  const [advParams, setAdvParams] = useState({ exaggeration: 0.5, cfgWeight: 0.5, temperature: 0.8 })
  const [showAdv, setShowAdv] = useState(false)
  const [enhancingPhrase, setEnhancingPhrase] = useState(false)
  const pollRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const handleEnhancePhrase = async () => {
    setEnhancingPhrase(true)
    try {
      const data = await agentApi.enhancePhrase(testPhrase)
      if (data && data.enhanced_phrase && data.enhanced_phrase !== testPhrase.trim()) {
        setTestPhrase(data.enhanced_phrase)
        toast.success(testPhrase.trim() ? 'Test phrase enhanced using AI!' : 'Generated random test phrase!')
      } else {
        toast.error('Failed to generate phrase. Check AI credits or try again.')
      }
    } catch (err) {
      toast.error('Failed to enhance phrase. Check AI credits or try again.')
    } finally {
      setEnhancingPhrase(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const voiceIdFromUrl = params.get('voice')
    if (voiceIdFromUrl) {
      setVoice(voiceIdFromUrl)
      setStep(2)
    }
    voicesApi.list({ page_size: 50 }).then(d => {
      const v = d.voices || []
      setVoices(v)
    }).catch(() => {})
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setJobsLoading(true)
    cloningApi.listJobs({ page_size: 10 }).then(d => setJobs(d.jobs || [])).catch(() => {}).finally(() => setJobsLoading(false))
  }



  const handleNewFiles = async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setSamples(prev => [...prev, f])
    setAnalyzing(true); setQuality(null)
    try {
      const q = await qualityApi.analyze(f)
      setQuality(q)
    } catch { setQuality(null) }
    finally { setAnalyzing(false) }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'audio/*': ['.wav','.mp3','.flac','.ogg','.m4a','.webm'] },
    onDrop: useCallback(handleNewFiles, []),
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunks, { type: mimeType })
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([audioBlob], `recording-${Date.now()}.${ext}`, { type: mimeType })
        handleNewFiles([file])
        stream.getTracks().forEach(t => t.stop())
      }
      
      mediaRecorder.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      toast.error('Microphone access denied or not available.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  const removeSample = (index: number) => {
    setSamples(prev => prev.filter((_, i) => i !== index))
    setQuality(null)
  }

  const uploadSamples = async () => {
    if (!selectedVoice || samples.length === 0) { toast.error('Select a voice and upload at least one sample'); return }
    for (const file of samples) {
      try {
        await cloningApi.uploadSample(selectedVoice, file)
      } catch (err) { toast.error(`Upload failed for ${file.name}: ${getErrorMessage(err)}`); return }
    }
    setStep(3)
    toast.success('Samples uploaded')
  }

  const startClone = async () => {
    if (!selectedVoice) { toast.error('No voice selected'); return }
    setSubmitting(true)
    try {
      const data = await cloningApi.startJob({ 
        voice_profile_id: selectedVoice, 
        mode,
        test_phrase: testPhrase || undefined,
        exaggeration: advParams.exaggeration,
        cfg_weight: advParams.cfgWeight,
        temperature: advParams.temperature
      })
      toast.success('Clone job started!')
      const isSlow = advParams.exaggeration !== 0.5 || advParams.cfgWeight !== 0.5 || advParams.temperature !== 0.8 || (testPhrase && testPhrase.length > 150);
      if (isSlow) {
        toast('Since you used advanced parameters/long text, generating the preview might take a while. Please be patient!', { icon: '⏳' })
      }
      pollJob(data.job_id)
      setStep(1); setVoice(''); setSamples([]); setQuality(null); setTestPhrase(''); setAdvParams({ exaggeration: 0.5, cfgWeight: 0.5, temperature: 0.8 }); setShowAdv(false)
      loadJobs()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSubmitting(false) }
  }

  const pollJob = (jobId: string) => {
    if (pollRef.current.has(jobId)) return
    const interval = setInterval(async () => {
      const data = await cloningApi.getJob(jobId).catch(() => null)
      if (!data) return
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...data } : j))
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval)
        pollRef.current.delete(jobId)
        if (data.status === 'completed') toast.success('Voice clone ready!')
        else toast.error(`Clone failed: ${data.error_message}`)
      }
    }, 2000)
    pollRef.current.set(jobId, interval)
  }


  const selectedV = voices.find(v => v.id === selectedVoice)

  return (
    <div className="w-full space-y-8 pb-12">
      <PageHeader icon={Zap} title="Clone Voice" description="Upload voice samples and create a cloned voice profile using XTTS-v2." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Profile */}
          <Reveal>
            <div className="card" style={{ padding: 24 }}>
              <StepHeader n={1} title="Voice Profile" done={!!selectedVoice} active={step >= 1} />
              <div style={{ marginTop: 18 }}>
                {voices.length > 0 && (
                  <>
                    <label className="label">Select existing profile</label>
                    <select value={selectedVoice} onChange={e => { setVoice(e.target.value); setStep(2) }} className="input select" style={{ marginBottom: 14 }}>
                      <option value="">— Choose voice profile —</option>
                      {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: 'var(--fg-4)', fontSize: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />OR<div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  </>
                )}
                <Link to="/voices/new" className="btn btn-secondary w-full flex items-center justify-center gap-2">
                  <Plus size={14} /> Create Full Identity Profile
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Step 2: Upload samples */}
          <Reveal delay={0.05}>
            <div className="card" style={{ padding: 24, opacity: step >= 2 ? 1 : 0.5, pointerEvents: step >= 2 ? 'all' : 'none' }}>
              <StepHeader n={2} title="Upload Audio Samples" done={samples.length > 0} active={step >= 2} />
              <div style={{ marginTop: 18 }}>
                {/* Dropzone & Record Button */}
                <div className="flex flex-col sm:flex-row gap-5 sm:items-stretch">
                  <div {...getRootProps()} className="flex-1" style={{
                    border: `2px dashed ${isDragActive ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                    background: isDragActive ? 'var(--blue-soft)' : 'var(--bg-2)',
                    transition: 'all 0.14s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <input {...getInputProps()} />
                    <Upload size={24} style={{ color: isDragActive ? 'var(--blue)' : 'var(--fg-5)', margin: '0 auto 10px' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: isDragActive ? 'var(--blue)' : 'var(--fg-2)', marginBottom: 4 }}>
                      {isDragActive ? 'Drop to upload' : 'Drag audio files here'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>WAV · MP3 · FLAC · OGG · M4A — min 3s, max 5min</div>
                  </div>

                  <div className="flex sm:flex-col items-center justify-center gap-3">
                    <div className="w-full h-px sm:w-px sm:flex-1 bg-border" />
                    <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 700, letterSpacing: '0.05em' }}>OR</div>
                    <div className="w-full h-px sm:w-px sm:flex-1 bg-border" />
                  </div>

                  <div className="flex items-center justify-center" style={{ minWidth: 240 }}>
                    {isRecording ? (
                      <button onClick={stopRecording} className="btn w-full h-full min-h-[50px] flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 py-3 rounded-xl transition-all font-medium">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Stop Recording
                      </button>
                    ) : (
                      <button onClick={startRecording} className="btn w-full h-full min-h-[50px] flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 py-3 rounded-xl transition-all hover:border-gray-300 font-medium" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Mic size={18} className="text-gray-500" /> Record Audio
                      </button>
                    )}
                  </div>
                </div>

                {/* Sample list */}
                {samples.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {samples.map((f, i) => (
                      <SampleFileItem key={i} file={f} onRemove={() => removeSample(i)} />
                    ))}
                  </div>
                )}

                {/* Quality analysis result */}
                {analyzing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginTop: 12, background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--fg-3)' }}>
                    <Spinner size={14} /> Analyzing audio quality…
                  </div>
                )}
                {quality && !analyzing && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${quality.quality_score >= 50 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, background: quality.quality_score >= 50 ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>Quality Analysis</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: QUALITY_COLOR(quality.quality_score) }}>{quality.quality_score?.toFixed(0)}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>/100</span>
                        <span className={`badge ${quality.quality_score >= 50 ? 'badge-green' : 'badge-red'}`}>{quality.suitability}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                      {[
                        ['Duration', `${quality.duration_seconds?.toFixed(1)}s`],
                        ['SNR', `${quality.snr_db?.toFixed(1)} dB`],
                        ['Speech ratio', `${(quality.speech_ratio * 100)?.toFixed(0)}%`],
                        ['Sample rate', `${quality.sample_rate?.toLocaleString()} Hz`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-4)' }}>
                          <span>{k}</span><span style={{ fontWeight: 600, color: 'var(--fg-2)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {quality.issues?.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--red)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        {quality.issues.join(' · ')}
                      </div>
                    )}
                  </div>
                )}

                {samples.length > 0 && (
                  <button onClick={uploadSamples} className="btn btn-primary" style={{ marginTop: 14, width: '100%' }}>
                    <Check size={14} /> Continue to Cloning
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {/* Step 3: Clone settings */}
          <Reveal delay={0.1}>
            <div className="card" style={{ padding: 24, opacity: step >= 3 ? 1 : 0.5, pointerEvents: step >= 3 ? 'all' : 'none' }}>
              <StepHeader n={3} title="Clone Settings" done={false} active={step >= 3} />
              <div style={{ marginTop: 18 }}>
                <label className="label">Base Model</label>
                <select className="input select" disabled style={{ marginBottom: 16 }}>
                  <option>Chatterbox Turbo (Fast Zero-Shot Cloning)</option>
                </select>

                <label className="label">Clone mode</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {[
                    { id: 'zero_shot', label: 'Zero-shot', desc: 'Fast · Uses reference audio directly' },
                    { id: 'fine_tune', label: 'Fine-tune', desc: 'Slower · Higher voice similarity · Pro plan' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setMode(m.id as any)}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${mode === m.id ? 'var(--blue)' : 'var(--border)'}`, background: mode === m.id ? 'var(--blue-soft)' : 'var(--bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.14s' }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: mode === m.id ? 'var(--blue)' : 'var(--fg-2)', marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-4)', lineHeight: 1.4 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Test Phrase (Optional)</label>
                  <button onClick={handleEnhancePhrase} disabled={enhancingPhrase} className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {enhancingPhrase ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />} {enhancingPhrase ? 'Generating...' : 'Enhance Phrase'}
                  </button>
                </div>
                <textarea 
                  className="input" 
                  style={{ width: '100%', minHeight: 80, marginBottom: 16, resize: 'vertical' }}
                  placeholder="Enter text to preview the voice clone (e.g., Hello! This is my new cloned voice.)"
                  value={testPhrase}
                  onChange={e => setTestPhrase(e.target.value)}
                />

                <div style={{ marginBottom: 24 }}>
                  <button onClick={() => setShowAdv(!showAdv)} className="flex items-center gap-2" style={{ color: 'var(--fg-4)', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <ChevronDown size={14} style={{ transform: showAdv ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} /> Advanced Voice Parameters
                  </button>
                  <AnimatePresence>
                    {showAdv && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', background: 'var(--bg-2)', borderRadius: 12, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                          
                          <div>
                            <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
                              <span>Emotion Exaggeration</span>
                              <span>{advParams.exaggeration.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0" max="1" step="0.05" className="range-slider w-full"
                              value={advParams.exaggeration} onChange={e => setAdvParams(p => ({ ...p, exaggeration: parseFloat(e.target.value) }))} />
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 4 }}>Intensity of emotion (0.0 = monotone, 1.0 = dramatic)</div>
                          </div>

                          <div>
                            <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
                              <span>CFG Weight</span>
                              <span>{advParams.cfgWeight.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.05" className="range-slider w-full"
                              value={advParams.cfgWeight} onChange={e => setAdvParams(p => ({ ...p, cfgWeight: parseFloat(e.target.value) }))} />
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 4 }}>Classifier-free guidance (higher = more stable pacing)</div>
                          </div>

                          <div>
                            <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
                              <span>Temperature</span>
                              <span>{advParams.temperature.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0.1" max="1.5" step="0.05" className="range-slider w-full"
                              value={advParams.temperature} onChange={e => setAdvParams(p => ({ ...p, temperature: parseFloat(e.target.value) }))} />
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 4 }}>Randomness (lower = strict, higher = expressive)</div>
                          </div>

                          <div className="flex justify-end mt-2">
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAdvParams({ exaggeration: 0.5, cfgWeight: 0.5, temperature: 0.8 })}>
                              <RefreshCw size={12} className="mr-1.5" /> Reset Default
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedV && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--fg-3)' }}>
                    Cloning into: <strong style={{ color: 'var(--fg-2)' }}>{selectedV.name}</strong>
                    {' · '}{samples.length} sample{samples.length !== 1 ? 's' : ''}
                  </div>
                )}

                {(advParams.exaggeration !== 0.5 || advParams.cfgWeight !== 0.5 || advParams.temperature !== 0.8 || testPhrase.length > 150) && (
                  <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#b45309', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ lineHeight: 1.5 }}>
                      <strong>Note:</strong> Since you are using advanced parameters or a longer test phrase, generating the initial clone preview might take a little longer. Please wait patiently while it processes!
                    </div>
                  </div>
                )}

                <button onClick={startClone} disabled={submitting || !selectedVoice} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {submitting ? <><Spinner size={16} /> Starting…</> : <><Zap size={16} /> Start Voice Clone</>}
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right: Job history */}
        <div className="lg:col-span-1">
          <Reveal delay={0.08}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Recent Clone Jobs
                <button onClick={loadJobs} style={{ padding: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex', borderRadius: 6 }}>
                  <RefreshCw size={13} />
                </button>
              </div>
              {jobsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
                </div>
              ) : jobs.length === 0 ? (
                <EmptyState icon={Mic} title="No clone jobs yet" description="Start your first voice clone above." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobs.map(job => (
                    <CloneJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12.5, fontWeight: 700, flexShrink: 0,
        background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--bg-3)',
        color: done || active ? 'white' : 'var(--fg-4)',
      }}>
        {done ? <Check size={13} /> : n}
      </div>
      <span style={{ fontWeight: 600, fontSize: 14.5, color: active ? 'var(--fg)' : 'var(--fg-4)' }}>{title}</span>
    </div>
  )
}

function CloneJobCard({ job }: { job: any }) {
  const isFailed = job.status === 'failed'
  return (
    <div style={{ padding: '11px 14px', borderRadius: 10, border: isFailed ? '1px solid rgba(220,38,38,0.3)' : '1px solid var(--border-2)', background: isFailed ? 'rgba(220,38,38,0.03)' : 'var(--bg-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={job.status} />
          {job.quality_score && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4 }}>Quality: {(job.quality_score * 100).toFixed(0)}%</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: isFailed ? '#dc2626' : 'var(--fg-4)' }}>
          <span>{job.mode}</span>
          <span>·</span>
          <span>{new Date(job.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Link to={`/voices/${job.voice_profile_id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none', display: 'inline-block', marginBottom: 2 }} className="hover-underline">
          {job.voice_profile_name || 'Unknown Profile'}
        </Link>
      </div>
      {(job.status === 'processing' || job.status === 'queued') && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 6 }}>{job.progress_message || 'Waiting…'}</div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${(job.progress || 0) * 100}%` }} />
          </div>
        </div>
      )}
      {isFailed ? (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
          {job.error_message || 'An unknown error occurred.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {job.preview_url && job.status === 'completed' && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-2)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Test Phrase Preview</div>
              <audio controls src={job.preview_url} style={{ width: '100%', height: 32, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/voices/${job.voice_profile_id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px' }}>
                  <ExternalLink size={12} /> View Profile
                </Link>
                <a href={job.preview_url} download className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px' }}>
                  <Download size={12} /> Download
                </a>
                <Link to={`/studio?voice_id=${job.voice_profile_id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px', background: 'var(--blue)', color: 'white' }}>
                  <Mic size={12} /> Use Voice
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SampleFileItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  
  useEffect(() => {
    let active = true
    
    let mimeType = file.type
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'mp3') mimeType = 'audio/mpeg'
      else if (ext === 'wav') mimeType = 'audio/wav'
      else if (ext === 'ogg') mimeType = 'audio/ogg'
      else if (ext === 'm4a') mimeType = 'audio/mp4'
      else if (ext === 'flac') mimeType = 'audio/flac'
      else if (ext === 'webm') mimeType = 'audio/webm'
      else mimeType = 'audio/mpeg' // fallback
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (active && e.target?.result) {
        let dataUrl = e.target.result as string
        // Fix missing or octet-stream mime types in data URL
        if (dataUrl.startsWith('data:;')) {
          dataUrl = dataUrl.replace('data:;', `data:${mimeType};`)
        } else if (dataUrl.startsWith('data:application/octet-stream;')) {
          dataUrl = dataUrl.replace('data:application/octet-stream;', `data:${mimeType};`)
        }
        setUrl(dataUrl)
      }
    }
    reader.readAsDataURL(file)
    return () => { active = false }
  }, [file])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileAudio size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{(file.size / 1024).toFixed(0)} KB</div>
        </div>
        <button onClick={onRemove} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', display: 'flex', borderRadius: 6, opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
          <X size={14} />
        </button>
      </div>
      {url && <audio key={url} controls src={url} style={{ width: '100%', height: 36, marginTop: 4 }} />}
    </div>
  )
}
