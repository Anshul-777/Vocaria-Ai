import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, MessageCircle, Globe, Code2, Lock, ArrowRight,
  CheckCircle2, Copy, ExternalLink, Shield, Zap, Settings,
  ChevronRight, Sparkles, X, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── Types ────────────────────────────────────────────────────────────── */

type ChannelId = 'web' | 'phone' | 'whatsapp' | 'api'

interface Channel {
  id: ChannelId
  name: string
  description: string
  icon: any
  status: 'available' | 'coming_soon' | 'locked'
  accent: string
  accentBg: string
  gradient: string
  features: string[]
}

/* ─── Channel Configuration ────────────────────────────────────────────── */

const CHANNELS: Channel[] = [
  {
    id: 'web',
    name: 'Web Conversation',
    description: 'Talk to your agents directly in the browser. No setup required — just click and speak.',
    icon: Globe,
    status: 'available',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    gradient: 'from-emerald-500 to-teal-500',
    features: [
      'Real-time voice conversation in browser',
      'Text chat fallback mode',
      'Embeddable widget for your website',
      'Custom branding and colors',
      'Conversation transcripts saved automatically',
    ],
  },
  {
    id: 'phone',
    name: 'Phone Number',
    description: 'Assign a phone number to your agent. Customers call in, your agent answers and handles conversations autonomously.',
    icon: Phone,
    status: 'coming_soon',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-50',
    gradient: 'from-blue-500 to-indigo-500',
    features: [
      'Dedicated phone number per agent',
      'Inbound & outbound calling',
      'Call forwarding to human operators',
      'Voicemail transcription',
      'Twilio / Telnyx SIP trunk integration',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Deploy your agent on WhatsApp Business. Respond to customer messages with voice notes and text.',
    icon: MessageCircle,
    status: 'coming_soon',
    accent: 'text-green-600',
    accentBg: 'bg-green-50',
    gradient: 'from-green-500 to-emerald-500',
    features: [
      'WhatsApp Business API integration',
      'Voice message support',
      'Rich text & media responses',
      'Template message management',
      'Multi-number support',
    ],
  },
  {
    id: 'api',
    name: 'API & Web Embed',
    description: 'Embed your agent into any third-party website or application using our REST API or drop-in widget script.',
    icon: Code2,
    status: 'coming_soon',
    accent: 'text-purple-600',
    accentBg: 'bg-purple-50',
    gradient: 'from-purple-500 to-violet-500',
    features: [
      'REST API with WebSocket streaming',
      'Embeddable <script> tag',
      'Custom UI components',
      'Authentication & rate limiting',
      'Webhook event notifications',
    ],
  },
]

/* ─── Locked Overlay ───────────────────────────────────────────────────── */

function ComingSoonOverlay() {
  return (
    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <Lock size={22} className="text-gray-400" />
      </div>
      <div className="text-[15px] font-bold text-gray-800 mb-1">Coming Soon</div>
      <p className="text-[12px] text-gray-500 max-w-[260px] text-center leading-relaxed">
        This integration is under active development and will be available in an upcoming release.
      </p>
      <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-semibold">
        <Sparkles size={12} />
        Notify me when available
      </div>
    </div>
  )
}

/* ─── Web Widget Code Generator ────────────────────────────────────────── */

function WebWidgetSection() {
  const [copied, setCopied] = useState(false)

  const embedCode = `<!-- Vocaria Agent Widget -->
<script
  src="https://cdn.vocaria.ai/widget/v1.js"
  data-agent-id="YOUR_AGENT_ID"
  data-theme="light"
  data-position="bottom-right"
  data-accent-color="#6366f1"
  async
></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    toast.success('Widget code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Quick Start */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <h3 className="text-[14px] font-bold text-emerald-800">Ready to Use</h3>
        </div>
        <p className="text-[13px] text-emerald-700 leading-relaxed mb-4">
          Use the <strong>Live Chat</strong> page to speak with your agents directly in the browser. No configuration needed.
        </p>
        <a
          href="/agent/live-chat"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-all shadow-sm"
        >
          Open Live Chat
          <ArrowRight size={14} />
        </a>
      </div>

      {/* Embed Code */}
      <div>
        <h3 className="text-[13px] font-semibold text-gray-700 mb-2">Embed Widget (Preview)</h3>
        <div className="relative rounded-xl border border-gray-200 bg-gray-900 p-4 overflow-hidden">
          <pre className="text-[12px] text-gray-300 font-mono leading-relaxed overflow-x-auto whitespace-pre">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/20 transition-all"
          >
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[11.5px] text-amber-600">
          <AlertTriangle size={12} />
          <span>Widget CDN is not yet live. This code is a preview of the upcoming embed system.</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function AgentIntegrations() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>('web')

  const currentChannel = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0]
  const Icon = currentChannel.icon

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Integrations</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Connect your agents to communication channels. Deploy on web, phone, WhatsApp, or embed via API.
        </p>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {CHANNELS.map((channel) => {
          const ChIcon = channel.icon
          const isActive = channel.id === activeChannel
          const isLocked = channel.status === 'coming_soon'

          return (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <ChIcon size={15} />
              {channel.name}
              {isLocked && (
                <Lock size={11} className={isActive ? 'text-gray-400' : 'text-gray-300'} />
              )}
            </button>
          )
        })}
      </div>

      {/* Channel Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChannel}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          {currentChannel.status === 'coming_soon' && <ComingSoonOverlay />}

          <div className="p-6 sm:p-8">
            {/* Channel Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl ${currentChannel.accentBg} flex items-center justify-center shrink-0`}>
                <Icon size={24} className={currentChannel.accent} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[18px] font-bold text-gray-900">{currentChannel.name}</h2>
                  {currentChannel.status === 'available' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <Lock size={9} />
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed max-w-[600px]">
                  {currentChannel.description}
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="mb-6">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Capabilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentChannel.features.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-2.5 py-2"
                  >
                    <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${currentChannel.accent}`} />
                    <span className="text-[13px] text-gray-700 leading-relaxed">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Web-specific section */}
            {activeChannel === 'web' && <WebWidgetSection />}

            {/* Phone-specific (locked) */}
            {activeChannel === 'phone' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <h3 className="text-[14px] font-bold text-gray-800 mb-2">Setup Requirements</h3>
                <ul className="space-y-2 text-[13px] text-gray-600">
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> Twilio or Telnyx account with SIP trunk</li>
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> Phone number purchased through your provider</li>
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> Vocaria Pro or Enterprise plan required</li>
                </ul>
              </div>
            )}

            {/* WhatsApp-specific (locked) */}
            {activeChannel === 'whatsapp' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <h3 className="text-[14px] font-bold text-gray-800 mb-2">Setup Requirements</h3>
                <ul className="space-y-2 text-[13px] text-gray-600">
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> WhatsApp Business API access</li>
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> Verified Meta Business Account</li>
                  <li className="flex items-center gap-2"><ChevronRight size={13} className="text-gray-400 shrink-0" /> Vocaria Enterprise plan required</li>
                </ul>
              </div>
            )}

            {/* API-specific (locked) */}
            {activeChannel === 'api' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <h3 className="text-[14px] font-bold text-gray-800 mb-2">API Endpoints (Preview)</h3>
                <div className="space-y-2 font-mono text-[12px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">POST</span>
                    <span>/api/v1/agents/{'{agent_id}'}/conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">WS</span>
                    <span>/ws/voice/{'{agent_id}'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">GET</span>
                    <span>/api/v1/agents/{'{agent_id}'}/transcripts</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
