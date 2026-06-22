import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  User, Mic2, Heart, Play, Users, UserPlus, Settings, 
  MapPin, Link as LinkIcon, Calendar, CheckCircle2, 
  Globe2, Lock, Shield, Wand2, Activity, Bookmark, Bot, Pencil, Trash2
} from 'lucide-react'
import { usersApi, voicesApi, generationApi, detectionApi, cloningApi, getErrorMessage } from '@/api/client'
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
          onPin={() => {}}
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
    cloningApi.listJobs()
      .then(d => {
         setItems(d.jobs || []);
      })
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={Mic2} title="No Cloned Voices" desc="You haven't successfully cloned any voices yet. Only playable cloned voices appear here." />
  }

  const grouped = items.reduce((acc: any, item: any) => {
    const pName = item.voice_profile_name || 'Unknown Profile';
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([profileName, profileItems]: [string, any]) => (
        <div key={profileName} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mic2 size={18} className="text-[var(--blue)]" />
              {profileName}
            </h3>
            <span className="text-xs font-medium bg-gray-200/50 text-gray-600 px-2 py-1 rounded-full">
              {profileItems.length} {profileItems.length === 1 ? 'Job' : 'Jobs'}
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-[300px]">Preview Audio</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status / Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profileItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    {item.preview_url ? (
                      <audio controls src={item.preview_url} style={{ width: '100%', height: 36, outline: 'none' }} />
                    ) : (
                      <div className="text-xs text-gray-400 italic">No audio preview</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 capitalize">{item.mode?.replace('_', ' ') || 'Standard'}</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">
                      Progress: {Math.round(item.progress * 100)}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.quality_score ? (
                      <div className="text-xs font-bold text-gray-500 mt-1">
                        Score: {(item.quality_score * 100).toFixed(0)} / 100
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AssignProfileModal({ job, onClose, onAssigned }: { job: any, onClose: () => void, onAssigned: () => void }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [mode, setMode] = useState<'existing'|'new'>('new')
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [newProfileName, setNewProfileName] = useState('')

  useEffect(() => {
    voicesApi.list({ limit: 100 })
      .then(d => {
        setProfiles(d.items || [])
        if (d.items && d.items.length > 0) {
          setSelectedProfileId(d.items[0].id)
        }
      })
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      let targetProfileId = selectedProfileId
      if (mode === 'new') {
        if (!newProfileName.trim()) {
          toast.error("Profile name is required")
          setSaving(false)
          return
        }
        const created = await voicesApi.create({
          name: newProfileName,
          description: "Created from generation job",
          visibility: "private",
          language: job.language || "en",
          emotion_tags: job.emotion ? [job.emotion] : []
        })
        targetProfileId = created.id
      }
      
      await voicesApi.attachGeneration(targetProfileId, job.id)
      toast.success("Generation successfully assigned to profile!")
      onAssigned()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Save as Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setMode('new')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${mode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>New Profile</button>
                <button onClick={() => setMode('existing')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${mode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Existing Profile</button>
              </div>

              {mode === 'new' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Profile Name</label>
                  <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="e.g. My Custom Bella" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/20 focus:border-[var(--purple)] transition-all" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Profile</label>
                  <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/20 focus:border-[var(--purple)] transition-all">
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              
              <button disabled={saving} onClick={handleSubmit} className="w-full mt-4 bg-[var(--purple)] hover:bg-[var(--purple-hover)] text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                {saving ? <Spinner className="w-4 h-4" /> : < Bookmark size={16} />}
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GeneratedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningJob, setAssigningJob] = useState<any>(null)

  const fetchJobs = () => {
    setLoading(true)
    generationApi.list()
      .then(d => setItems(d.jobs || []))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={Wand2} title="No Audio Generated" desc="You haven't generated any audio tracks yet. Head over to the generator to get started!" />
  }

  const grouped = items.reduce((acc: any, item: any) => {
    const pName = item.voice_profile_name || 'Unsaved / Default Voices';
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {assigningJob && (
        <AssignProfileModal 
          job={assigningJob} 
          onClose={() => setAssigningJob(null)} 
          onAssigned={() => { setAssigningJob(null); fetchJobs() }} 
        />
      )}
      {Object.entries(grouped).map(([profileName, profileItems]: [string, any]) => (
        <div key={profileName} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Wand2 size={18} className="text-[var(--purple)]" />
              {profileName}
            </h3>
            <span className="text-xs font-medium bg-gray-200/50 text-gray-600 px-2 py-1 rounded-full">
              {profileItems.length} {profileItems.length === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-[300px]">Audio Track</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Format / Lang</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profileItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    {item.output_url ? (
                      <audio controls src={item.output_url} style={{ width: '100%', height: 36, outline: 'none' }} />
                    ) : (
                      <div className="text-xs text-gray-400 italic">No audio generated yet</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-gray-900 capitalize">{item.emotion || 'Standard'}</div>
                      {profileName === 'Unsaved / Default Voices' && (
                        <button onClick={() => setAssigningJob(item)} className="text-[10px] bg-[var(--purple)]/10 text-[var(--purple)] hover:bg-[var(--purple)]/20 px-2 py-0.5 rounded font-bold transition-colors uppercase">
                          Save Voice
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">
                      {item.duration_seconds?.toFixed(1)}s • {item.character_count} chars
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-600 uppercase">{item.output_format || 'wav'}</div>
                    <div className="text-xs font-semibold text-gray-400 mt-0.5 uppercase">{item.language || 'en'}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function DetectedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detectionApi.list({ page_size: 50 })
      .then(d => setItems(d.jobs || []))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  
  if (items.length === 0) {
    return <EmptyTabState icon={Shield} title="No Detections Yet" desc="Audio files you scan for deepfakes will appear in this log." />
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Job ID</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">File Details</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Verdict</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-6 py-4">
                <Link to={`/detection/${item.id}`} className="text-sm font-bold text-blue-600 hover:underline font-mono">
                  {item.id.split('-')[0]}...
                </Link>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{item.original_filename || 'Unknown file'}</div>
                <div className="text-xs font-medium text-gray-500">
                  {item.duration_seconds?.toFixed(1)}s
                </div>
              </td>
              <td className="px-6 py-4">
                 <div className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase ${item.is_synthetic ? 'bg-red-50 text-red-600' : item.verdict ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                   {item.verdict?.replace(/_/g, ' ') || item.status}
                 </div>
                 {item.ensemble_confidence !== null && item.ensemble_confidence !== undefined && (
                   <div className="text-[10px] font-bold text-gray-400 mt-1">{(item.ensemble_confidence * 100).toFixed(1)}% CONF</div>
                 )}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profiles'
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    setSearchParams({ tab: id })
  }
  
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
                onClick={() => handleTabChange(t.id)}
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
            {activeTab === 'detected' && <DetectedTab />}
            {activeTab === 'live' && <EmptyTabState icon={Activity} title="No live sessions" desc="Your real-time voice conversion history will be recorded here." />}
            {activeTab === 'hub' && <EmptyTabState icon={Bookmark} title="No saved voices" desc="Voices you bookmark from the community Hub will appear here." />}
            {activeTab === 'agents' && <EmptyTabState icon={Bot} title="No agents yet" desc="Voice agents you build will be displayed here." />}
          </motion.div>
        </AnimatePresence>
      </Reveal>

    </div>
  )
}
