import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Search, Heart, Play, Mic2, Download, TrendingUp, Clock, Star, Bookmark } from 'lucide-react'
import { hubApi } from '@/api/client'
import { Reveal, StaggerGroup, StaggerItem, CountUp, WaveBars, EmptyState, Spinner } from '@/components/ui/shared'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const LANG_OPTIONS = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: '🇺🇸 English' }, { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' }, { code: 'de', label: '🇩🇪 German' },
  { code: 'it', label: '🇮🇹 Italian' }, { code: 'pt', label: '🇵🇹 Portuguese' },
  { code: 'zh', label: '🇨🇳 Chinese' }, { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'ko', label: '🇰🇷 Korean' }, { code: 'hi', label: '🇮🇳 Hindi' },
]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'popular', label: 'Most Popular', icon: TrendingUp },
  { value: 'likes', label: 'Most Liked', icon: Heart },
]
const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d']

const MOCK_TEMPLATES = [
  { id: 'tpl-1', name: 'Aria', language: 'en', gender: 'female', age_style: 'young', description: 'Warm and expressive, perfect for storytelling and audiobooks. High clarity and emotion.', plays_count: 14205, likes_count: 890, owner: { display_name: 'Vocaria Labs' }, is_hub_featured: true },
  { id: 'tpl-2', name: 'Pulse', language: 'en', gender: 'male', age_style: 'adult', description: 'Deep, resonant, and highly energetic voice for commercials and trailers. High impact.', plays_count: 38400, likes_count: 1205, owner: { display_name: 'Vocaria Labs' }, is_hub_featured: true },
  { id: 'tpl-3', name: 'Lingua', language: 'es', gender: 'female', age_style: 'adult', description: 'Smooth conversational Spanish voice, great for localized marketing and podcasts.', plays_count: 8920, likes_count: 340, owner: { display_name: 'Vocaria Labs' }, is_hub_featured: true },
  { id: 'tpl-4', name: 'Echo', language: 'en', gender: 'male', age_style: 'young', description: 'Crisp, articulate AI assistant voice perfectly tuned for conversational agents.', plays_count: 11200, likes_count: 756, owner: { display_name: 'Vocaria Labs' }, is_hub_featured: true },
]

