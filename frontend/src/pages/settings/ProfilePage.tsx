import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  User, Mic2, Heart, Play, Users, UserPlus, Settings, 
  MapPin, Link as LinkIcon, Calendar, CheckCircle2, 
  Globe2, Lock, Shield, Wand2, Activity, Bookmark, Bot, Pencil, Trash2
} from 'lucide-react'
import { usersApi, voicesApi, generationApi, getErrorMessage } from '@/api/client'
import { Reveal, PlanBadge, Spinner, WaveBars } from '@/components/ui/shared'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow, subDays } from 'date-fns'
import { VoiceCard } from '@/pages/voices/VoiceLibrary'
import { useNavigate } from 'react-router-dom'

// ─── UTILITIES ───────────────────────────────────────────────────────────────

/**
 * Compresses an image client-side to prevent massive 5MB base64 strings
 * from crashing the browser memory or hitting API payload limits.
 */
const compressImage = async (file: File, maxSizeMB = 0.5, maxWidthOrHeight = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidthOrHeight) {
            height *= maxWidthOrHeight / width
            width = maxWidthOrHeight
          }
        } else {
          if (height > maxWidthOrHeight) {
            width *= maxWidthOrHeight / height
            height = maxWidthOrHeight
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8) // 80% quality JPEG
        resolve(compressedDataUrl)
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

// ─── TABS CONTENT COMPONENTS ─────────────────────────────────────────────────

function ProfilesTab({ user }: { user: any }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    voicesApi.list()
      .then(d => setItems(d.voices || []))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={User} title="No Voice Profiles" desc="You haven't created any voice profiles yet." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <VoiceCard 
          key={item.id} 
          voice={item} 
          onDelete={() => {}} 
          onGenerate={() => navigate('/generate?voice=' + item.id)} 
          onClone={() => navigate('/clone?voice=' + item.id)} 
        />
      ))}
    </div>
  )
}

function ClonedTab({ user }: { user: any }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    voicesApi.list()
      .then(d => {
         const all = d.voices || [];
         setItems(all.filter((v: any) => 
            v.training_status !== 'empty' && 
            v.is_synthetic === false
         ));
      })
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={Mic2} title="No Cloned Voices" desc="You haven't successfully cloned any voices yet. Only playable cloned voices appear here." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <VoiceCard 
          key={item.id} 
          voice={item} 
          onDelete={() => {}} 
          onGenerate={() => navigate('/generate?voice=' + item.id)} 
          onClone={() => navigate('/clone?voice=' + item.id)} 
        />
      ))}
    </div>
  )
}

function GeneratedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generationApi.list()
      .then(d => setItems(d.jobs || []))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={Wand2} title="No Audio Generated" desc="You haven't generated any audio tracks yet. Head over to the generator to get started!" />
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Audio Snippet</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Format / Lang</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <button className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow hover:scale-105 transition-transform">
                    <Play size={12} fill="currentColor" className="ml-0.5" />
                  </button>
                  <WaveBars color="var(--blue)" bars={8} height={16} active={false} />
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{item.emotion || 'Standard'}</div>
                <div className="text-xs font-medium text-gray-500">
                  {item.duration_seconds?.toFixed(1)}s • {item.character_count} chars
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-600 uppercase">{item.output_format}</div>
                <div className="text-xs font-semibold text-gray-400 mt-0.5 uppercase">{item.language}</div>
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyTabState({ icon: Icon, title, desc }: any) {
  return (
    <div className="border border-dashed border-gray-300 rounded-3xl bg-gray-50/50 p-12 text-center flex flex-col items-center justify-center">
      <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <div className="text-lg font-bold text-gray-900 mb-1">{title}</div>
      <div className="text-sm font-medium text-gray-500 max-w-sm">{desc}</div>
    </div>
  )
}

