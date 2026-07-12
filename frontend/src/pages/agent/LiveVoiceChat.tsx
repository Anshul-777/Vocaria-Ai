import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX,
  ChevronDown, Settings, Bot, User, Clock, Pause,
  Play, RotateCcw, MessageSquare, Activity, Sparkles,
  ArrowLeft, X, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

/* ─── Types ────────────────────────────────────────────────────────────── */

interface AgentConfig {
  id: string
  name: string
  voice_id: string
  voice_name: string
  system_prompt: string
  brain_provider: string
  brain_model: string
  status: string
}

interface TranscriptEntry {
  id: string
  role: 'user' | 'agent'
  text: string
  timestamp: Date
  audioUrl?: string
}

type SessionState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error'

/* ─── Audio Visualizer ─────────────────────────────────────────────────── */

function AudioVisualizer({ isActive, color = 'indigo' }: { isActive: boolean; color?: string }) {
  const bars = 24
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  }
  const barColor = colorMap[color] || colorMap.indigo

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${isActive ? barColor : 'bg-gray-200'} transition-colors duration-200`}
          animate={isActive ? {
            height: [8, Math.random() * 48 + 12, Math.random() * 24 + 8, Math.random() * 56 + 8, 8],
          } : {
            height: [6, 10, 6],
          }}
          transition={{
            duration: isActive ? 0.6 + Math.random() * 0.4 : 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.03,
          }}
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  )
}

/* ─── Status Indicator ─────────────────────────────────────────────────── */

function SessionStatus({ state }: { state: SessionState }) {
  const config: Record<SessionState, { label: string; color: string; dot: string; pulse: boolean }> = {
    idle: { label: 'Ready', color: 'text-gray-500', dot: 'bg-gray-400', pulse: false },
    connecting: { label: 'Connecting...', color: 'text-amber-600', dot: 'bg-amber-500', pulse: true },
    listening: { label: 'Listening', color: 'text-emerald-600', dot: 'bg-emerald-500', pulse: true },
    processing: { label: 'Thinking...', color: 'text-blue-600', dot: 'bg-blue-500', pulse: true },
    speaking: { label: 'Speaking', color: 'text-indigo-600', dot: 'bg-indigo-500', pulse: true },
    error: { label: 'Error', color: 'text-red-600', dot: 'bg-red-500', pulse: false },
  }

  const s = config[state]

  return (
    <div className={`inline-flex items-center gap-2 text-[12px] font-semibold ${s.color}`}>
      <span className="relative flex h-2 w-2">
        {s.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${s.dot}`} />
      </span>
      {s.label}
    </div>
  )
}