function VoiceHubRow({ voice, onClone, isLiked, isSaved, onLike, onSave, onPlay }: { voice: any; onClone: () => void; isLiked: boolean; isSaved: boolean; onLike: () => void; onSave: () => void; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hue = PALETTE[voice.id?.charCodeAt(0) % PALETTE.length] ?? '#2563eb'
  const initials = voice.name?.slice(0, 2).toUpperCase() ?? 'VC'

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!voice.preview_url) {
      toast.error("No audio preview available")
      return
    }

    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(voice.preview_url)
        audioRef.current.onended = () => setPlaying(false)
      }
      audioRef.current.play().catch(err => {
        toast.error("Failed to play audio")
        setPlaying(false)
      })
      setPlaying(true)
      onPlay()
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(voice.id)
    toast.success('Voice ID copied')
  }

  const shareLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/hub?voice=${voice.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const downloadWav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (voice.preview_url) {
      try {
        const response = await fetch(voice.preview_url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${voice.name.replace(/\s+/g, '_')}_preview.wav`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (err) {
        toast.error('Failed to download audio')
      }
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-hover"
      style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', borderRadius: 12 }}
    >
      {/* Left Avatar/Play Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 44, flexShrink: 0 }}>
        {voice.avatar_url ? (
          <img src={voice.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-2)', overflow: 'hidden' }}>
            <img src="/favicon.svg" alt="Vocaria Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
        )}
        <button
          onClick={togglePlay}
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
          className="hover-pop"
        >
          {playing ? <span style={{ color: hue, fontSize: 12 }}>■</span> : <Play size={14} color={hue} style={{ marginLeft: 2 }} />}
        </button>
      </div>

      {/* Middle Details Area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--fg)', letterSpacing: '-0.01em' }}>{voice.name}</div>

          {/* Plays and Likes moved beside name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-4)', fontWeight: 500 }}>
              <Play size={12} /><span>{(voice.plays_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--pink)', fontWeight: 500 }}>
              <Heart size={12} fill="var(--pink)" /><span>{(voice.likes_count || 0).toLocaleString()}</span>
            </div>
          </div>

          {voice.is_hub_featured && (
            <span className="badge badge-amber" style={{ fontSize: 10, padding: '2px 6px', marginLeft: 4 }}>⭐ Featured</span>
          )}

          <div style={{ flex: 1 }} />

          {/* Action Row - Inline with Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); onLike(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--bg-2)', color: isLiked ? 'var(--pink)' : 'var(--fg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="hover-opacity">
              <Heart size={13} fill={isLiked ? 'var(--pink)' : 'none'} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSave(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--bg-2)', color: isSaved ? 'var(--blue)' : 'var(--fg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="hover-opacity">
              <Bookmark size={13} fill={isSaved ? 'var(--blue)' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
            </button>
            <button onClick={copyId} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--bg-2)', color: 'var(--fg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="hover-opacity">
              Copy ID
            </button>
            <button onClick={shareLink} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--bg-2)', color: 'var(--fg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="hover-opacity">
              Share
            </button>
            {voice.preview_url && (
              <button onClick={downloadWav} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--bg-2)', color: 'var(--fg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="hover-opacity">
                <Download size={13} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClone() }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.12s' }}
              className="hover-opacity">
              <Mic2 size={13} /> Use
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-4)', marginBottom: 10, fontWeight: 500 }}>
          <span>{voice.language?.toUpperCase() || 'EN'}</span>
          {voice.gender && <><span>·</span><span style={{ textTransform: 'capitalize' }}>{voice.gender}</span></>}
          {voice.age_style && <><span>·</span><span style={{ textTransform: 'capitalize' }}>{voice.age_style}</span></>}
          <span>·</span>
          <span>by <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{voice.owner?.display_name || 'Vocaria AI'}</span></span>
        </div>

        {voice.description && (
          <div style={{ padding: '8px 14px', background: 'var(--bg-2)', borderRadius: 8, fontSize: 13, color: 'var(--fg-3)', fontStyle: 'italic', borderLeft: `3px solid ${hue}`, lineHeight: 1.5 }}>
            "{voice.description}"
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function HubPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [voices, setVoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [lang, setLang] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewSavedOnly, setViewSavedOnly] = useState(false)

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const PAGE_SIZE = 50

  useEffect(() => {
    hubApi.stats().then(d => {
      if (d.public_voices === 0) {
        setStats({ public_voices: 4, active_users: 124, total_plays: 72725 })
      } else {
        setStats(d)
      }
    }).catch(() => { 
      setStats({ public_voices: 4, active_users: 124, total_plays: 72725 }) 
    })
    if (user) {
      hubApi.getSaved().then(d => setSavedIds(new Set(d.saved_voices))).catch(() => { })
      hubApi.getLikes().then(d => setLikedIds(new Set(d.liked_voices))).catch(() => { })
    }
    loadVoices(1, true)
  }, [user])

  const loadVoices = useCallback(async (p: number, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true)
    try {
      const data = await hubApi.listVoices({ page: p, page_size: PAGE_SIZE, search: search || undefined, language: lang || undefined, sort })
      const fetched = data.voices || []
      
      if (reset && fetched.length === 0 && !search && !lang) {
        setVoices(MOCK_TEMPLATES)
        setTotal(4)
      } else {
        setVoices(prev => reset ? fetched : [...prev, ...fetched])
        setTotal(data.total || 0)
      }
      setPage(p)
    } catch { } finally {
      setLoading(false); setLoadingMore(false)
    }
  }, [search, lang, sort])

  useEffect(() => { loadVoices(1, true) }, [search, lang, sort])

  const cloneVoice = async (voiceId: string) => {
    if (!user) { navigate('/login'); return }
    toast.success('Opening Studio…')
    navigate(`/studio?hub_voice=${voiceId}`)
  }

  const handlePlay = async (voiceId: string) => {
    try {
      const { plays_count } = await hubApi.playVoice(voiceId)
      setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, plays_count } : v))
    } catch { }
  }

  const handleLike = async (voiceId: string) => {
    if (!user) { toast.error('Login to like voices'); return; }
    try {
      const { liked, likes_count } = await hubApi.likeVoice(voiceId)
      setLikedIds(prev => {
        const next = new Set(prev)
        if (liked) next.add(voiceId)
        else next.delete(voiceId)
        return next
      })
      setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, likes_count } : v))
    } catch { }
  }

  const handleSave = async (voiceId: string) => {
    if (!user) { toast.error('Login to save voices'); return; }
    try {
      const { saved } = await hubApi.saveVoice(voiceId)
      setSavedIds(prev => {
        const next = new Set(prev)
        if (saved) next.add(voiceId)
        else next.delete(voiceId)
        return next
      })
      toast.success(saved ? 'Voice saved' : 'Voice removed from saved')
    } catch { }
  }

  const filteredVoices = viewSavedOnly ? voices.filter(v => savedIds.has(v.id)) : voices

  return (
    <div className="w-full space-y-10 pb-12">
      {/* Hero header */}
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 48, paddingBottom: 40, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'var(--blue-soft)', color: 'var(--blue)', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <Globe size={12} /> Public Voice Library
          </div>
          <div className="flex items-center justify-center gap-3">
            <Globe className="w-6 h-6 text-gray-800" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-400 animate-text-pan" style={{ fontFamily: 'Playfair Display', serif }}>
              Vocaria Hub
            </h1>
          </div>
          <p style={{ fontSize: 15, color: 'var(--fg-4)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Browse voices created and shared by the Vocaria community. Preview, like, and clone any voice for your projects.
          </p>
          {stats && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-2)' }}>
              {[
                { label: 'Public Voices', value: stats.public_voices },
                { label: 'Active Users', value: stats.active_users },
                { label: 'Total Plays', value: stats.total_plays },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.03em' }}>
                    <CountUp to={s.value || 0} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-4)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* Filters & Search - Now at the top */}
      <Reveal>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-5)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search voices…" className="input" style={{ paddingLeft: 34 }} />
          </div>
          <select value={lang} onChange={e => setLang(e.target.value)} className="input select" style={{ width: 160 }}>
            {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {user && (
            <button
              onClick={() => setViewSavedOnly(!viewSavedOnly)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8, background: viewSavedOnly ? 'var(--blue)' : 'var(--bg-2)', color: viewSavedOnly ? '#fff' : 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
            >
              <Bookmark size={16} fill={viewSavedOnly ? '#fff' : 'none'} />
              {viewSavedOnly ? 'Showing Saved' : 'View Saved'}
            </button>
          )}
        </div>
      </Reveal>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
          ))}
        </div>
      ) : filteredVoices.length === 0 ? (
        <EmptyState icon={Globe} title={viewSavedOnly ? "No saved voices" : "No voices found"} description={viewSavedOnly ? "You haven't saved any voices yet." : "Try adjusting your filters or search query"} />
      ) : (
        <>
          <StaggerGroup className="flex flex-col" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
              {filteredVoices.map(v => (
                <StaggerItem key={v.id}>
                  <VoiceHubRow
                    voice={v}
                    onClone={() => cloneVoice(v.id)}
                    isLiked={likedIds.has(v.id)}
                    isSaved={savedIds.has(v.id)}
                    onLike={() => handleLike(v.id)}
                    onSave={() => handleSave(v.id)}
                    onPlay={() => handlePlay(v.id)}
                  />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerGroup>
          {voices.length < total && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button onClick={() => loadVoices(page + 1)} disabled={loadingMore} className="btn btn-secondary">
                {loadingMore ? <><Spinner size={14} /> Loading…</> : 'Load more voices'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

