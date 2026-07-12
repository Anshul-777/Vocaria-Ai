import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Copy, ExternalLink, Trash2, X, Check, ChevronDown,
  Bot, Mic2, Brain, FileText, Phone, Settings, Play, Square,
  CheckCircle2, Circle, ArrowRight, Sparkles, AlertTriangle
} from 'lucide-react'
import api, { voicesApi } from '@/api/client'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface Agent {
  id: string
  name: string
  status: 'deployed' | 'draft' | 'paused'
  voice_id: string
  voice_name: string
  system_prompt: string
  brain_provider: string
  brain_model: string
  brain_api_key: string
  created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  deployed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  draft: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  paused: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
}

const BRAIN_PROVIDERS = [
  { id: 'ollama', name: 'Ollama (Free)', description: 'Open-source models via Ollama API', requiresKey: false },
  { id: 'openai', name: 'OpenAI (BYOK)', description: 'GPT-4o, GPT-4o-mini', requiresKey: true },
  { id: 'anthropic', name: 'Anthropic (BYOK)', description: 'Claude Sonnet, Opus', requiresKey: true },
  { id: 'google', name: 'Google AI (BYOK)', description: 'Gemini Pro, Flash', requiresKey: true },
  { id: 'groq', name: 'Groq (BYOK)', description: 'Llama, Mixtral — ultra fast', requiresKey: true },
]

