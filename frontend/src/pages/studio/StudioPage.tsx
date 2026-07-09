import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Video, Upload, Link as LinkIcon, Loader2, Mic2, FileAudio, FileText,
  Search, Play, Square, CheckCircle2, ChevronRight, Sparkles, Wand2, 
  Headphones, MessageSquare, BookOpen, Settings2, Globe, Radio,
  Tv, Megaphone, GraduationCap, Heart, SlidersHorizontal, RotateCcw
} from 'lucide-react'
import { studioApi, voicesApi, hubApi, agentApi, generationApi, getErrorMessage } from '@/api/client'
import { Reveal } from '@/hooks/motionVariants'
import toast from 'react-hot-toast'

// ─── Content Format Definitions with specialized generation prompts ──────────
// Each format carries a system-level instruction that shapes how the TTS model
// should render the voice — pacing, emphasis, breathing, and style.
// These prompts are injected as extra_metadata.format_instruction when the
// backend model supports separate instruction channels (Parler-TTS prompt field,
// or Chatterbox exaggeration/cfg presets).

const CONTENT_FORMATS = [
  { 
    id: 'voiceover', label: 'Voice Over', icon: Mic2, 
    desc: 'Professional, clear narration for videos, ads, and documentaries.',
    instruction: 'Deliver with a professional, authoritative tone. Maintain even pacing with clear enunciation. Pause naturally between sentences. Avoid emotional peaks — stay measured and composed throughout.',
    emotion: 'neutral', speed: 1.0, exaggeration: 0.25, cfg_weight: 0.6,
  },
  { 
    id: 'podcast', label: 'Podcast Host', icon: Headphones, 
    desc: 'Engaging, energetic conversational host energy.',
    instruction: 'Speak with infectious energy and warmth, as if talking directly to a friend. Vary your pace — speed up when excited, slow down for emphasis. Use natural filler pauses. Sound genuinely enthusiastic.',
    emotion: 'excited', speed: 1.05, exaggeration: 0.6, cfg_weight: 0.4,
  },
  { 
    id: 'audiobook', label: 'Audiobook', icon: BookOpen, 
    desc: 'Steady, expressive storytelling with immersive pacing.',
    instruction: 'Narrate with steady, immersive pacing. Use slight vocal variation to distinguish dialogue from description. Breathe naturally between paragraphs. Build tension through pacing, not volume.',
    emotion: 'calm', speed: 0.9, exaggeration: 0.4, cfg_weight: 0.5,
  },
  { 
    id: 'conversational', label: 'Conversational', icon: MessageSquare, 
    desc: 'Casual, relaxed, natural everyday speech.',
    instruction: 'Speak casually and naturally, as if in a relaxed conversation. Use contractions, natural pauses, and slight vocal fry. Sound approachable and genuine, not rehearsed.',
    emotion: 'happy', speed: 1.0, exaggeration: 0.45, cfg_weight: 0.35,
  },
  { 
    id: 'news', label: 'News Anchor', icon: Tv, 
    desc: 'Crisp, authoritative broadcast-quality delivery.',
    instruction: 'Deliver with a crisp, authoritative broadcast cadence. Enunciate every word clearly. Maintain a neutral, trustworthy tone. Pause deliberately between story segments.',
    emotion: 'neutral', speed: 1.0, exaggeration: 0.15, cfg_weight: 0.7,
  },
  { 
    id: 'commercial', label: 'Commercial / Ad', icon: Megaphone, 
    desc: 'Punchy, persuasive advertising delivery.',
    instruction: 'Deliver with punchy, persuasive energy. Emphasize key product names and benefits. Use rising intonation to build excitement. End with a strong, memorable call to action.',
    emotion: 'excited', speed: 1.1, exaggeration: 0.55, cfg_weight: 0.45,
  },
  { 
    id: 'educational', label: 'Educational', icon: GraduationCap, 
    desc: 'Clear, patient, instructional teaching style.',
    instruction: 'Explain clearly and patiently, as if teaching. Slow down for complex concepts. Use a warm, encouraging tone. Pause after key points to let information sink in.',
    emotion: 'calm', speed: 0.95, exaggeration: 0.3, cfg_weight: 0.55,
  },
  { 
    id: 'meditation', label: 'Meditation / ASMR', icon: Heart, 
    desc: 'Ultra-calm, breathy, intimate guided relaxation.',
    instruction: 'Speak in a soft, breathy whisper close to the microphone. Pace should be extremely slow with long pauses between phrases. Sound intimate, soothing, and deeply calming.',
    emotion: 'calm', speed: 0.75, exaggeration: 0.1, cfg_weight: 0.7,
  },
]

