import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Mic, MicOff, Send, Settings, User as UserIcon, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Reveal } from '@/hooks/motionVariants'
import { Link } from 'react-router-dom'
import api, { voicesApi } from '@/api/client'
import toast from 'react-hot-toast'
import { Play, Square, ChevronDown, Check } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  audioUrl?: string
}

export default function VoiceAgent() {
  const [voices, setVoices] = useState<any[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [mode, setMode] = useState('default')
  const [inputMode, setInputMode] = useState<'sts' | 'tts'>('sts')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)

  const AGENT_PERSONAS = [
    { id: 'default', name: 'Default Assistant', prompt: 'You are a highly technical AI assistant. Always respond concisely and provide direct answers without fluff.' },
    { id: 'interview', name: 'Interviewer', prompt: 'You are a professional HR interviewer. You will ask me a series of challenging behavioral and technical questions, one at a time. Evaluate my answers and push me to provide specific examples.' },
    { id: 'storytelling', name: 'Storyteller', prompt: 'You are a master storyteller. I will give you a topic or characters, and you will narrate a vivid, immersive, and highly descriptive story.' },
    { id: 'support', name: 'Customer Support', prompt: 'You are an empathetic, patient customer support representative. Always apologize for inconveniences, try to gather details, and provide step-by-step troubleshooting.' },
    { id: 'sales', name: 'Sales Rep', prompt: 'You are a persuasive and charming B2B sales development rep trying to book a meeting. I am the skeptical prospect. Try to handle my objections and close.' }
  ]
  const [systemPrompt, setSystemPrompt] = useState(AGENT_PERSONAS[0].prompt)

  // Handle persona change
  useEffect(() => {
    const p = AGENT_PERSONAS.find(p => p.id === mode)
    if (p) setSystemPrompt(p.prompt)
  }, [mode])
  const [showVoiceSelect, setShowVoiceSelect] = useState(false)
  const [hubIdInput, setHubIdInput] = useState('')
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Web Speech API STT State
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const transcriptRef = useRef('')
  const recognitionRef = useRef<any>(null)

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Continuous Session State
  const [sessionState, setSessionStateState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const sessionStateRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const setSessionState = (state: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    sessionStateRef.current = state
    setSessionStateState(state)
  }
  const [pendingAgentMessage, setPendingAgentMessage] = useState<Message | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    voicesApi.list({ page_size: 50 }).then(d => {
      const v = d.voices || []
      setVoices(v)
      if (v.length > 0) setSelectedVoice(v[0].id)
      setVoicesLoaded(true)
    }).catch(() => {
      setVoicesLoaded(true)
    })

    // Setup Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(prev => {
            const next = prev + (prev ? ' ' : '') + finalTranscript.trim()
            transcriptRef.current = next
            return next
          })
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        if (sessionStateRef.current === 'listening') {
          if (transcriptRef.current.trim()) {
            handleSend(transcriptRef.current.trim())
            setTranscript('')
            transcriptRef.current = ''
          } else {
            try { recognition.start(); setIsRecording(true); } catch (e) {}
          }
        }
      }

      recognitionRef.current = recognition
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript])

  const toggleSession = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser.')
      return
    }
    if (!selectedVoice) {
      toast.error('Please select a Voice Identity first.')
      return
    }

    if (sessionState !== 'idle') {
      // Stop session
      setSessionState('idle')
      setIsRecording(false)
      recognitionRef.current.stop()
      currentAudioRef.current?.pause()
      setPendingAgentMessage(null)
      setTranscript('')
      transcriptRef.current = ''
      setMessages([])
    } else {
      // Start session
      setMessages([])
      setTranscript('')
      transcriptRef.current = ''
      setSessionState('thinking')
      try {
        const { data } = await api.post('/agent/chat', {
          voice_profile_id: selectedVoice,
          message: "SYSTEM INSTRUCTION: Introduce yourself briefly in one sentence and ask how you can help me today.",
          mode,
          history: []
        })
        const agentMsg: Message = { id: data.job_id, role: 'agent', content: data.text_response }
        setPendingAgentMessage(agentMsg)
        pollForAudio(data.job_id, agentMsg)
      } catch (err) {
        toast.error('Failed to start session')
        setSessionState('idle')
      }
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || !selectedVoice) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    if (inputMode === 'sts') setSessionState('thinking')

    try {
      const { data } = await api.post('/agent/chat', {
        voice_profile_id: selectedVoice,
        message: userMsg.content,
        mode,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      })

      const agentMsg: Message = { id: data.job_id, role: 'agent', content: data.text_response }
      
      if (inputMode === 'sts') {
        setPendingAgentMessage(agentMsg)
        pollForAudio(data.job_id, agentMsg)
      } else {
        setMessages(prev => [...prev, agentMsg])
        pollForAudio(data.job_id)
      }
    } catch (err: any) {
      toast.error('Failed to get agent response')
      setLoading(false)
      if (inputMode === 'sts') setSessionState('idle')
    }
  }

  const pollForAudio = (jobId: string, agentMsgForSync?: Message) => {
    const interval = setInterval(async () => {
      if (sessionStateRef.current === 'idle' && agentMsgForSync) {
        clearInterval(interval)
        return
      }
      try {
        const { data } = await api.get(`/generation/${jobId}`)
        if (data.status === 'completed' && data.output_url) {
          clearInterval(interval)
          setLoading(false)

          if (agentMsgForSync) {
            const completeMsg = { ...agentMsgForSync, audioUrl: data.output_url }
            setMessages(prev => [...prev, completeMsg])
            setSessionState('speaking')
            setPendingAgentMessage(null)
          } else {
            setMessages(prev => prev.map(m => m.id === jobId ? { ...m, audioUrl: data.output_url } : m))
          }

          // Auto play the audio
          if (currentAudioRef.current) {
            currentAudioRef.current.pause()
          }
          const audio = new Audio(data.output_url)
          currentAudioRef.current = audio
          setIsPlaying(true)
          
          audio.onended = () => {
            setIsPlaying(false)
            if (sessionStateRef.current === 'speaking') {
              setSessionState('listening')
              setTranscript('')
              transcriptRef.current = ''
              try { recognitionRef.current?.start(); setIsRecording(true) } catch (e) {}
            }
          }
          audio.play().catch(() => {
            setIsPlaying(false)
            if (sessionStateRef.current === 'speaking') {
              setSessionState('listening')
              setTranscript('')
              transcriptRef.current = ''
              try { recognitionRef.current?.start(); setIsRecording(true) } catch (e) {}
            }
          })

        } else if (data.status === 'failed') {
          clearInterval(interval)
          setLoading(false)
          toast.error('Agent audio generation failed.')
          if (inputMode === 'sts') setSessionState('idle')
        }
      } catch {
        clearInterval(interval)
        if (inputMode === 'sts') setSessionState('idle')
      }
    }, 2000)
  }

  const togglePreview = (e: React.MouseEvent, voice: any) => {
    e.stopPropagation()
    // For now, if no actual preview URL is provided by backend, use a mock or fail gracefully.
    // We assume backend will provide `preview_url` or `avatar_url` containing audio in future.
    const previewUrl = voice.preview_url || voice.avatar_url || 'mock'

    if (playingPreview === voice.id) {
      previewAudioRef.current?.pause()
      setPlayingPreview(null)
      return
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
    }

    if (previewUrl === 'mock') {
      toast.error('Preview audio not available for this voice yet.')
      return
    }

    const audio = new Audio(previewUrl)
    previewAudioRef.current = audio
    setPlayingPreview(voice.id)
    audio.onended = () => setPlayingPreview(null)
    audio.play().catch(() => {
      toast.error('Failed to play voice preview')
      setPlayingPreview(null)
    })
  }

  // Click outside handler for custom select
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.voice-select-container')) {
        setShowVoiceSelect(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (voicesLoaded && voices.length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="card p-10 text-center max-w-md w-full bg-white border border-red-100/50">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold font-['Syne',sans-serif] text-gray-900 mb-2">No Voice Profile Found</h2>
          <p className="text-gray-500 mb-8 text-sm">
            You need to create a voice profile before you can talk to Vocaria. A voice profile gives Vocaria its identity.
          </p>
          <Link to="/voices/new" className="btn btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={16} /> Create Voice Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full pb-12 h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6">
      {/* Left Column: Header & Config */}
      <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-3"><Bot className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 animate-text-pan" style={{ fontFamily: "'Playfair Display', serif" }}>Vocaria Agent</h1></div>
              <p className="text-gray-500 font-medium mt-1.5 text-sm">
                Interact with your customized voices in real-time.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="w-full shrink-0 flex flex-col gap-6">
          <div className="card p-5 space-y-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <h3 className="font-bold font-['Syne',sans-serif] text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Settings size={16} /> Configuration
            </h3>

            <div className="space-y-4 flex-1">
              <div className="space-y-1.5 voice-select-container relative">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Voice Identity</label>
                <div
                  className="w-full text-sm py-2.5 px-3 bg-surface-50 border border-surface-200 hover:bg-white hover:border-brand-300 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                  onClick={() => setShowVoiceSelect(!showVoiceSelect)}
                >
                  <span className="font-600 text-surface-800">
                    {voices.find(v => v.id === selectedVoice)?.name || (selectedVoice ? `Hub Voice (${selectedVoice.substring(0,8)}...)` : 'Select a Voice')}
                  </span>
                  <ChevronDown size={16} className={`text-surface-400 transition-transform ${showVoiceSelect ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {showVoiceSelect && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 right-0 top-[60px] z-50 bg-white border border-surface-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden"
                    >
                      <div className="max-h-[320px] overflow-y-auto p-1.5 flex flex-col gap-1">
                        <div className="p-1 border-b border-surface-100 mb-1">
                          <input 
                            type="text" 
                            placeholder="Enter Hub ID..." 
                            className="w-full text-xs py-2 px-3 bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                            value={hubIdInput}
                            onChange={(e) => setHubIdInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && hubIdInput.trim()) {
                                setSelectedVoice(hubIdInput.trim());
                                setShowVoiceSelect(false);
                                setHubIdInput('');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {voices.map(v => (
                          <div
                            key={v.id}
                            onClick={() => { setSelectedVoice(v.id); setShowVoiceSelect(false); }}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${selectedVoice === v.id ? 'bg-brand-50' : 'hover:bg-surface-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => togglePreview(e, v)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${playingPreview === v.id ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-600 hover:bg-brand-100 hover:text-brand-600'}`}
                              >
                                {playingPreview === v.id ? <Square size={12} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
                              </button>
                              <div className="flex flex-col">
                                <span className={`text-sm font-600 ${selectedVoice === v.id ? 'text-brand-700' : 'text-surface-800'}`}>{v.name}</span>
                                <span className="text-[10px] uppercase tracking-wider font-700 text-surface-400">
                                  {v.is_synthetic !== undefined ? (v.is_synthetic ? 'Generated' : 'Cloned') : 'Voice Profile'}
                                </span>
                              </div>
                            </div>
                            {selectedVoice === v.id && <Check size={16} className="text-brand-600 mr-2" />}
                          </div>
                        ))}
                        {voices.length === 0 && (
                          <div className="p-4 text-center text-sm text-surface-500">No voices available</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Identity</label>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setMode(p.id)}
                      className={`text-left text-xs font-600 px-3 py-2.5 rounded-lg border transition-all ${mode === p.id ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm' : 'bg-surface-50 border-surface-200 text-surface-600 hover:bg-white hover:border-surface-300'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Interaction Type</label>
                <div className="flex bg-surface-100 p-1.5 rounded-xl shadow-inner">
                  <button onClick={() => setInputMode('sts')} className={`flex-1 text-xs py-2 font-600 rounded-lg transition-all duration-300 ${inputMode === 'sts' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'}`}>Speech-to-Speech</button>
                  <button onClick={() => setInputMode('tts')} className={`flex-1 text-xs py-2 font-600 rounded-lg transition-all duration-300 ${inputMode === 'tts' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'}`}>Text-to-Speech</button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Right: Chat UI */}
      <Reveal delay={0.1} className="flex-1 flex flex-col min-h-[400px]">
        <div className="card flex-1 flex flex-col bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden relative">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="font-600 text-surface-800 text-sm">Agent Session</h3>
                  <p className="text-[11px] text-surface-500 uppercase tracking-wider">{mode.replace('-', ' ')} mode</p>
                </div>
              </div>
              <button
                onClick={() => setMessages([])}
                disabled={messages.length === 0}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 text-surface-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} /> Clear Chat
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {messages.length === 0 && !transcript && sessionState === 'idle' ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-100 to-purple-50 flex items-center justify-center mb-6 shadow-inner border border-white">
                    <Bot size={40} className="text-brand-400" />
                  </div>
                  <p className="font-700 text-surface-800 text-xl tracking-tight">Start a conversation</p>
                  <p className="text-sm mt-3 max-w-[260px] text-surface-500 leading-relaxed font-500">
                    {inputMode === 'sts' ? 'Click the microphone orb below to start an autonomous voice session with your AI.' : 'Type a message below to start interacting with Vocaria.'}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      key={msg.id}
                      className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white' : 'bg-white border border-surface-200 text-brand-600'}`}>
                        {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-surface-100 text-surface-800 rounded-tl-sm'}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {/* Interim STT Transcript */}
                  {transcript && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-[88%] ml-auto flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"><UserIcon size={14} /></div>
                      <div className="px-4 py-3 rounded-2xl text-[14px] leading-relaxed bg-brand-500/80 backdrop-blur-sm text-white rounded-tr-sm italic shadow-sm border border-brand-400/30">
                        {transcript}
                      </div>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {loading && sessionState === 'thinking' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-[88%]">
                      <div className="w-8 h-8 rounded-full bg-white border border-surface-200 flex items-center justify-center shrink-0 text-brand-600 shadow-sm">
                        <Bot size={14} />
                      </div>
                      <div className="px-5 py-4 rounded-2xl bg-white border border-surface-100 shadow-sm rounded-tl-sm text-surface-500 flex items-center gap-2.5">
                        <span className="flex gap-1.5">
                          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.15 }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.3 }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                        </span>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-surface-100 relative z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                {isRecording ? (
                  <span className="text-[11px] font-700 text-rose-500 tracking-[0.1em] uppercase flex items-center gap-1.5 animate-pulse"><Mic size={14} /> Listening...</span>
                ) : loading ? (
                  <span className="text-[11px] font-700 text-surface-500 tracking-[0.1em] uppercase flex items-center gap-1.5"><Bot size={14} className="animate-pulse text-brand-500" /> Thinking...</span>
                ) : isPlaying ? (
                  <span className="text-[11px] font-700 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 tracking-[0.1em] uppercase flex items-center gap-1.5"><Bot size={14} className="text-brand-600" /> Agent Speaking...</span>
                ) : sessionState !== 'idle' ? (
                  <span className="text-[10px] font-800 text-surface-400 tracking-[0.15em] uppercase flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div> Session Active</span>
                ) : (
                  <span className="text-[10px] font-800 text-surface-400 tracking-[0.15em] uppercase flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-surface-300"></div> System Ready</span>
                )}
              </div>

              {inputMode === 'tts' ? (
                <div className="flex items-center gap-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message to Vocaria..."
                    className="flex-1 bg-surface-50 border border-surface-200 focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 text-[14px] font-500 py-3.5 px-5 rounded-2xl transition-all shadow-inner placeholder:text-surface-400"
                    disabled={loading || isRecording}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim() || !selectedVoice}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 hover:opacity-90 text-white flex items-center justify-center disabled:opacity-50 disabled:from-surface-300 disabled:to-surface-400 transition-all shadow-md shrink-0 focus:ring-4 focus:ring-brand-500/20"
                  >
                    <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <button
                    onClick={toggleSession}
                    disabled={loading}
                    style={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none',
                      opacity: loading ? 0.5 : 1,
                    }}
                    className="group"
                  >
                    <motion.div
                      animate={{
                        rotate: isRecording ? 360 : 0,
                        scale: isRecording ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: isRecording ? 4 : 0.5, repeat: isRecording ? Infinity : 0, ease: 'linear' }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: isRecording
                          ? 'radial-gradient(circle at 30% 30%, #f43f5e, #e11d48, #9f1239)'
                          : 'radial-gradient(circle at 30% 30%, #818cf8, #4f46e5, #312e81)',
                        boxShadow: isRecording
                          ? '0 0 30px rgba(225,29,72,0.6), inset 0 0 20px rgba(255,255,255,0.4)'
                          : '0 0 25px rgba(79,70,229,0.5), inset 0 0 15px rgba(255,255,255,0.4)',
                        filter: 'blur(0.5px)',
                      }}
                    />

                    <motion.div
                      animate={{
                        scale: isRecording ? [1, 1.2, 1] : 1,
                        opacity: isRecording ? [0.8, 1, 0.8] : 0.8
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        width: '60%',
                        height: '60%',
                        borderRadius: '50%',
                        background: 'white',
                        filter: 'blur(8px)',
                        opacity: 0.8,
                      }}
                    />

                    <div style={{ position: 'relative', zIndex: 10, color: 'white' }}>
                      {isRecording ? <MicOff size={24} /> : <Bot size={24} />}
                    </div>
                  </button>
                  <span className="text-[10px] font-800 text-surface-400 mt-5 uppercase tracking-[0.15em] text-center max-w-[250px] leading-relaxed">
                    {isRecording ? 'Session active. Tap to stop.' : 'Tap to start voice session'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Reveal>
    </div>
  )
}

