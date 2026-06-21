import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Wand2, Save, Play, Download, RefreshCw, Zap, Clock, UserCircle, Mic2, Globe, Volume2, Sparkles, Cpu, HelpCircle, Star, Activity, Trash2, X } from 'lucide-react'
import { voicesApi, generationApi, getErrorMessage, agentApi } from '@/api/client'
import { Reveal } from '@/hooks/motionVariants'
import WaveformVisualizer from '@/components/audio/WaveformVisualizer'
import toast from 'react-hot-toast'

// ─── Model-specific constants ────────────────────────────────────────────────
const KOKORO_GENDERS = ['Male', 'Female']
const KOKORO_AGES = ['Child', 'Young Adult', 'Middle Aged', 'Elderly']
const KOKORO_ACCENTS = ['American', 'British', 'Australian', 'Irish', 'French', 'German', 'Spanish', 'Italian']
const KOKORO_LANGUAGES = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'hi']
const KOKORO_LANG_LABELS: Record<string, string> = { en: 'English', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian', pt: 'Portuguese', hi: 'Hindi' }

// Chatterbox only supports English and has no gender/accent routing
const CHATTERBOX_EMOTIONS = [
  { value: 'neutral', label: 'Neutral', desc: 'Default balanced tone' },
  { value: 'happy', label: 'Happy', desc: 'Cheerful, bright delivery' },
  { value: 'sad', label: 'Sad', desc: 'Melancholic, subdued' },
  { value: 'angry', label: 'Angry', desc: 'Intense, forceful' },
  { value: 'excited', label: 'Excited', desc: 'High-energy enthusiasm' },
  { value: 'calm', label: 'Calm', desc: 'Soothing, relaxed' },
]

// ─── Tooltip Component ──────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle size={12} style={{ color: '#94a3b8' }} />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              background: '#1e293b', color: '#f1f5f9', fontSize: 11, lineHeight: 1.4,
              padding: '8px 12px', borderRadius: 8, zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginBottom: 6, maxWidth: 260,
              whiteSpace: 'normal' as any,
            }}>
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Generation Pipeline Steps ───────────────────────────────────────────────
const KOKORO_STEPS = [
  { label: 'Analyzing prompt', icon: '🧠' },
  { label: 'Selecting voice preset', icon: '🎭' },
  { label: 'Loading Kokoro-82M', icon: '⚡' },
  { label: 'Synthesizing waveform', icon: '🎵' },
  { label: 'Encoding audio', icon: '💾' },
]
const CHATTERBOX_STEPS = [
  { label: 'Loading Chatterbox Turbo', icon: '🚀' },
  { label: 'Initializing GPU', icon: '🎮' },
  { label: 'Processing text tokens', icon: '📝' },
  { label: 'Running diffusion model', icon: '🧬' },
  { label: 'Generating neural speech', icon: '🎵' },
  { label: 'Applying emotion contour', icon: '💜' },
  { label: 'Encoding & normalizing', icon: '💾' },
]
const PARLER_STEPS = [
  { label: 'Parsing prompt semantics', icon: '🧠' },
  { label: 'Configuring autoregressive model', icon: '⚙️' },
  { label: 'Extracting acoustic features', icon: '🔍' },
  { label: 'Generating audio stream', icon: '🌊' },
  { label: 'Enhancing vocal clarity', icon: '✨' },
  { label: 'Encoding final output', icon: '💾' },
]


