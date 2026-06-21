import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Mic2, Wand2, Edit3, Trash2, Globe, Lock, Building2, MoreHorizontal, Zap, Play, Bot, Headphones, Hash } from 'lucide-react'
import { voicesApi } from '@/api/client'
import { Reveal, StaggerGroup, StaggerItem } from '@/hooks/motionVariants'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LANGS: Record<string, string> = {
  en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦', hi: '🇮🇳',
}
const VISIBILITY_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  private: { icon: Lock, label: 'Private', color: '#94a3b8' },
  organization: { icon: Building2, label: 'Org', color: '#7c3aed' },
  public: { icon: Globe, label: 'Public', color: '#059669' },
}
const TRAINING_COLORS: Record<string, string> = {
  ready: '#059669', training: '#d97706', failed: '#ef4444', pending: '#94a3b8',
}

export function VoiceCard({ voice, onDelete, onGenerate, onClone }: { voice: any; onDelete: () => void; onGenerate: () => void; onClone: () => void }) {
  const [menu, setMenu] = useState(false)
  const [hovering, setHovering] = useState(false)
  const VisIcon = VISIBILITY_CONFIG[voice.visibility]?.icon || Lock
  const isPublic = voice.visibility === 'public' || voice.visibility === 'PUBLIC'
  
  const initials = voice.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const hues = voice.id ? parseInt(voice.id.slice(0, 4), 16) % 360 : 220
  const isReady = voice.training_status === 'ready' || voice.training_status === 'completed'

  const navigate = useNavigate()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
      onClick={() => navigate(`/voices/${voice.id}`)}
      className="bg-white rounded-3xl p-5 relative group cursor-pointer"
      style={{
        border: '1px solid #f1f5f9',
        boxShadow: hovering ? '0 12px 32px rgba(0,0,0,0.06)' : '0 4px 16px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease-out'
      }}>
      
      {/* Top Section */}
      <div className="flex gap-4">
        {/* Avatar */}
        {voice.avatar_url ? (
          <img src={voice.avatar_url} alt="" className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-[60px] h-[60px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-['Syne',sans-serif] font-bold text-xl"
               style={{ background: `linear-gradient(135deg, hsl(${hues},80%,60%), hsl(${hues+40},75%,55%))` }}>
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start">
            <h3 className="font-['Syne',sans-serif] font-bold text-lg text-gray-900 truncate pr-2 leading-tight">
              {voice.name}
            </h3>
            
            {/* Menu */}
            <div className="relative">
              <button onClick={e => { e.stopPropagation(); setMenu(!menu) }}
                className="text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <MoreHorizontal size={18} />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 w-40 z-20 py-1"
                    onMouseLeave={() => setMenu(false)}>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/voices/${voice.id}`); setMenu(false) }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit3 size={14}/> Edit Profile</button>
                    <button onClick={(e) => { e.stopPropagation(); onGenerate(); setMenu(false) }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Wand2 size={14}/> Generate</button>
                    <button onClick={(e) => { e.stopPropagation(); onClone(); setMenu(false) }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Zap size={14}/> Re-clone</button>
                    <div className="h-px bg-gray-100 my-1"/>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenu(false) }} className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Demographics / Tags row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap">
              {(voice.language || 'EN').toUpperCase()}
            </span>
            {voice.gender && <span className="text-gray-500 text-xs font-medium">{voice.gender}</span>}
            {voice.age_style && <span className="text-gray-500 text-xs font-medium">{voice.age_style}</span>}
            {voice.accent && <span className="text-gray-500 text-xs font-medium">{voice.accent}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Headphones size={13}/> {voice.plays_count || 0} Uses</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Zap size={13}/> {voice.training_status === 'completed' ? '1' : '0'} Clones</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Wand2 size={13}/> {voice.plays_count || 0} Gens</span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-5 flex items-center gap-3">
        {/* Main Action Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all",
            isReady 
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
          disabled={!isReady}
        >
          {isReady ? <><Wand2 size={16} /> Generate</> : 'Not Ready'}
        </button>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 px-1">
          {/* Visibility */}
          <div className="flex items-center gap-1.5" title={isPublic ? "Public Profile" : "Private Profile"}>
            {isPublic ? <Globe size={16} className="text-gray-400" /> : <Lock size={16} className="text-gray-400" />}
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
              {isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          
          {/* Training Status indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-amber-500'}`} />
            {!isReady && <span className="text-xs font-semibold text-amber-600 hidden sm:inline">Training</span>}
          </div>
        </div>

        {/* Play Button */}
        <button 
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
          disabled={!isReady}
          onClick={(e) => { e.stopPropagation(); /* Play functionality */ }}
        >
          <Play size={16} className="ml-0.5" />
        </button>
      </div>
    </motion.div>
  )
}

export default function VoiceLibrary() {
  const navigate = useNavigate()
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState('')
  const [total, setTotal] = useState(0)

  const loadVoices = async () => {
    setLoading(true)
    try {
      const data = await voicesApi.list({ search: search || undefined, visibility: visibility || undefined, page_size: 24 })
      setVoices(data.voices || [])
      setTotal(data.total || 0)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadVoices() }, [search, visibility])

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this voice profile?')) return
    try { await voicesApi.delete(id); toast.success('Voice archived'); loadVoices() }
    catch { toast.error('Failed to archive') }
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3"><Mic2 className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Voice Profiles</h1></div>
            <p className="text-gray-500 font-medium mt-1.5 text-sm">
              {total} voice profiles · Manage, clone, and generate
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/generate" className="btn btn-secondary flex items-center gap-2"><Wand2 size={14} /> Generate Voice</Link>
            <Link to="/agent" className="btn btn-secondary flex items-center gap-2"><Bot size={14} /> Vocaria</Link>
            <Link to="/clone" className="btn btn-secondary flex items-center gap-2"><Zap size={14} /> Clone Voice</Link>
            <Link to="/voices/new" className="btn btn-primary flex items-center gap-2"><Plus size={14} /> New Profile</Link>
          </div>
        </div>
      </Reveal>

      {/* Filters */}
      <Reveal delay={0.05}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search voices…" className="input" style={{ paddingLeft: 36, height: 40 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ val: '', label: 'All' }, { val: 'private', label: '🔒 Private' }, { val: 'public', label: '🌐 Public' }].map(opt => (
              <button key={opt.val} onClick={() => setVisibility(opt.val)}
                style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${visibility === opt.val ? '#2355f5' : '#dde4f0'}`, background: visibility === opt.val ? 'rgba(35,85,245,0.08)' : 'white', color: visibility === opt.val ? '#2355f5' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Grid */}
      {loading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-gray-100 border-t-black animate-spin" />
          <div className="flex items-end text-[13px] font-bold text-gray-400 uppercase tracking-widest mt-2">
            Loading
            <span className="flex ml-0.5 pb-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </div>
        </motion.div>
      ) : voices.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Wand2 size={28} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: '#0a0f1e', marginBottom: 8 }}>No voice profiles yet</div>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>Create your first voice profile and start generating voice audio.</p>
          <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 24 }}>(Note: A voice profile is required for voice generation)</p>
          <Link to="/voices/new" className="btn btn-primary">Generate your 1st voice</Link>
        </motion.div>
      ) : (
        <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
          <AnimatePresence>
            {voices.map(v => (
              <VoiceCard key={v.id} voice={v}
                onDelete={() => handleDelete(v.id)}
                onGenerate={() => navigate(`/generate?voice=${v.id}`)}
                onClone={() => navigate(`/clone?voice=${v.id}`)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