const BRAIN_MODELS: Record<string, string[]> = {
  ollama: ['llama3.1:8b', 'llama3.1:70b', 'mistral:7b', 'gemma2:9b', 'phi3:mini', 'qwen2:7b'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3.5-haiku-20241022'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
}

const AGENT_TEMPLATES = [
  { id: 'receptionist', name: 'Receptionist', prompt: 'You are a professional receptionist. Answer calls politely, take messages, and route callers to the appropriate department. Always confirm the caller\'s name and reason for calling.' },
  { id: 'sales', name: 'Sales Agent', prompt: 'You are a skilled sales representative. Engage prospects warmly, qualify their needs, present value propositions, handle objections gracefully, and aim to book a demo or close.' },
  { id: 'support', name: 'Customer Support', prompt: 'You are an empathetic customer support agent. Listen carefully to issues, apologize sincerely, troubleshoot step-by-step, and escalate when needed. Always confirm resolution.' },
  { id: 'order', name: 'Order Taker', prompt: 'You are a friendly order-taking agent. Help customers browse the menu or catalog, take their order accurately, confirm items and totals, and process payment. Upsell when appropriate.' },
  { id: 'scheduler', name: 'Appointment Scheduler', prompt: 'You are an efficient appointment scheduling agent. Check availability, suggest times, confirm bookings, send reminders, and handle reschedules or cancellations smoothly.' },
  { id: 'custom', name: 'Custom Agent', prompt: '' },
]

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'status'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userData.user.id)
        .order(sortField, { ascending: sortDir === 'asc' })

      if (error) throw error
      setAgents(data || [])
    } catch (err: any) {
      console.error('Failed to fetch agents:', err)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [sortField, sortDir])

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return
    try {
      const { error } = await supabase.from('agents').delete().eq('id', agentId)
      if (error) throw error
      toast.success('Agent deleted')
      fetchAgents()
    } catch {
      toast.error('Failed to delete agent')
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Agent ID copied')
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const totalPages = Math.max(1, Math.ceil(agents.length / pageSize))
  const paginatedAgents = agents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Agents</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">BETA</span>
          </div>
          <p className="text-[13.5px] text-gray-500 mt-1">Create and manage your AI Agents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 h-10 px-5 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all"
          >
            <Plus size={16} />
            New Agent
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1.2fr_2fr] gap-4 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 text-left">
            Name {sortField === 'name' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
          </button>
          <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 text-left">
            Status {sortField === 'status' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
          </button>
          <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 text-left">
            Created at {sortField === 'created_at' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
          </button>
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="inline-flex items-center gap-2 text-[13px] text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Loading agents...
            </div>
          </div>
        ) : paginatedAgents.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-50 mb-4">
              <Bot size={28} className="text-gray-300" />
            </div>
            <h3 className="text-[14px] font-bold text-gray-900 mb-1">No agents yet</h3>
            <p className="text-[13px] text-gray-500 mb-4">Create your first AI agent to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-all"
            >
              <Plus size={14} />
              Create Agent
            </button>
          </div>
        ) : (
          paginatedAgents.map((agent, i) => {
            const status = STATUS_STYLES[agent.status] || STATUS_STYLES.draft
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-[2fr_1fr_1.2fr_2fr] gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors items-center"
              >
                <div className="text-[13.5px] font-semibold text-gray-900 truncate">{agent.name}</div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </div>
                <div className="text-[13px] text-gray-500">
                  {new Date(agent.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => handleCopyId(agent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Copy size={13} /> Copy Agent ID
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-[12px] font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </motion.div>
            )
          })
        )}

        {/* Pagination */}
        {agents.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
            <span className="text-[12px] text-gray-500">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAgentModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => { setShowCreateModal(false); fetchAgents() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Create Agent Modal ─────────────────────────────────────────────────── */

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState('receptionist')
  const [systemPrompt, setSystemPrompt] = useState(AGENT_TEMPLATES[0].prompt)
  const [voices, setVoices] = useState<any[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [brainProvider, setBrainProvider] = useState('ollama')
  const [brainModel, setBrainModel] = useState('llama3.1:8b')
  const [brainApiKey, setBrainApiKey] = useState('')
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    voicesApi.list({ page_size: 50 }).then(d => {
      const v = d.voices || []
      setVoices(v)
      if (v.length > 0) setSelectedVoice(v[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = AGENT_TEMPLATES.find(t => t.id === template)
    if (t && t.id !== 'custom') setSystemPrompt(t.prompt)
  }, [template])

  useEffect(() => {
    const models = BRAIN_MODELS[brainProvider] || []
    if (models.length > 0) setBrainModel(models[0])
  }, [brainProvider])

  const handlePreviewVoice = (voiceId: string, previewUrl?: string) => {
    if (playingId === voiceId) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (!previewUrl) return
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(previewUrl)
    audioRef.current = audio
    setPlayingId(voiceId)
    audio.play()
    audio.onended = () => setPlayingId(null)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Please enter an agent name'); return }
    if (!selectedVoice) { toast.error('Please select a voice'); return }
    if (!systemPrompt.trim()) { toast.error('Please enter a system prompt'); return }

    const provider = BRAIN_PROVIDERS.find(p => p.id === brainProvider)
    if (provider?.requiresKey && !brainApiKey.trim()) {
      toast.error(`Please enter your ${provider.name} API key`)
      return
    }

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Not authenticated')

      const selectedVoiceData = voices.find(v => v.id === selectedVoice)

      const { error } = await supabase.from('agents').insert({
        user_id: userData.user.id,
        name: name.trim(),
        voice_id: selectedVoice,
        voice_name: selectedVoiceData?.name || 'Unknown',
        status: 'draft',
        system_prompt: systemPrompt.trim(),
        brain_provider: brainProvider,
        brain_model: brainModel,
        brain_api_key: brainApiKey || null,
      })

      if (error) throw error
      toast.success('Agent created successfully!')
      onCreated()
    } catch (err: any) {
      console.error('Failed to create agent:', err)
      toast.error(err.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  const STEPS = [
    { label: 'Name & Template', icon: Bot, description: 'Choose a name and agent type' },
    { label: 'Voice', icon: Mic2, description: 'Select the voice for your agent' },
    { label: 'Brain', icon: Brain, description: 'Configure the AI model' },
    { label: 'System Prompt', icon: FileText, description: 'Define how your agent behaves' },
    { label: 'Review & Deploy', icon: Sparkles, description: 'Review and create your agent' },
  ]

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0
      case 1: return !!selectedVoice
      case 2: {
        const prov = BRAIN_PROVIDERS.find(p => p.id === brainProvider)
        return prov ? (!prov.requiresKey || brainApiKey.trim().length > 0) : false
      }
      case 3: return systemPrompt.trim().length > 0
      default: return true
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[90] w-auto sm:w-[720px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-gray-900">Create New Agent</h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">{STEPS[step].description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-50 shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isComplete = i < step
            const isCurrent = i === step
            return (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
                    isCurrent ? 'bg-indigo-50 text-indigo-700' :
                    isComplete ? 'text-emerald-600 hover:bg-emerald-50' :
                    'text-gray-400'
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Icon size={14} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${i < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Name & Template */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Agent Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g., My Sales Agent"
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Agent Template</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {AGENT_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTemplate(t.id)}
                          className={`text-left px-4 py-3 rounded-xl border transition-all ${
                            template === t.id
                              ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`text-[13px] font-semibold ${template === t.id ? 'text-indigo-700' : 'text-gray-800'}`}>{t.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Voice */}
              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Select a Voice</label>
                  {voices.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[13px] font-semibold text-amber-800">No voices found</p>
                        <p className="text-[12px] text-amber-600 mt-0.5">Create a voice profile or clone a voice first to use it with your agent.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {voices.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVoice(v.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            selectedVoice === v.id
                              ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedVoice === v.id ? 'bg-indigo-100' : 'bg-gray-100'
                          }`}>
                            <Mic2 size={16} className={selectedVoice === v.id ? 'text-indigo-600' : 'text-gray-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{v.name}</div>
                            <div className="text-[11px] text-gray-400 truncate">{v.language || 'en'} · {v.gender || 'Unknown'}</div>
                          </div>
                          {v.preview_url && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id, v.preview_url) }}
                              className="p-1.5 rounded-lg hover:bg-white/80 transition-colors"
                            >
                              {playingId === v.id ? <Square size={14} className="text-indigo-600" /> : <Play size={14} className="text-gray-400" />}
                            </button>
                          )}
                          {selectedVoice === v.id && (
                            <Check size={16} className="text-indigo-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Brain */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">AI Provider</label>
                    <div className="space-y-2">
                      {BRAIN_PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setBrainProvider(p.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            brainProvider === p.id
                              ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-gray-900">{p.name}</div>
                            <div className="text-[11.5px] text-gray-500">{p.description}</div>
                          </div>
                          {brainProvider === p.id && <Check size={16} className="text-indigo-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Model</label>
                    <div className="relative">
                      <select
                        value={brainModel}
                        onChange={e => setBrainModel(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none cursor-pointer transition-all"
                      >
                        {(BRAIN_MODELS[brainProvider] || []).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {BRAIN_PROVIDERS.find(p => p.id === brainProvider)?.requiresKey && (
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-2">API Key</label>
                      <input
                        type="password"
                        value={brainApiKey}
                        onChange={e => setBrainApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono transition-all"
                      />
                      <p className="mt-1.5 text-[11px] text-gray-400">Your key is encrypted and stored securely. We never share it.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: System Prompt */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">System Prompt</label>
                    <p className="text-[12px] text-gray-500 mb-3">This defines how your agent behaves, responds, and what personality it has.</p>
                    <textarea
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      rows={10}
                      placeholder="You are a helpful assistant that..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none leading-relaxed transition-all"
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[11px] text-gray-400">{systemPrompt.length} characters</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Deploy */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 divide-y divide-gray-100">
                    <div className="px-5 py-3.5 flex justify-between">
                      <span className="text-[12.5px] text-gray-500 font-medium">Agent Name</span>
                      <span className="text-[13px] font-semibold text-gray-900">{name}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between">
                      <span className="text-[12.5px] text-gray-500 font-medium">Template</span>
                      <span className="text-[13px] font-semibold text-gray-900">{AGENT_TEMPLATES.find(t => t.id === template)?.name}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between">
                      <span className="text-[12.5px] text-gray-500 font-medium">Voice</span>
                      <span className="text-[13px] font-semibold text-gray-900">{voices.find(v => v.id === selectedVoice)?.name || '—'}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between">
                      <span className="text-[12.5px] text-gray-500 font-medium">Brain</span>
                      <span className="text-[13px] font-semibold text-gray-900">{BRAIN_PROVIDERS.find(p => p.id === brainProvider)?.name} / {brainModel}</span>
                    </div>
                    <div className="px-5 py-3.5">
                      <span className="text-[12.5px] text-gray-500 font-medium block mb-2">System Prompt</span>
                      <div className="text-[12.5px] text-gray-700 bg-white rounded-lg border border-gray-100 p-3 max-h-[120px] overflow-y-auto leading-relaxed">
                        {systemPrompt}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/30">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Create Agent
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}
