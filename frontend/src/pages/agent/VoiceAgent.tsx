import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Mic, MicOff, Send, Settings, User as UserIcon, AlertTriangle, Plus } from 'lucide-react'
import { Reveal } from '@/hooks/motionVariants'
import { Link } from 'react-router-dom'
import api, { voicesApi } from '@/api/client'
import toast from 'react-hot-toast'

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

  // Web Speech API STT State
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

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
      recognition.continuous = true
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
          setTranscript(prev => prev + ' ' + finalTranscript.trim())
          // Auto send after pause could be implemented here
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      if (transcript.trim()) {
        handleSend(transcript.trim())
        setTranscript('')
      }
    } else {
      setTranscript('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || !selectedVoice) return
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    
    try {
      const { data } = await api.post('/agent/chat', {
        voice_profile_id: selectedVoice,
        message: userMsg.content,
        mode
      })
      
      const agentMsg: Message = { id: data.job_id, role: 'agent', content: data.text_response }
      setMessages(prev => [...prev, agentMsg])
      
      pollForAudio(data.job_id)
    } catch (err: any) {
      toast.error('Failed to get agent response')
      setLoading(false)
    }
  }

  const pollForAudio = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/generation/${jobId}`)
        if (data.status === 'completed' && data.output_url) {
          setMessages(prev => prev.map(m => m.id === jobId ? { ...m, audioUrl: data.output_url } : m))
          clearInterval(interval)
          setLoading(false)
          
          // Auto play the audio
          if (currentAudioRef.current) {
            currentAudioRef.current.pause()
          }
          const audio = new Audio(data.output_url)
          currentAudioRef.current = audio
          setIsPlaying(true)
          audio.onended = () => setIsPlaying(false)
          audio.play().catch(() => setIsPlaying(false))

        } else if (data.status === 'failed') {
          clearInterval(interval)
          setLoading(false)
          toast.error('Agent audio generation failed.')
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)
  }

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
    <div className="w-full space-y-6 pb-12 h-[calc(100vh-100px)] flex flex-col">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3"><Bot className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Vocaria Agent</h1></div>
            <p className="text-gray-500 font-medium mt-1.5 text-sm">
              Interact with your customized voices in real-time.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Config & Orb Visualizer */}
        <Reveal className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
          <div className="card p-5 space-y-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <h3 className="font-bold font-['Syne',sans-serif] text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Settings size={16} /> Configuration
            </h3>
            
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Voice Identity</label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="input select w-full text-sm py-2 px-3">
                  {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</label>
                <select value={mode} onChange={e => setMode(e.target.value)} className="input select w-full text-sm py-2 px-3">
                  <option value="default">Default Conversational</option>
                  <option value="interview">Interviewer</option>
                  <option value="storytelling">Storyteller</option>
                  <option value="support">Customer Support</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Interaction Type</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setInputMode('sts')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${inputMode === 'sts' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Speech-to-Speech</button>
                  <button onClick={() => setInputMode('tts')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${inputMode === 'tts' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Text-to-Speech</button>
                </div>
              </div>
            </div>
          </div>

          {/* ElevenLabs Style Orb Visualizer */}
          <div className="card flex-1 min-h-[250px] flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white overflow-hidden relative">
            <h4 className="absolute top-4 left-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</h4>
            
            <div className="relative w-32 h-32 flex items-center justify-center mt-4">
              {/* Core Orb */}
              <div className="absolute inset-0 bg-blue-600 rounded-full blur-[2px] opacity-90 z-10" />
              
              {/* Outer Aura (Pulsing when speaking/listening) */}
              <AnimatePresence>
                {(isPlaying || isRecording || loading) && (
                  <>
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: isRecording ? [1, 1.3, 1] : isPlaying ? [1, 1.5, 1.1, 1.4, 1] : [1, 1.1, 1] }}
                      transition={{ duration: isRecording ? 1.5 : isPlaying ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
                      className={`absolute inset-0 rounded-full blur-[10px] z-0 ${isRecording ? 'bg-red-500' : isPlaying ? 'bg-blue-400' : 'bg-gray-300'}`}
                    />
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.2 }}
                      animate={{ scale: isRecording ? [1, 1.6, 1] : isPlaying ? [1, 1.8, 1.2, 1.7, 1] : [1, 1.2, 1] }}
                      transition={{ duration: isRecording ? 1.5 : isPlaying ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                      className={`absolute inset-0 rounded-full blur-[20px] z-0 ${isRecording ? 'bg-red-400' : isPlaying ? 'bg-indigo-400' : 'bg-gray-200'}`}
                    />
                  </>
                )}
              </AnimatePresence>

              {/* Status Icon */}
              <div className="z-20 text-white">
                {isRecording ? <Mic size={32} /> : loading ? <Bot size={32} className="animate-pulse" /> : <Bot size={32} />}
              </div>
            </div>

            <div className="mt-8 text-center h-6">
              {isRecording ? (
                <span className="text-sm font-semibold text-red-500 animate-pulse">Listening...</span>
              ) : loading ? (
                <span className="text-sm font-semibold text-gray-500">Synthesizing Voice...</span>
              ) : isPlaying ? (
                <span className="text-sm font-semibold text-blue-600">Vocaria is speaking...</span>
              ) : (
                <span className="text-sm font-medium text-gray-400">Idle</span>
              )}
            </div>
          </div>
        </Reveal>

        {/* Right: Chat UI */}
        <Reveal delay={0.1} className="flex-1 flex flex-col min-h-[400px]">
          <div className="card flex-1 flex flex-col bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {messages.length === 0 && !transcript ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                  <Bot size={48} className="text-gray-200 mb-4" />
                  <p className="font-medium text-gray-500 text-lg">Start a conversation</p>
                  <p className="text-sm mt-2 max-w-xs leading-relaxed">
                    {inputMode === 'sts' ? 'Click the microphone button and start speaking to Vocaria.' : 'Type a message below to start interacting with Vocaria.'}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-100 text-purple-600'}`}>
                        {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 shadow-sm rounded-tl-sm text-gray-800'}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Interim STT Transcript */}
                  {transcript && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
                       <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"><UserIcon size={14} /></div>
                       <div className="p-4 rounded-2xl text-sm bg-blue-600/70 text-white rounded-tr-sm italic">
                         {transcript}
                       </div>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                        <Bot size={14} />
                      </div>
                      <div className="p-4 rounded-2xl text-sm bg-white border border-gray-100 shadow-sm rounded-tl-sm text-gray-500 flex items-center gap-2">
                        <span className="flex gap-1">
                          <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        </span>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              {inputMode === 'tts' ? (
                <div className="flex items-center gap-2">
                  <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message to Vocaria..."
                    className="flex-1 input bg-gray-50 border-transparent focus:bg-white text-sm py-3 px-4 rounded-xl"
                    disabled={loading || isRecording}
                  />
                  <button 
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim() || !selectedVoice}
                    className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <button 
                    onClick={toggleRecording}
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
                          ? 'radial-gradient(circle at 30% 30%, #ff4b4b, #7c3aed, #2563eb)' 
                          : 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #1e3a8a)',
                        boxShadow: isRecording 
                          ? '0 0 30px rgba(124,58,237,0.6), inset 0 0 20px rgba(255,255,255,0.5)' 
                          : '0 0 15px rgba(59,130,246,0.4), inset 0 0 10px rgba(255,255,255,0.3)',
                        filter: 'blur(1px)',
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
                  <span className="text-xs font-semibold text-gray-400 mt-4 uppercase tracking-wider text-center max-w-[250px] leading-relaxed">
                    {isRecording ? 'Session active. Tap to send.' : 'Tap sphere to start session and activate Vocaria'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