export default function GeneratePage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [gender, setGender] = useState('Female')
  const [age, setAge] = useState('Young Adult')
  const [accent, setAccent] = useState(KOKORO_ACCENTS[0])
  const [language, setLanguage] = useState('en')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [emotion, setEmotion] = useState('neutral')
  const [temperature, setTemperature] = useState(0.5)
  const [selectedModel, setSelectedModel] = useState('kokoro-82m')
  const [exaggeration, setExaggeration] = useState(0.5)
  const [cfgWeight, setCfgWeight] = useState(0.5)
  const [cbEmotion, setCbEmotion] = useState('neutral')
  const [voicePrompt, setVoicePrompt] = useState('A clear and articulate speech with moderate pacing.')

  const [testText, setTestText] = useState('Hello! This is how I sound based on your description.')
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [enhancingPrompt, setEnhancingPrompt] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])

  const [voices, setVoices] = useState<any[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [newProfileName, setNewProfileName] = useState('')

  const [saving, setSaving] = useState(false)
  const [enhancingPhrase, setEnhancingPhrase] = useState(false)

  const pollRef = useRef<NodeJS.Timeout>()
  const stepRef = useRef<NodeJS.Timeout>()

  const fetchRecent = async () => {
    try {
      const data = await generationApi.list({ limit: 5 })
      const items = data.jobs || data.items || data || []
      setRecentJobs(Array.isArray(items) ? items : [])

      const active = (Array.isArray(items) ? items : []).find((j: any) => j.status === 'pending' || j.status === 'processing')
      if (active && !generating) {
        setJobId(active.id)
        if (active.model) setSelectedModel(active.model)
        setGenerating(true)
        pollForResult(active.id)

        generationApi.getJob(active.id).then((fullJob: any) => {
          if (fullJob.text) setTestText(fullJob.text)
          if (fullJob.speaking_style) setPrompt(fullJob.speaking_style)
          if (fullJob.language) setLanguage(fullJob.language)
          if (fullJob.emotion) setEmotion(fullJob.emotion)
          if (fullJob.extra_metadata) {
            const m = fullJob.extra_metadata
            if (m.gender) setGender(m.gender)
            if (m.age) setAge(m.age)
            if (m.accent) setAccent(m.accent)
            if (m.exaggeration) setExaggeration(m.exaggeration)
            if (m.cfg_weight) setCfgWeight(m.cfg_weight)
          }
        }).catch(() => {})
      }
    } catch (e) { }
  }

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Permanently delete this generation job?')) return;
    try {
      await generationApi.deleteJob(id);
      setRecentJobs(prev => prev.filter(j => j.id !== id));
      if (jobId === id) setJobId(null);
      if (result?.id === id) setResult(null);
      toast.success('Deleted permanently');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  useEffect(() => {
    voicesApi.list({ page_size: 50 }).then(d => {
      setVoices(d.voices || [])
    }).catch(() => { })

    fetchRecent()
  }, [])

  // Update test phrase when switching models
  useEffect(() => {
    if (selectedModel === 'chatterbox-turbo') {
      setTestText('[laugh] Oh my, this is absolutely incredible! [sigh] I never thought AI voices could sound this realistic.')
    } else {
      setTestText('Hello! This is how I sound based on your description.')
    }
  }, [selectedModel])

  // Pipeline step animation during generation
  useEffect(() => {
    if (generating) {
      setGenStep(0)
      const steps = selectedModel === 'chatterbox-turbo' ? CHATTERBOX_STEPS : selectedModel === 'parler-tts' ? PARLER_STEPS : KOKORO_STEPS
      stepRef.current = setInterval(() => {
        setGenStep(prev => (prev < steps.length - 1 ? prev + 1 : prev))
      }, selectedModel === 'chatterbox-turbo' ? 3000 : selectedModel === 'parler-tts' ? 2500 : 1500)
    } else {
      clearInterval(stepRef.current)
      setGenStep(0)
    }
    return () => clearInterval(stepRef.current)
  }, [generating, selectedModel])

  const generate = async () => {
    if (selectedModel === 'kokoro-82m' && (!prompt.trim() || !gender || !age || !accent)) {
      toast.error('Please describe the voice and select gender, age, accent.')
      return
    }
    if (selectedModel === 'chatterbox-turbo' && !prompt.trim()) {
      toast.error('Please describe the voice you want to generate.')
      return
    }
    if (!testText.trim()) {
      toast.error('Please enter a test phrase for the voice to speak.')
      return
    }
    setGenerating(true)
    setResult(null)

    const payload: any = {
      text: testText,
      language,
      emotion: selectedModel === 'chatterbox-turbo' ? cbEmotion : emotion,
      speaking_style: prompt,
      speed,
      pitch,
      temperature: selectedModel === 'chatterbox-turbo' ? temperature : 0.7,
      output_format: 'wav',
      gender,
      age,
      accent,
      model: selectedModel,
      exaggeration,
      cfg_weight: cfgWeight,
    }

    try {
      const data = await generationApi.generate(payload)
      const newJobId = data.job_id || data.id
      if (newJobId) {
        setJobId(newJobId)
        pollForResult(newJobId)
        toast.success('Synthesizing voice...')
        setTimeout(fetchRecent, 1000)
      } else if (data.status === 'completed') {
        setResult(data)
        setGenerating(false)
        toast.success(`Voice synthesized with ${selectedModel === 'chatterbox-turbo' ? 'Chatterbox Turbo (GPU)' : selectedModel === 'parler-tts' ? 'Parler-TTS (CPU)' : 'Kokoro 82M (CPU)'}!`)
        fetchRecent()
      } else if (data.status === 'failed') {
        setResult(data)
        setGenerating(false)
        toast.error(`Generation failed: ${data.error_message}`)
        fetchRecent()
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
      setGenerating(false)
    }
  }

  const pollForResult = (id: string) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const data = await generationApi.getJob(id).catch(() => null)
      if (!data) return
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollRef.current)
        setJobId(null)
        setGenerating(false)
        setResult(data)
        if (data.status === 'completed') {
          toast.success('Voice synthesized successfully!')
          fetchRecent()
        }
        else {
          toast.error(`Generation failed: ${data.error_message}`)
          fetchRecent()
        }
      }
    }, 1500)
  }

  const cancelGeneration = () => {
    clearInterval(pollRef.current)
    clearInterval(stepRef.current)
    setGenerating(false)
    setJobId(null)
    setGenStep(0)
    toast.error('Generation cancelled by user')
  }

  const handleSaveProfile = async () => {
    if (!selectedProfile) { toast.error('No target profile selected'); return }
    if (selectedProfile === 'new' && !newProfileName.trim()) { toast.error('Please name your new voice profile'); return }
    if (!result?.output_url) { toast.error('No generated voice to save'); return }

    setSaving(true)
    try {
      let targetProfileId = selectedProfile

      if (selectedProfile === 'new') {
        const newProfile = await voicesApi.create({
          name: newProfileName,
          language: 'en',
          gender: gender.toLowerCase(),
          accent: accent,
          age_bracket: age.toLowerCase().replace(' ', '_'),
          use_case: 'generated',
          labels: ['synthetic', 'generated'],
          extra_metadata: {
            model: selectedModel,
            ...(selectedModel === 'kokoro-82m' ? {
              gender: gender.toLowerCase(),
              age: age.toLowerCase().replace(' ', '_'),
              accent: accent.toLowerCase(),
            } : {}),
            ...(selectedModel === 'chatterbox-turbo' ? {
              exaggeration,
              cfgWeight,
            } : {}),
            ...(selectedModel === 'parler-tts' ? {
              prompt: voicePrompt
            } : {})
          }
        })
        targetProfileId = newProfile.id
      }

      if (jobId) {
        await voicesApi.attachGeneration(targetProfileId, jobId)
      } else if (result?.id) {
        await voicesApi.attachGeneration(targetProfileId, result.id)
      }
      toast.success(selectedProfile === 'new' ? `Voice Profile "${newProfileName}" saved!` : 'Voice added to profile!')
      setResult(null)
      setJobId(null)
      setGenerating(false)
      setTestText('')
      if (selectedProfile === 'new') {
        setSelectedProfile(targetProfileId)
        setNewProfileName('')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleEnhancePrompt = async () => {
    setEnhancingPrompt(true)
    try {
      const data = await agentApi.enhancePrompt(prompt.trim())
      if (data && data.enhanced_prompt && data.enhanced_prompt !== prompt.trim()) {
        setPrompt(data.enhanced_prompt)
        toast.success(prompt.trim() ? 'Prompt enhanced using Gemini AI!' : 'Generated random voice prompt!')
      } else {
        toast.error('Failed to generate prompt. Check AI credits or try again.')
      }
    } catch (err) {
      toast.error('Failed to enhance prompt. Check AI credits or try again.')
    } finally {
      setEnhancingPrompt(false)
    }
  }

  const handleEnhancePhrase = async () => {
    setEnhancingPhrase(true)
    try {
      const data = await agentApi.enhancePhrase(testText)
      if (data && data.enhanced_phrase && data.enhanced_phrase !== testText.trim()) {
        setTestText(data.enhanced_phrase)
        toast.success(testText.trim() ? 'Test phrase enhanced using AI!' : 'Generated random test phrase!')
      } else {
        toast.error('Failed to generate phrase. Check AI credits or try again.')
      }
    } catch (err) {
      toast.error('Failed to enhance phrase. Check AI credits or try again.')
    } finally {
      setEnhancingPhrase(false)
    }
  }

  const currentSteps = selectedModel === 'chatterbox-turbo' ? CHATTERBOX_STEPS : selectedModel === 'parler-tts' ? PARLER_STEPS : KOKORO_STEPS

  return (
    <div className="w-full space-y-8 pb-12">
      <Reveal>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="flex items-center gap-3"><Wand2 className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Generate Voice</h1></div>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Describe the exact voice you want. The AI will synthesize an entirely new, unique acoustic identity.
            </p>
          </div>
          <Link to="/history" className="btn btn-secondary px-4 py-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} /> History
          </Link>
        </div>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'stretch' }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Reveal>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label" style={{ marginBottom: 0 }}>
                    Voice Description Prompt
                    <Tip text={selectedModel === 'chatterbox-turbo'
                      ? "Describe the speaking style you want. Chatterbox generates from its own neural voice — focus on emotion and delivery style rather than demographics."
                      : "Describe the voice identity. Kokoro will select the closest matching preset from 50+ built-in voices based on your gender, age, and accent selections."
                    } />
                  </label>
                  <button onClick={handleEnhancePrompt} disabled={enhancingPrompt} className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {enhancingPrompt ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />} Modify prompt
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={selectedModel === 'parler-tts'
                    ? "E.g., A female speaker delivers a slightly expressive and animated speech..."
                    : selectedModel === 'chatterbox-turbo'
                      ? "E.g., A warm, conversational voice telling a bedtime story with gentle pauses and soft laughter..."
                      : "E.g., A deep, raspy voice of an old wizard speaking slowly and mysteriously..."
                  }
                  className="input textarea"
                  style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, resize: 'none' }}
                />
              </div>

              {/* Voice Parameters — only shown for Kokoro (Chatterbox uses its own neural voice) */}
              {selectedModel === 'kokoro-82m' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label text-xs"><UserCircle size={14} className="inline mr-1" /> Gender <Tip text="Kokoro selects different voice presets for male and female. These map directly to distinct neural voice models." /></label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="input select text-sm">
                      {KOKORO_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs"><Clock size={14} className="inline mr-1" /> Age <Tip text="Maps to different voice characteristics — younger voices are brighter and faster, older voices are deeper with more gravitas." /></label>
                    <select value={age} onChange={e => setAge(e.target.value)} className="input select text-sm">
                      {KOKORO_AGES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs"><Globe size={14} className="inline mr-1" /> Accent <Tip text="Kokoro has separate voice models trained for each accent region. American and British have the most presets." /></label>
                    <select value={accent} onChange={e => setAccent(e.target.value)} className="input select text-sm">
                      {KOKORO_ACCENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs"><Globe size={14} className="inline mr-1" /> Language <Tip text="Kokoro supports 10 languages. The model reloads when switching away from English." /></label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="input select text-sm">
                      {KOKORO_LANGUAGES.map(l => <option key={l} value={l}>{KOKORO_LANG_LABELS[l] || l}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Engine & Tuning */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wand2 size={14} /> Engine & Tuning
                </h4>

                {/* Model Selector */}
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label className="label text-xs" style={{ marginBottom: 8, display: 'block' }}>Voice Engine <Tip text="Choose which AI model generates your voice. Kokoro is fast on CPU with preset voices. Chatterbox Turbo uses your GPU for hyper-realistic neural speech with emotion control. Parler-TTS allows prompt-based generation." /></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedModel('kokoro-82m')}
                      style={{
                        padding: '12px 16px', borderRadius: 10, border: selectedModel === 'kokoro-82m' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: selectedModel === 'kokoro-82m' ? '#eff6ff' : 'white', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', position: 'relative',
                      }}
                    >
                      {/* Fast badge */}
                      <div style={{ position: 'absolute', top: -8, right: 8, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                        <Zap size={8} fill="white" /> FAST
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={14} style={{ color: selectedModel === 'kokoro-82m' ? '#2563eb' : '#94a3b8' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedModel === 'kokoro-82m' ? '#2563eb' : '#334155' }}>Kokoro 82M</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Fast presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModel('chatterbox-turbo')}
                      style={{
                        padding: '12px 16px', borderRadius: 10, border: selectedModel === 'chatterbox-turbo' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        background: selectedModel === 'chatterbox-turbo' ? '#f5f3ff' : 'white', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={14} style={{ color: selectedModel === 'chatterbox-turbo' ? '#7c3aed' : '#94a3b8' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedModel === 'chatterbox-turbo' ? '#7c3aed' : '#334155' }}>Chatterbox</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Hyper-realistic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModel('parler-tts')}
                      style={{
                        padding: '12px 16px', borderRadius: 10, border: selectedModel === 'parler-tts' ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: selectedModel === 'parler-tts' ? '#ecfdf5' : 'white', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', position: 'relative',
                      }}
                    >
                      {/* SOTA badge */}
                      <div style={{ position: 'absolute', top: -8, right: 8, background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                        <Sparkles size={8} fill="white" /> STATE OF THE ART
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Wand2 size={14} style={{ color: selectedModel === 'parler-tts' ? '#059669' : '#94a3b8' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedModel === 'parler-tts' ? '#059669' : '#334155' }}>Parler-TTS</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Prompt-based</span>
                    </button>
                  </div>
                </div>

                {/* Kokoro-specific parameters */}
                {selectedModel === 'kokoro-82m' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="label text-xs">Speaking Speed <Tip text="Controls how fast the voice speaks. 1.0 is normal speed. Lower values sound more deliberate, higher values sound more energetic." /></label>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full mt-1" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                        <span>Slower</span><span style={{ fontWeight: 600 }}>{speed.toFixed(1)}x</span><span>Faster</span>
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Emotion / Tone <Tip text="Kokoro maps this to different voice presets with matching emotional qualities. 'Happy' selects bright, energetic presets." /></label>
                      <select value={emotion} onChange={e => setEmotion(e.target.value)} className="input select text-sm mt-1">
                        <option value="neutral">Neutral</option>
                        <option value="happy">Happy</option>
                        <option value="sad">Sad</option>
                        <option value="angry">Angry</option>
                        <option value="excited">Excited</option>
                        <option value="whispering">Whispering</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Chatterbox-specific parameters */}
                {selectedModel === 'chatterbox-turbo' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="label text-xs">Emotion Exaggeration <Tip text="Controls how dramatically the voice expresses emotion. 0 = flat monotone, 0.5 = natural, 1.0 = theatrical/dramatic. Start at 0.5 and adjust." /></label>
                      <input type="range" min="0" max="1" step="0.05" value={exaggeration} onChange={e => setExaggeration(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: '#7c3aed' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                        <span>Monotone</span><span style={{ fontWeight: 600, color: '#7c3aed' }}>{exaggeration.toFixed(2)}</span><span>Dramatic</span>
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Pacing (CFG) <Tip text="Classifier-Free Guidance weight. Lower = more relaxed/natural pacing. Higher = tighter, more controlled delivery. 0.5 is balanced." /></label>
                      <input type="range" min="0" max="1" step="0.05" value={cfgWeight} onChange={e => setCfgWeight(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: '#7c3aed' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                        <span>Relaxed</span><span style={{ fontWeight: 600, color: '#7c3aed' }}>{cfgWeight.toFixed(2)}</span><span>Controlled</span>
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Temperature <Tip text="Sampling randomness. Lower = more consistent/predictable output. Higher = more varied/creative. 0.8 is recommended for natural speech." /></label>
                      <input type="range" min="0.1" max="1.5" step="0.05" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: '#7c3aed' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                        <span>Conservative</span><span style={{ fontWeight: 600, color: '#7c3aed' }}>{temperature.toFixed(2)}</span><span>Creative</span>
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Emotional Tone <Tip text="Sets the overall emotional mood. Combined with exaggeration intensity to fine-tune expressiveness." /></label>
                      <select value={cbEmotion} onChange={e => setCbEmotion(e.target.value)} className="input select text-sm mt-1" style={{ borderColor: '#ddd6fe' }}>
                        {CHATTERBOX_EMOTIONS.map(e => (
                          <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label text-xs">Paralinguistic Tags <Tip text="Chatterbox can render non-speech sounds naturally. Insert these tags anywhere in your text to add realistic human expressions." /></label>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {['[laugh]', '[sigh]', '[cough]', '[chuckle]'].map(tag => (
                          <button key={tag} type="button" onClick={() => setTestText(prev => prev + ' ' + tag)}
                            style={{
                              padding: '4px 10px', borderRadius: 8, border: '1px solid #ddd6fe',
                              background: '#faf5ff', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
                              color: '#7c3aed', fontWeight: 600, transition: 'all 0.15s',
                            }}
                            onMouseOver={e => { (e.target as any).style.background = '#ede9fe' }}
                            onMouseOut={e => { (e.target as any).style.background = '#faf5ff' }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Parler-TTS does not use standard sliders, it relies solely on the prompt above */}

              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  <Volume2 size={16} className="inline mr-1" /> Test Phrase
                  <Tip text={selectedModel === 'chatterbox-turbo'
                    ? "Enter what the voice should say. You can insert [laugh], [sigh], [cough], [chuckle] tags for natural human expressions."
                    : "Enter a short phrase for the voice to speak so you can preview the generated identity."
                  } />
                </label>
                <button onClick={handleEnhancePhrase} disabled={enhancingPhrase} className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={14} /> {enhancingPhrase ? 'Generating...' : 'Enhance Phrase'}
                </button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                {selectedModel === 'chatterbox-turbo'
                  ? 'Tip: Use paralinguistic tags like [laugh] and [sigh] for ultra-realistic human expression.'
                  : 'Enter a short phrase for the new voice to speak so you can preview the generated identity.'
                }
              </p>
              <textarea
                value={testText}
                onChange={e => setTestText(e.target.value)}
                rows={2}
                className="input textarea"
                style={{ fontFamily: "'DM Sans', sans-serif", resize: 'none' }}
              />
            </div>
          </Reveal>


        </div>

        {/* Action & Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Reveal>
            {generating ? (
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <div style={{
                  flex: 1, padding: '16px', borderRadius: 16, border: 'none',
                  background: selectedModel === 'chatterbox-turbo'
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : selectedModel === 'parler-tts'
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: 'white', fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'Syne, sans-serif'
                }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RefreshCw size={18} />
                  </motion.div>
                  Generating with {selectedModel === 'chatterbox-turbo' ? 'Chatterbox' : selectedModel === 'parler-tts' ? 'Parler-TTS' : 'Kokoro'}...
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelGeneration}
                  style={{
                    background: '#fee2e2', color: '#dc2626', fontSize: 15, fontWeight: 700,
                    padding: '0 24px', borderRadius: 16, border: '1px solid #fecaca',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', cursor: 'pointer'
                  }}>
                  Cancel
                </motion.button>
              </div>
            ) : (
              <motion.button
                onClick={generate}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                  background: selectedModel === 'chatterbox-turbo'
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : selectedModel === 'parler-tts'
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: selectedModel === 'chatterbox-turbo'
                    ? '0 8px 24px rgba(124,58,237,0.28)'
                    : '0 8px 24px rgba(37,99,235,0.28)',
                  fontFamily: 'Syne, sans-serif'
                }}>
                <><Wand2 size={18} /> Generate with {selectedModel === 'chatterbox-turbo' ? 'Chatterbox Turbo (GPU)' : selectedModel === 'parler-tts' ? 'Parler-TTS (CPU)' : 'Kokoro 82M (CPU)'}</>
              </motion.button>
            )}
          </Reveal>

          {/* Generating state — Pipeline visualization */}
          <AnimatePresence>
            {generating && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Animated orb */}
                <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 20 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    style={{ position: 'absolute', inset: -6, border: '2px dashed', borderColor: selectedModel === 'chatterbox-turbo' ? '#a78bfa' : '#93c5fd', borderRadius: '50%', opacity: 0.4 }} />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    style={{ position: 'absolute', inset: -14, border: '1px solid', borderColor: selectedModel === 'chatterbox-turbo' ? '#c4b5fd' : selectedModel === 'parler-tts' ? '#6ee7b7' : '#bfdbfe', borderRadius: '50%', opacity: 0.25 }} />
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selectedModel === 'chatterbox-turbo'
                        ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                        : selectedModel === 'parler-tts'
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'linear-gradient(135deg, #2563eb, #60a5fa)',
                      borderRadius: '50%', color: 'white',
                      boxShadow: selectedModel === 'chatterbox-turbo'
                        ? '0 0 30px rgba(124,58,237,0.5)'
                        : '0 0 30px rgba(37,99,235,0.5)',
                    }}>
                    {selectedModel === 'chatterbox-turbo' ? <Zap size={28} /> : <Activity size={28} />}
                  </motion.div>
                </div>

                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0f1e', marginBottom: 4 }}>
                  {selectedModel === 'chatterbox-turbo' ? 'Chatterbox Turbo' : selectedModel === 'parler-tts' ? 'Parler-TTS' : 'Kokoro 82M'} is generating...
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
                  {selectedModel === 'chatterbox-turbo' ? 'GPU-accelerated neural speech synthesis' : selectedModel === 'parler-tts' ? 'Prompt-based expressive neural voice generation' : 'CPU-based ultra-fast voice generation'}
                </div>

                {/* Pipeline steps */}
                <div style={{ width: '100%', maxWidth: 340 }}>
                  {currentSteps.map((step, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: i <= genStep ? 1 : 0.3 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                        fontSize: 13, color: i <= genStep ? '#334155' : '#cbd5e1',
                        fontWeight: i === genStep ? 600 : 400,
                      }}>
                      <span style={{ fontSize: 16 }}>{step.icon}</span>
                      <span>{step.label}</span>
                      {i === genStep && (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ marginLeft: 'auto' }}>
                          <RefreshCw size={12} style={{ color: selectedModel === 'chatterbox-turbo' ? '#7c3aed' : '#2563eb' }} />
                        </motion.div>
                      )}
                      {i < genStep && <span style={{ marginLeft: 'auto', color: '#059669', fontSize: 12 }}>Done</span>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Failed Result */}
          <AnimatePresence>
            {result?.status === 'failed' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card" style={{ padding: 20, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 600, fontSize: 14 }}>
                  <Zap size={16} /> Generation Failed
                </div>
                <div style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>
                  {result.error_message || 'An unknown error occurred during synthesis.'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completed Result */}
          <AnimatePresence>
            {result?.status === 'completed' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#0a0f1e', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
                    Generated Preview
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: selectedModel === 'chatterbox-turbo' ? '#ede9fe' : selectedModel === 'parler-tts' ? '#d1fae5' : '#dbeafe',
                      color: selectedModel === 'chatterbox-turbo' ? '#7c3aed' : selectedModel === 'parler-tts' ? '#059669' : '#2563eb',
                    }}>
                      {selectedModel === 'chatterbox-turbo' ? 'Chatterbox Turbo' : selectedModel === 'parler-tts' ? 'Parler-TTS' : 'Kokoro 82M'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                    <Clock size={12} />
                    {result.duration_seconds?.toFixed(1)}s
                  </div>
                </div>

                {result.output_url && (
                  <WaveformVisualizer url={result.output_url} height={64} showControls showDownload={false} />
                )}

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                  <label className="label" style={{ marginBottom: 4 }}>Save Voice</label>
                  <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                    Select an existing profile to add this voice to, or create a new profile.
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="input select" style={{ marginBottom: selectedProfile === 'new' ? 12 : 0 }}>
                      <option value="">— Select Target Profile —</option>
                      <option value="new">+ Create New Profile</option>
                      {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    {selectedProfile === 'new' && (
                      <input
                        type="text"
                        value={newProfileName}
                        onChange={e => setNewProfileName(e.target.value)}
                        placeholder="E.g., Mysterious Wizard"
                        className="input"
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Voice
                    </button>
                    <a
                      href={result.output_url}
                      download={`Vocaria_Generation_${new Date().getTime()}.wav`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary px-3"
                      title="Download Audio"
                    >
                      <Download size={16} />
                    </a>
                    <button onClick={() => { setResult(null); generate() }} className="btn btn-secondary px-3" title="Regenerate">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Recent Generations Queue */}
      {recentJobs.length > 0 && (
        <Reveal delay={0.1}>
          <div className="card" style={{ padding: 24, marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0a0f1e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} style={{ color: '#6366f1' }} />
                Recent Generations
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setRecentJobs([])} className="hover:bg-gray-200" style={{ padding: '4px 8px', border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, fontSize: 11, fontWeight: 500, transition: 'all 0.1s' }}>
                  <X size={12} /> Clear List
                </button>
                <button onClick={fetchRecent} style={{ padding: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex', borderRadius: 6 }}>
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 380, paddingRight: 4 }} className="scrollbar-hide">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                  <tr style={{ color: '#64748b' }}>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Model</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Profile</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Description</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Result</th>
                    <th style={{ padding: '12px 8px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 500, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {job.model === 'chatterbox-turbo' ? <Zap size={14} style={{ color: '#7c3aed' }} /> : job.model === 'parler-tts' ? <Sparkles size={14} style={{ color: '#059669' }} /> : <Cpu size={14} style={{ color: '#2563eb' }} />}
                          {job.model === 'chatterbox-turbo' ? 'Chatterbox' : job.model === 'parler-tts' ? 'Parler-TTS' : 'Kokoro 82M'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontWeight: 600, color: job.voice_profile_id ? '#334155' : '#94a3b8' }}>
                          {job.voice_profile_id ? voices.find(v => v.id === job.voice_profile_id)?.name || 'Unknown Profile' : 'Not saved'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#64748b', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.speaking_style || 'No description provided'}>
                          {job.speaking_style || 'No description provided'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: job.status === 'completed' ? '#d1fae5' : job.status === 'failed' ? '#fee2e2' : '#fef3c7',
                          color: job.status === 'completed' ? '#059669' : job.status === 'failed' ? '#dc2626' : '#d97706'
                        }}>
                          {job.status === 'processing' ? 'Processing...' : job.status === 'pending' ? 'Queued' : job.status === 'completed' ? 'Success' : 'Failed'}
                        </span>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                          {new Date(job.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {job.status === 'completed' && job.output_url ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setResult(job)} className="text-blue-600 hover:text-blue-800 font-600 text-xs flex items-center gap-1">
                              <Play size={12} /> View
                            </button>
                            <a href={job.output_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-800"><Download size={14} /></a>
                          </div>
                        ) : job.status === 'failed' ? (
                          <span style={{ color: '#dc2626', fontSize: 11 }}>{job.error_message || 'Error'}</span>
                        ) : (
                          <RefreshCw size={14} className="animate-spin text-gray-400" />
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteJob(job.id)} 
                          className="p-1.5 text-danger-500 opacity-50 hover:opacity-100 transition-opacity rounded-md hover:bg-danger-50 flex items-center justify-center w-8 h-8"
                          title="Delete generation"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