// ─── MAIN PROFILE PAGE ───────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshUser, updateUser } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('profiles')
  
  // Real data state
  const [recentGenerations, setRecentGenerations] = useState<any[]>([])
  const [totalGens, setTotalGens] = useState(0)

  useEffect(() => {
    generationApi.list({ page_size: 100 })
      .then(d => {
        setRecentGenerations(d.jobs || [])
        setTotalGens(d.total || 0)
      })
      .catch(console.error)
  }, [])

  // Calculate top styles
  const topStyles = useMemo(() => {
    const styles = recentGenerations.map(j => j.emotion).filter(Boolean)
    if (styles.length === 0) return ['Standard']
    const counts = styles.reduce((acc, val) => ({ ...acc, [val]: (acc[val] || 0) + 1 }), {} as Record<string, number>)
    return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(e => e[0])
  }, [recentGenerations])

  // Calculate 7-day activity
  const weeklyActivity = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    recentGenerations.forEach(j => {
      const d = new Date(j.created_at)
      const diffTime = today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 7) {
        counts[6 - diffDays]++
      }
    })
    
    const max = Math.max(...counts, 1)
    return counts.map(c => Math.round((c / max) * 100))
  }, [recentGenerations])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    
    setUploading(true)
    try {
      // Compress the image to prevent crashes from massive payloads
      const compressedDataUrl = await compressImage(file, 0.5, 400)
      
      // Optimistically update global state so header icons update instantly
      updateUser({ avatar_url: compressedDataUrl })
      
      await usersApi.updateProfile({ avatar_url: compressedDataUrl })
      await refreshUser()
      toast.success('Avatar updated successfully')
    } catch (e) { 
      toast.error(getErrorMessage(e)) 
      refreshUser() // Revert state if failed
    } finally { 
      setUploading(false) 
    }
  }

  const handleAvatarDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user?.avatar_url) return
    
    setUploading(true)
    try {
      updateUser({ avatar_url: '' }) // Optimistic update
      await usersApi.updateProfile({ avatar_url: '' })
      await refreshUser()
      toast.success('Avatar removed')
    } catch (e) {
      toast.error(getErrorMessage(e))
      refreshUser()
    } finally {
      setUploading(false)
    }
  }

  if (!user) return <div className="p-12 text-center text-gray-500 font-medium">Not logged in</div>

  const TABS = [
    { id: 'profiles', label: 'Voice Profiles', icon: User },
    { id: 'cloned', label: 'Cloned Voices', icon: Mic2 },
    { id: 'generated', label: 'Generated Audio', icon: Wand2 },
    { id: 'detected', label: 'Detections', icon: Shield },
    { id: 'live', label: 'Live Streams', icon: Activity },
    { id: 'hub', label: 'Hub Saved', icon: Bookmark },
    { id: 'agents', label: 'Agents', icon: Bot },
  ]

  return (
    <div className="w-full pb-24">
      
      {/* ─── PROFILE HEADER ─── */}
      <Reveal>
        <div className="bg-white border border-gray-200 rounded-[2rem] shadow-sm p-8 md:p-10 mb-10 relative overflow-hidden">
          {/* Subtle background decoration to fill empty space intentionally */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-gray-100/80 via-gray-50/50 to-transparent rounded-bl-full opacity-50 pointer-events-none transform translate-x-1/4 -translate-y-1/4" />
          <div className="absolute bottom-0 right-[30%] w-96 h-96 bg-gradient-to-tr from-gray-50 to-transparent rounded-full opacity-50 pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Avatar Section */}
            <div className="flex-shrink-0 relative group">
              <label className="block cursor-pointer relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden group-hover:ring-4 group-hover:ring-black/5 transition-all">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-black to-gray-800 flex items-center justify-center text-white text-5xl font-bold">
                    {user.display_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  {uploading ? <Spinner size={24} color="white" /> : <div className="text-white text-xs font-bold uppercase tracking-wider">Change</div>}
                </div>
                {user.avatar_url && (
                  <button 
                    onClick={handleAvatarDelete}
                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                    title="Remove Avatar"
                    disabled={uploading}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </label>
            </div>

            {/* Profile Info, Metrics, and Extra Data */}
            <div className="flex-1 pt-2 flex flex-col lg:flex-row gap-12 lg:gap-16 justify-between w-full">
              {/* 1. Left Side: Bio & Info */}
              <div className="max-w-2xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black flex items-center flex-wrap gap-3 mb-1">
                      {user.display_name}
                      <PlanBadge tier={user.plan_tier} />
                      <Link to="/settings" className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shadow-sm ml-1" title="Edit Profile">
                        <Pencil size={16} />
                      </Link>
                    </h1>
                    <div className="text-gray-500 font-semibold">@{user.username}</div>
                  </div>
                </div>

                {user.bio ? (
                  <p className="text-gray-700 font-medium text-sm md:text-base leading-relaxed max-w-2xl mb-6">{user.bio}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm mb-6">No bio provided yet.</p>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-gray-500 mb-8 lg:mb-0">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm">
                    <Globe2 size={12} /> Public Profile
                  </span>
                  {user.location && <span className="flex items-center gap-1.5"><MapPin size={16} /> {user.location}</span>}
                  {user.website && <span className="flex items-center gap-1.5"><LinkIcon size={16} /> <a href={user.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{user.website.replace(/^https?:\/\//, '')}</a></span>}
                  <span className="flex items-center gap-1.5"><Calendar size={16} /> Joined {format(new Date((user as any).created_at || Date.now()), 'MMMM yyyy')}</span>
                </div>
              </div>

              {/* Right Side: Metrics & Actions */}
              <div className="flex flex-col gap-6 lg:border-l lg:border-gray-100 lg:pl-10 shrink-0 justify-center min-w-[200px] lg:min-w-[340px]">

                <div className="grid grid-cols-2 gap-x-12 gap-y-8 border-t lg:border-t-0 border-gray-100 pt-6 lg:pt-0">
                  {[
                    { label: 'Followers', value: user.followers_count || 0, icon: Users },
                    { label: 'Following', value: user.following_count || 0, icon: UserPlus },
                    { label: 'Voice Models', value: (user.voices_count || 0) + 1, icon: Mic2 }, // +1 for the default system profile
                    { label: 'Total Plays', value: user.plays_count || 0, icon: Play },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-black">{s.value.toLocaleString()}</span>
                      </div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Far Right: Extra Data to fill space */}
              <div className="flex-1 lg:border-l lg:border-gray-100 lg:pl-10 flex flex-col justify-center gap-8 min-w-[200px]">
                 {/* Top Styles */}
                 <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top Styles</div>
                    <div className="flex flex-wrap gap-2">
                       {topStyles.map(style => (
                         <span key={style} className="px-3 py-1 bg-gray-50 text-gray-800 border border-gray-200 rounded-full text-xs font-bold shadow-sm capitalize">
                           {style}
                         </span>
                       ))}
                    </div>
                 </div>
                 
                 {/* Weekly Activity mini-chart */}
                 <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex justify-between">
                      <span>Weekly Activity</span>
                      <span className="text-black">{totalGens} Generations</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-12 w-full">
                       {/* 7 CSS bars representing days of the week */}
                       {weeklyActivity.map((h, i) => (
                         <div key={i} className="flex-1 bg-gray-100 rounded-t-sm hover:bg-black transition-colors cursor-pointer" style={{ height: `${h}%` }}></div>
                       ))}
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-gray-300 uppercase mt-1">
                      <span>{format(subDays(new Date(), 6), 'E')}</span>
                      <span>Today</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ─── TAB NAVIGATION ─── */}
      <Reveal delay={0.04}>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 hide-scrollbar border-b border-gray-200">
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  active ? 'text-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <t.icon size={16} className={active ? 'text-black' : 'text-gray-400'} />
                {t.label}
                {active && (
                  <motion.div 
                    layoutId="profileTabIndicator" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" 
                    initial={false}
                  />
                )}
              </button>
            )
          })}
        </div>
      </Reveal>

      {/* ─── TAB CONTENT ─── */}
      <Reveal delay={0.06}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profiles' && <ProfilesTab user={user} />}
            {activeTab === 'cloned' && <ClonedTab user={user} />}
            {activeTab === 'generated' && <GeneratedTab />}
            {activeTab === 'detected' && <EmptyTabState icon={Shield} title="No detections yet" desc="Audio files you scan for deepfakes will appear in this log." />}
            {activeTab === 'live' && <EmptyTabState icon={Activity} title="No live sessions" desc="Your real-time voice conversion history will be recorded here." />}
            {activeTab === 'hub' && <EmptyTabState icon={Bookmark} title="No saved voices" desc="Voices you bookmark from the community Hub will appear here." />}
            {activeTab === 'agents' && <EmptyTabState icon={Bot} title="No agents yet" desc="Voice agents you build will be displayed here." />}
          </motion.div>
        </AnimatePresence>
      </Reveal>

    </div>
  )
}