/* ─── Transcript Message ───────────────────────────────────────────────── */

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.role === 'agent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isAgent ? 'bg-indigo-50' : 'bg-gray-100'
      }`}>
        {isAgent ? <Bot size={14} className="text-indigo-500" /> : <User size={14} className="text-gray-500" />}
      </div>
      <div className={`max-w-[75%] ${isAgent ? '' : 'text-right'}`}>
        <div className={`inline-block px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
          isAgent
            ? 'bg-indigo-50 text-gray-800 rounded-tl-md'
            : 'bg-gray-900 text-white rounded-tr-md'
        }`}>
          {entry.text}
        </div>
        <div className={`text-[10px] text-gray-400 mt-1 ${isAgent ? 'text-left' : 'text-right'}`}>
          {entry.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function LiveVoiceChat() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showAgentPicker, setShowAgentPicker] = useState(false)

  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  /* ─── Fetch Agents ───────────────────────────────────────────────────── */

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return
        const { data } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('status', 'deployed')
          .order('name')
        const agentList = (data || []) as AgentConfig[]
        setAgents(agentList)
        if (agentList.length > 0 && !selectedAgent) {
          setSelectedAgent(agentList[0])
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  /* ─── Auto-scroll transcript ─────────────────────────────────────────── */

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  /* ─── Timer ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (sessionState !== 'idle' && sessionState !== 'error') {
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sessionState])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  /* ─── Mic & WebSocket Connection ─────────────────────────────────────── */

  const startSession = useCallback(async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first')
      return
    }

    setSessionState('connecting')
    setTranscript([])
    setElapsedTime(0)

    try {
      // Request mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Initialize AudioContext for playback
      audioContextRef.current = new AudioContext()

      // Set up MediaRecorder for capturing audio
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })
      mediaRecorderRef.current = mediaRecorder

      // Try connecting to WebSocket voice engine
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8765/ws/voice/${selectedAgent.id}`

      let wsConnected = false

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          wsConnected = true
          setSessionState('listening')
          toast.success('Connected to voice engine')

          // Send agent config
          ws.send(JSON.stringify({
            type: 'config',
            agent_id: selectedAgent.id,
            agent_name: selectedAgent.name,
            voice_id: selectedAgent.voice_id,
            system_prompt: selectedAgent.system_prompt,
            brain_provider: selectedAgent.brain_provider,
            brain_model: selectedAgent.brain_model,
          }))
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'transcript') {
              setTranscript(prev => [...prev, {
                id: crypto.randomUUID(),
                role: msg.role,
                text: msg.text,
                timestamp: new Date(),
              }])
              setSessionState(msg.role === 'agent' ? 'speaking' : 'listening')
            } else if (msg.type === 'audio') {
              // Decode and play audio response
              const audioData = Uint8Array.from(atob(msg.data), c => c.charCodeAt(0))
              audioContextRef.current?.decodeAudioData(audioData.buffer).then(buffer => {
                const source = audioContextRef.current!.createBufferSource()
                source.buffer = buffer
                source.connect(audioContextRef.current!.destination)
                source.start()
                source.onended = () => setSessionState('listening')
              })
            } else if (msg.type === 'processing') {
              setSessionState('processing')
            }
          } catch {
            // Non-JSON message, ignore
          }
        }

        ws.onerror = () => {
          wsConnected = false
        }

        ws.onclose = () => {
          if (wsConnected) {
            setSessionState('idle')
          }
        }

        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000)
          ws.addEventListener('open', () => { clearTimeout(timeout); resolve() })
          ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WS failed')) })
        })
      } catch {
        // WebSocket not available — fall back to browser-only mode
        console.warn('Voice engine not available, running in demo mode')
        setSessionState('listening')

        // Demo mode: capture audio and show transcript
        toast('Voice engine not connected. Running in demo mode.', { icon: '🎤' })
      }

      // Start recording
      const audioChunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)

          // If WebSocket is connected, send audio chunks
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then(buffer => {
              wsRef.current!.send(buffer)
            })
          }
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(250) // Send chunks every 250ms

    } catch (err: any) {
      console.error('Failed to start session:', err)
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access.')
      } else {
        toast.error('Failed to start voice session')
      }
      setSessionState('error')
    }
  }, [selectedAgent])

  const endSession = useCallback(() => {
    // Stop recording
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setSessionState('idle')
    if (transcript.length > 0) {
      toast.success(`Session ended. ${transcript.length} messages recorded.`)
    }
  }, [transcript])

  /* ─── Demo Mode: Simulate response ──────────────────────────────────── */

  const sendDemoMessage = useCallback((text: string) => {
    // Add user message
    setTranscript(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
    }])

    setSessionState('processing')

    // Simulate agent thinking + response
    setTimeout(() => {
      setSessionState('speaking')

      const responses = [
        "I understand. Let me help you with that. Could you provide me with more details about what you're looking for?",
        "That's a great question. Based on the information I have, I'd recommend starting with our standard package.",
        "I've noted that down. Is there anything else I can assist you with today?",
        "Thank you for reaching out. I'll look into this and get back to you with a comprehensive answer.",
        "I appreciate you sharing that. Let me walk you through the next steps we can take together.",
      ]

      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'agent',
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      }])

      setTimeout(() => setSessionState('listening'), 1500)
    }, 1500 + Math.random() * 1000)
  }, [])

  /* ─── Render ─────────────────────────────────────────────────────────── */

  const isInSession = sessionState !== 'idle' && sessionState !== 'error'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="inline-flex items-center gap-2 text-[13px] text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Loading agents...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agent/dashboard')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <SessionStatus state={sessionState} />
        </div>

        <div className="flex items-center gap-3">
          {isInSession && (
            <div className="flex items-center gap-1.5 text-[13px] font-mono text-gray-600">
              <Clock size={13} className="text-gray-400" />
              {formatTime(elapsedTime)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 overflow-hidden">
        {!isInSession ? (
          /* ─── Idle State ─────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-[480px] w-full"
          >
            {/* Agent Selector */}
            <div className="mb-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-200/50">
                <Mic size={32} className="text-white" />
              </div>
              <h2 className="text-[20px] font-bold text-gray-900 mb-2">Live Voice Chat</h2>
              <p className="text-[13.5px] text-gray-500 leading-relaxed">
                Speak directly with your AI agent in real-time. Select an agent below and start a conversation.
              </p>
            </div>

            {agents.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                <AlertCircle size={20} className="text-amber-500 mx-auto mb-2" />
                <h3 className="text-[14px] font-bold text-amber-800 mb-1">No Deployed Agents</h3>
                <p className="text-[12.5px] text-amber-700">
                  You need at least one deployed agent to use Live Chat. Go to Agents → create and deploy one.
                </p>
                <button
                  onClick={() => navigate('/agent/agents')}
                  className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-[12.5px] font-semibold hover:bg-amber-700 transition-all"
                >
                  Go to Agents
                </button>
              </div>
            ) : (
              <>
                {/* Agent Picker */}
                <div className="relative mb-6">
                  <button
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Bot size={18} className="text-indigo-500" />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-gray-900">
                          {selectedAgent?.name || 'Select an agent'}
                        </div>
                        <div className="text-[11.5px] text-gray-500">
                          {selectedAgent?.voice_name || 'No voice selected'} · {selectedAgent?.brain_model || ''}
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAgentPicker ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showAgentPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-[240px] overflow-y-auto"
                      >
                        {agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => { setSelectedAgent(agent); setShowAgentPicker(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors ${
                              selectedAgent?.id === agent.id ? 'bg-indigo-50/80' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                              <Bot size={15} className="text-indigo-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-gray-900 truncate">{agent.name}</div>
                              <div className="text-[11px] text-gray-500">{agent.voice_name || 'Default'} · {agent.brain_model}</div>
                            </div>
                            {selectedAgent?.id === agent.id && (
                              <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Start Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startSession}
                  disabled={!selectedAgent}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[15px] font-bold shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:shadow-indigo-300/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Phone size={18} />
                  Start Conversation
                </motion.button>
              </>
            )}
          </motion.div>
        ) : (
          /* ─── Active Session ─────────────────────────────────────── */
          <div className="flex flex-col h-full w-full max-w-[700px]">
            {/* Agent Info */}
            <div className="flex items-center justify-center gap-3 py-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Bot size={20} className="text-indigo-500" />
              </div>
              <div className="text-center">
                <div className="text-[15px] font-bold text-gray-900">{selectedAgent?.name}</div>
                <div className="text-[11.5px] text-gray-500">{selectedAgent?.voice_name || 'Default Voice'}</div>
              </div>
            </div>

            {/* Visualizer */}
            <div className="py-4 shrink-0">
              <AudioVisualizer
                isActive={sessionState === 'listening' || sessionState === 'speaking'}
                color={sessionState === 'speaking' ? 'indigo' : sessionState === 'listening' ? 'emerald' : 'indigo'}
              />
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto px-2 space-y-4 min-h-0">
              {transcript.map((entry) => (
                <TranscriptBubble key={entry.id} entry={entry} />
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Demo Input (when WS not connected) */}
            {!wsRef.current && isInSession && (
              <div className="shrink-0 py-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const input = (e.target as HTMLFormElement).elements.namedItem('message') as HTMLInputElement
                    if (input.value.trim()) {
                      sendDemoMessage(input.value.trim())
                      input.value = ''
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    name="message"
                    placeholder="Type a message (demo mode)..."
                    className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-all"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-5 shrink-0">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={endSession}
                className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-200/50 hover:bg-red-600 transition-all"
              >
                <PhoneOff size={24} />
              </motion.button>

              <button className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-all">
                <Volume2 size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