export default function StudioPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Voice Source State
  const [sourceMode, setSourceMode] = useState<'media' | 'existing' | 'hub'>('media')
  const [libSubTab, setLibSubTab] = useState<'generated' | 'clones'>('generated')
  const [hubSubTab, setHubSubTab] = useState<'saved' | 'popular'>('popular')
  
  // Media Extraction State
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  
  // Existing Voices State
  const [voices, setVoices] = useState<any[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  
  // Hub Voices State
  const [hubVoices, setHubVoices] = useState<any[]>([])
  const [loadingHub, setLoadingHub] = useState(false)
  const [voiceIdInput, setVoiceIdInput] = useState('')
  
  // Active Voice Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null)
  
  // Generation State
  const [contentFormat, setContentFormat] = useState('voiceover')
  const [script, setScript] = useState('')
  const [generating, setGenerating] = useState(false)
  const [enhancing, setEnhancing] = useState(false)

  // Script file upload
  const [scriptFile, setScriptFile] = useState<File | null>(null)

  // Advanced Parameters
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advSpeed, setAdvSpeed] = useState(1.0)
  const [advExaggeration, setAdvExaggeration] = useState(0.5)
  const [advCfgWeight, setAdvCfgWeight] = useState(0.5)
  const [advTemperature, setAdvTemperature] = useState(0.7)
  const [selectedModel, setSelectedModel] = useState('kokoro-82m')

  // Audio Playback
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize from query params or location state
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const vid = params.get('voice_id') || params.get('hub_voice')
    if (vid) {
      setSourceMode('hub')
      setVoiceIdInput(vid)
      handleVoiceIdSelect(vid)
    }
    fetchVoices()
  }, [location])

  // Fetch Hub voices when tab switches to Hub
  useEffect(() => {
    if (sourceMode === 'hub' && hubVoices.length === 0) {
      fetchHubVoices()
    }
  }, [sourceMode])

  // Apply format defaults when content format changes
  useEffect(() => {
    const fmt = CONTENT_FORMATS.find(f => f.id === contentFormat)
    if (fmt && !showAdvanced) {
      setAdvSpeed(fmt.speed)
      setAdvExaggeration(fmt.exaggeration)
      setAdvCfgWeight(fmt.cfg_weight)
    }
  }, [contentFormat])
  
  const fetchVoices = async () => {
    try {
      setLoadingVoices(true)
      const data = await voicesApi.list({ page_size: 100 })
      const v = data.voices || data || []
      setVoices(v)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingVoices(false)
    }
  }

  const fetchHubVoices = async () => {
    try {
      setLoadingHub(true)
      const data = await hubApi.listVoices({ sort: 'popular', page_size: 5 })
      setHubVoices(data.voices || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHub(false)
    }
  }

  const handleAutoProfile = async () => {
    if (!url && !file) {
      toast.error('Please provide either a URL or a file.')
      return
    }
    try {
      setExtracting(true)
      const formData = new FormData()
      if (url) formData.append('url', url)
      if (file) formData.append('file', file)
      const result = await studioApi.autoProfile(formData)
      toast.success(result.message || 'Voice profile created!')
      setSelectedVoiceId(result.voice_profile_id)
      setSelectedVoiceName(result.voice_profile_name)
      setSourceMode('existing')
      fetchVoices()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExtracting(false)
    }
  }
  
  const handleVoiceIdSelect = async (id: string) => {
    if (!id) return
    try {
      const v = await hubApi.getVoice(id)
      setSelectedVoiceId(v.id)
      setSelectedVoiceName(v.name)
      toast.success('Hub voice linked successfully!')
    } catch {
      // Try own library
      try {
        const v = await voicesApi.get(id)
        setSelectedVoiceId(v.id)
        setSelectedVoiceName(v.name)
        toast.success('Voice linked successfully!')
      } catch {
        toast.error('Voice ID not found.')
      }
    }
  }

  const handleScriptFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return
    try {
      const text = await uploadedFile.text()
      setScript(text.trim())
      setScriptFile(uploadedFile)
      toast.success(`Loaded script from ${uploadedFile.name}`)
    } catch (err) {
      toast.error('Failed to read file content')
    }
  }

  const handleEnhanceScript = async () => {
    if (!script) return toast.error('Enter some base text to enhance first.')
    try {
      setEnhancing(true)
      const result = await agentApi.enhancePhrase(script)
      setScript(result.enhanced || result.phrase || result)
      toast.success('Script enhanced!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setEnhancing(false)
    }
  }

  const resetAdvanced = () => {
    const fmt = CONTENT_FORMATS.find(f => f.id === contentFormat)
    if (fmt) {
      setAdvSpeed(fmt.speed)
      setAdvExaggeration(fmt.exaggeration)
      setAdvCfgWeight(fmt.cfg_weight)
    }
    setAdvTemperature(0.7)
    setSelectedModel('kokoro-82m')
    toast.success('Parameters reset to format defaults')
  }

  const handleGenerate = async () => {
    if (!selectedVoiceId || !script) return toast.error('Please select a voice and write a script.')
    
    try {
      setGenerating(true)
      const fmt = CONTENT_FORMATS.find(f => f.id === contentFormat)
      
      const payload: any = {
        voice_profile_id: selectedVoiceId,
        text: script,
        emotion: fmt?.emotion || 'neutral',
        speed: advSpeed,
        temperature: advTemperature,
        model: selectedModel,
        exaggeration: advExaggeration,
        cfg_weight: advCfgWeight,
        extra_metadata: {
          format: contentFormat,
          format_instruction: fmt?.instruction || '',
          source: 'studio',
          model: selectedModel,
        }
      }

      // For Parler-TTS, inject the format instruction as the voice prompt
      if (selectedModel === 'parler-tts' && fmt?.instruction) {
        payload.extra_metadata.prompt = fmt.instruction
      }
      
      await generationApi.generate(payload)
      toast.success('Content generation started!')
      navigate('/history')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  const togglePlay = (e: React.MouseEvent, previewUrl: string | null) => {
    e.stopPropagation()
    if (!previewUrl) {
      toast.error('No preview audio available for this voice.')
      return
    }
    if (playingUrl === previewUrl) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      setPlayingUrl(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(previewUrl)
      audio.onended = () => setPlayingUrl(null)
      audioRef.current = audio
      audio.play().catch(() => { toast.error('Failed to play'); setPlayingUrl(null) })
      setPlayingUrl(previewUrl)
    }
  }

  // Filter voices
  const myClones = voices.filter(v => v.fine_tuned === true)
  const myGenerated = voices.filter(v => v.fine_tuned === false)

  const VoiceListRender = ({ list, emptyText }: { list: any[], emptyText: string }) => {
    if (list.length === 0) return <p className="text-sm text-gray-500 text-center py-4">{emptyText}</p>
    return (
      <div className="space-y-2">
        {list.map(v => (
          <div 
            key={v.id}
            onClick={() => { setSelectedVoiceId(v.id); setSelectedVoiceName(v.name) }}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedVoiceId === v.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedVoiceId === v.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Mic2 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${selectedVoiceId === v.id ? 'text-blue-900' : 'text-gray-900'}`}>{v.name}</p>
              <p className="text-xs text-gray-500 truncate">{v.description || 'Voice Profile'}</p>
            </div>
            <button 
              onClick={(e) => togglePlay(e, v.preview_url)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${playingUrl === v.preview_url ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Preview"
            >
              {playingUrl === v.preview_url ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>
            {selectedVoiceId === v.id && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12">
      
      {/* Header */}
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-2">
          <div>
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6 text-gray-800" />
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 animate-text-pan" style={{ fontFamily: 'Playfair Display', serif }}>
                Voice Studio
              </h1>
            </div>
            <p className="text-gray-500 font-medium mt-1.5 text-sm">
              Extract voices from media or use your library to create rich, formatted audio content instantly.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ──────── Left Column: Voice Source ──────── */}
        <div className="lg:col-span-5 space-y-6">
          <Reveal delay={0.1}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
                  Select Voice Source
                </h2>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                {/* Source Mode Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg mb-6 shrink-0">
                  {(['media', 'existing', 'hub'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setSourceMode(mode)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${sourceMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {mode === 'media' ? 'Extract Media' : mode === 'existing' ? 'My Library' : 'Hub'}
                    </button>
                  ))}
                </div>

                {/* ─── Extract Media Tab ─── */}
                {sourceMode === 'media' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">YouTube / Media Link</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                          placeholder="https://youtube.com/watch?v=..."
                          value={url}
                          onChange={(e) => { setUrl(e.target.value); if (e.target.value) setFile(null) }}
                          disabled={extracting}
                        />
                      </div>
                    </div>
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                      <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400 font-semibold uppercase">OR</span></div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Upload File</label>
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'} rounded-xl p-6 cursor-pointer transition-colors`}>
                        {file ? (
                          <>
                            <Video className="w-6 h-6 text-blue-500 mb-2" />
                            <span className="text-blue-600 font-semibold text-sm">{file.name}</span>
                            <span className="text-blue-400 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-gray-600 font-semibold text-sm">Click or drag file</span>
                            <span className="text-gray-400 text-xs mt-1">Video or Audio</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUrl('') } }} disabled={extracting} />
                      </label>
                    </div>
                    <button 
                      className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      onClick={handleAutoProfile}
                      disabled={extracting || (!url && !file)}
                    >
                      {extracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : <><Sparkles size={16}/> Extract & Load Voice</>}
                    </button>
                  </div>
                )}

                {/* ─── My Library Tab ─── */}
                {sourceMode === 'existing' && (
                  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-4 shrink-0">
                      <button onClick={() => setLibSubTab('generated')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${libSubTab === 'generated' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>My Generated</button>
                      <button onClick={() => setLibSubTab('clones')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${libSubTab === 'clones' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>My Clones</button>
                    </div>
                    {loadingVoices ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400"/></div>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
                        {libSubTab === 'generated' ? (
                          <VoiceListRender list={myGenerated} emptyText="No generated voices yet." />
                        ) : (
                          <VoiceListRender list={myClones} emptyText="No cloned voices yet." />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Hub Tab ─── */}
                {sourceMode === 'hub' && (
                  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
                    <div className="space-y-2 shrink-0 mb-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                          placeholder="Paste Voice ID..."
                          value={voiceIdInput}
                          onChange={(e) => setVoiceIdInput(e.target.value)}
                        />
                        <button onClick={() => handleVoiceIdSelect(voiceIdInput)} className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm">Link</button>
                      </div>
                    </div>
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-4 shrink-0">
                      <button onClick={() => setHubSubTab('saved')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${hubSubTab === 'saved' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>Saved</button>
                      <button onClick={() => setHubSubTab('popular')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${hubSubTab === 'popular' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>Popular</button>
                    </div>
                    {loadingHub ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400"/></div>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
                        {hubSubTab === 'saved' ? (
                          <p className="text-sm text-gray-500 text-center py-4">No voices saved from Hub yet.</p>
                        ) : (
                          <VoiceListRender list={hubVoices} emptyText="No popular voices in Hub yet." />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        {/* ──────── Right Column: Content Generation ──────── */}
        <div className="lg:col-span-7 space-y-6">
          <Reveal delay={0.2}>
            <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-500 ${!selectedVoiceId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">2</span>
                  Generate Content
                </h2>
                {selectedVoiceId && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    <CheckCircle2 size={14} /> {selectedVoiceName || 'Linked Voice'}
                  </span>
                )}
              </div>

              <div className="p-6 space-y-6">
                
                {/* Content Format Grid */}
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-3 block">Content Format</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CONTENT_FORMATS.map(fmt => (
                      <button
                        key={fmt.id}
                        onClick={() => setContentFormat(fmt.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${contentFormat === fmt.id ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-purple-300'}`}
                      >
                        <fmt.icon className={`w-4 h-4 shrink-0 mt-0.5 ${contentFormat === fmt.id ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${contentFormat === fmt.id ? 'text-purple-900' : 'text-gray-900'}`}>{fmt.label}</p>
                          <p className={`text-[10px] mt-0.5 leading-snug ${contentFormat === fmt.id ? 'text-purple-700' : 'text-gray-500'}`}>{fmt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Show active format instruction */}
                  {contentFormat && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Format Instruction (auto-applied)</p>
                      <p className="text-xs text-slate-600 italic leading-relaxed">
                        {CONTENT_FORMATS.find(f => f.id === contentFormat)?.instruction}
                      </p>
                    </div>
                  )}
                </div>

                {/* Script Editor + File Upload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-900">Script / Text</label>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer transition-colors">
                        <FileText size={12} />
                        {scriptFile ? scriptFile.name : 'Upload .txt / .md'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".txt,.md,.text"
                          onChange={(e) => { if (e.target.files?.[0]) handleScriptFileUpload(e.target.files[0]) }}
                        />
                      </label>
                      <button 
                        onClick={handleEnhanceScript}
                        disabled={enhancing || !script}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        AI Enhance
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={script}
                    onChange={(e) => { setScript(e.target.value); setScriptFile(null) }}
                    placeholder="Enter the text you want the voice to speak, or upload a .txt / .md file above..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[140px] text-sm leading-relaxed"
                  />
                  {script && <p className="text-xs text-gray-400 mt-1 text-right">{script.length.toLocaleString()} characters</p>}
                </div>

                {/* Advanced Parameters */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <SlidersHorizontal size={14} /> Advanced Parameters
                    </span>
                    <ChevronRight size={16} className={`text-gray-400 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          {/* Model selector */}
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1.5 block">TTS Engine</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                              {[
                                { id: 'kokoro-82m', label: 'Kokoro 82M' },
                                { id: 'chatterbox-turbo', label: 'Chatterbox Turbo' },
                                { id: 'parler-tts', label: 'Parler-TTS' },
                              ].map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => setSelectedModel(m.id)}
                                  className={`flex-1 text-xs py-1.5 font-semibold rounded-md transition-all ${selectedModel === m.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Speed */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-gray-600">Speed</label>
                              <span className="text-xs text-gray-500 font-mono">{advSpeed.toFixed(2)}x</span>
                            </div>
                            <input type="range" min="0.5" max="2.0" step="0.05" value={advSpeed} onChange={e => setAdvSpeed(parseFloat(e.target.value))} className="w-full accent-purple-600" />
                          </div>
                          
                          {/* Exaggeration (Chatterbox) */}
                          {(selectedModel === 'chatterbox-turbo') && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-600">Exaggeration (Emotion)</label>
                                <span className="text-xs text-gray-500 font-mono">{advExaggeration.toFixed(2)}</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={advExaggeration} onChange={e => setAdvExaggeration(parseFloat(e.target.value))} className="w-full accent-purple-600" />
                            </div>
                          )}
                          
                          {/* CFG Weight (Chatterbox) */}
                          {(selectedModel === 'chatterbox-turbo') && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-600">CFG Weight (Stability)</label>
                                <span className="text-xs text-gray-500 font-mono">{advCfgWeight.toFixed(2)}</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={advCfgWeight} onChange={e => setAdvCfgWeight(parseFloat(e.target.value))} className="w-full accent-purple-600" />
                            </div>
                          )}
                          
                          {/* Temperature */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-gray-600">Temperature</label>
                              <span className="text-xs text-gray-500 font-mono">{advTemperature.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0.1" max="1.5" step="0.05" value={advTemperature} onChange={e => setAdvTemperature(parseFloat(e.target.value))} className="w-full accent-purple-600" />
                          </div>

                          {/* Reset */}
                          <button onClick={resetAdvanced} className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                            <RotateCcw size={12} /> Reset to Format Defaults
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Generate Action */}
                <div className="pt-2">
                  <button 
                    onClick={handleGenerate}
                    disabled={generating || !script || !selectedVoiceId}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {generating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Generating Content...</>
                    ) : (
                      <><Play size={18} fill="currentColor" /> Generate Audio</>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </Reveal>
        </div>

      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}

