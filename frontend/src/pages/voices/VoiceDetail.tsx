import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Wand2, Zap, Trash2, Globe, Lock, Building2, Heart, MessageSquare, Share2, ChevronLeft, Play, ExternalLink, Download, Pencil, Activity, Mic, ShieldAlert } from 'lucide-react'
import { voicesApi, cloningApi, getErrorMessage } from '@/api/client'
import { Reveal, WaveBars, Spinner } from '@/components/ui/shared'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const VIS_ICON: Record<string, any> = { private: Lock, organization: Building2, public: Globe }

export default function VoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [voice, setVoice] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [cloneJobs, setCloneJobs] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [playingPreview, setPlayingPreview] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: '', description: '', visibility: 'private', avatar_url: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [activeTab, setActiveTab] = useState('All')

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedPublicModels, setSelectedPublicModels] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      voicesApi.get(id),
      voicesApi.getComments(id),
      cloningApi.listJobs({ voice_profile_id: id }),
      voicesApi.getModels(id).catch(() => ({ models: [] }))
    ])
      .then(([v, c, j, m]) => {
        setVoice(v)
        setEditData({ name: v.name || '', description: v.description || '', visibility: v.visibility || 'private', avatar_url: v.avatar_url || '' })
        setComments(c || [])
        setCloneJobs(j.jobs || [])
        setModels(m.models || [])
        setSelectedPublicModels((m.models || []).filter((mod: any) => mod.is_public).map((mod: any) => mod.id))
      })
      .catch(() => navigate('/voices'))
      .finally(() => setLoading(false))
  }, [id])

  const handleLike = async () => {
    if (!id) return
    try {
      const r = await voicesApi.toggleLike(id)
      setLiked(r.liked)
      setVoice((v: any) => v ? { ...v, likes_count: r.likes_count } : v)
    } catch { toast.error('Failed') }
  }

  const handleComment = async () => {
    if (!newComment.trim() || !id) return
    setSubmitting(true)
    try {
      const c = await voicesApi.addComment(id, newComment.trim())
      setComments(prev => [{ ...c, user: { username: user?.username, display_name: user?.display_name } }, ...prev])
      setNewComment('')
      toast.success('Comment posted')
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
  }

  const handleSaveEdit = async () => {
    if (!id) return
    setSavingEdit(true)
    try {
      const v = await voicesApi.update(id, editData)

      // Update models public status
      for (const model of models) {
        const isPublic = editData.visibility === 'public' && selectedPublicModels.includes(model.id)
        if (model.is_public !== isPublic) {
          await voicesApi.updateModel(id, model.id, { is_public: isPublic })
          model.is_public = isPublic
        }
      }

      setVoice(v)
      setIsEditing(false)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={24} /></div>
  if (!voice) return null

  const isOwner = user?.id === voice.owner_id

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      if (isEditing) {
        setEditData(p => ({ ...p, avatar_url: base64 }))
      } else if (isOwner) {
        toast.promise(voicesApi.update(id!, { avatar_url: base64 }), {
          loading: 'Uploading avatar...',
          success: (v) => { setVoice(v); return 'Avatar updated!' },
          error: 'Failed to update avatar'
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const displayAvatar = isEditing && editData.avatar_url ? editData.avatar_url : voice.avatar_url
  const VisIcon = VIS_ICON[voice.visibility] || Lock
  const hue = voice.id ? parseInt(voice.id.replace(/-/g, '').slice(0, 6), 16) % 360 : 220
  const qColor = voice.quality_score >= 0.8 ? 'var(--green)' : voice.quality_score >= 0.6 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="w-full h-full space-y-6">

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
          {/* Hero */}
          <Reveal>
            <div className="card" style={{ padding: 28, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, hsl(${hue},70%,55%), hsl(${hue + 60},65%,60%))` }} />
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/voices')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--fg-3)', alignSelf: 'flex-start', marginTop: 16, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--fg)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--fg-3)' }} title="Back to My Voices">
                  <ChevronLeft size={16} />
                </button>
                {isOwner ? (
                  <label style={{ position: 'relative', cursor: 'pointer', display: 'block', borderRadius: '50%', flexShrink: 0 }} title="Click to upload avatar">
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    {displayAvatar
                      ? <img src={displayAvatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px var(--border)', border: '2px solid var(--bg)', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
                      : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 24, boxShadow: '0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px var(--border)', border: '2px solid var(--bg)', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>{editData.name ? editData.name.slice(0, 1).toUpperCase() : voice.name?.slice(0, 1).toUpperCase()}</div>
                    }
                  </label>
                ) : (
                  displayAvatar
                    ? <img src={displayAvatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px var(--border)', border: '2px solid var(--bg)' }} />
                    : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 24, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px var(--border)', border: '2px solid var(--bg)' }}>{voice.name?.slice(0, 1).toUpperCase()}</div>
                )}
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    {isEditing ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className="input" placeholder="Profile Name" style={{ fontWeight: 700, fontSize: 16, padding: '10px 14px' }} />
                        <textarea value={editData.description} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} className="input textarea" placeholder="Description" rows={3} style={{ padding: '10px 14px', resize: 'vertical' }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={editData.visibility === 'public'} onChange={e => {
                              if (e.target.checked) {
                                setShowPublishModal(true)
                              } else {
                                setEditData(p => ({ ...p, visibility: 'private' }))
                              }
                            }} style={{ width: 16, height: 16, accentColor: 'var(--blue)', cursor: 'pointer' }} />
                            Publish to Public Hub
                          </label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => { setIsEditing(false); setEditData({ name: voice.name, description: voice.description, visibility: voice.visibility, avatar_url: voice.avatar_url || '' }) }} className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSaveEdit} disabled={savingEdit} className="btn btn-primary btn-sm" style={{ padding: '6px 16px' }}>{savingEdit ? <Spinner size={12} /> : 'Save Changes'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.025em', marginBottom: 8 }}>{voice.name}</h1>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                            {[voice.language?.toUpperCase(), voice.gender, voice.speaking_style].filter(Boolean).map((t: string) => (
                              <span key={t} className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{t}</span>
                            ))}
                            <span className="badge badge-gray" style={{ gap: 4 }}><VisIcon size={10} />{voice.visibility}</span>
                            {voice.fine_tuned && <span className="badge badge-blue">Fine-tuned</span>}
                            {voice.is_hub_featured && <span className="badge badge-amber">⭐ Featured</span>}
                          </div>
                        </div>

                        {voice.description && (
                          <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, borderLeft: '3px solid var(--blue)', color: 'var(--fg-2)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.5, margin: '0 8px', alignSelf: 'flex-start' }}>
                            "{voice.description}"
                          </div>
                        )}

                        {isOwner && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                            <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} title="Edit Profile"><Pencil size={14} /></button>
                            <button onClick={async () => { if (id && confirm('Archive this voice?')) { await voicesApi.delete(id); toast.success('Archived'); navigate('/voices') } }} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '6px' }} title="Delete Profile"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link to={`/generate?voice=${id}`} className="btn btn-primary" style={{ gap: 7 }}><Wand2 size={14} />Generate</Link>
                      <button onClick={handleLike} className={`btn ${liked ? 'btn-outline' : 'btn-secondary'}`} style={{ gap: 7, color: liked ? '#db2777' : undefined, borderColor: liked ? '#db2777' : undefined }}>
                        <Heart size={14} fill={liked ? '#db2777' : 'none'} />{voice.likes_count || 0}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied') }} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                        <Share2 size={13} />Share
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Tags */}
          {[...(voice.emotion_tags || []), ...(voice.use_case_tags || []), ...(voice.custom_tags || [])].length > 0 && (
            <Reveal delay={0.05}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[...(voice.emotion_tags || []), ...(voice.use_case_tags || []), ...(voice.custom_tags || [])].map((t: string) => (
                    <span key={t} style={{ padding: '5px 12px', borderRadius: 99, background: 'var(--bg-3)', border: '1px solid var(--border-2)', fontSize: 12.5, color: 'var(--fg-3)', fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* Audio History Tabs */}
          <Reveal delay={0.07} className="flex flex-col flex-1">
            <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wand2 size={15} style={{ color: 'var(--fg-4)' }} />Audio History
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/generate?voice=${id}`} className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Wand2 size={12} />Generate</Link>
                    <Link to={`/detect?voice=${id}`} className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Activity size={12} />Detect</Link>
                    <Link to={`/studio`} className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Mic size={12} />Studio</Link>
                    <Link to={`/clone?voice=${id}`} className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Zap size={12} />New Clone</Link>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, background: 'var(--bg-2)', padding: 6, borderRadius: 12, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {['All', 'Generated', 'Cloned', 'Detected'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{ flex: '1 0 auto', padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: activeTab === t ? 'var(--blue)' : 'var(--fg-4)', background: activeTab === t ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const combined = [
                    ...cloneJobs.map(j => ({ ...j, _category: 'Cloned' })), 
                    ...models.filter(m => m.source_type !== 'cloned' && m.source_type !== 'clone').map(m => {
                      const st = m.source_type || 'Generated';
                      return { ...m, _category: (st.charAt(0).toUpperCase() + st.slice(1)).replace('_', ' ') };
                    })
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .filter(item => activeTab === 'All' || item._category.toLowerCase() === activeTab.toLowerCase());

                  if (combined.length === 0) return <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--fg-5)', fontSize: 13.5 }}>No audio found in this category.</div>;

                  return combined.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span className={`badge ${item._category === 'Cloned' ? 'badge-blue' : item._category === 'Detected' ? 'badge-amber' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>{item._category}</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', textTransform: 'capitalize' }}>
                              {item._category === 'Cloned' ? `Clone Job (${(item.mode || '').replace('_', ' ')})` : (item._category === 'Generated' ? `Generated Audio (${(item.model_version || 'xtts_v2').replace('_', ' ')})` : (item.name || 'Audio Clip'))}
                            </div>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>
                            {new Date(item.created_at).toLocaleDateString()}
                            {item.status && ` · Status: ${item.status}`}
                          </div>
                          {item._category === 'Generated' && item.prompt_text && (
                            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4, fontStyle: 'italic', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              "{item.prompt_text}"
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.quality_score && (
                            <span className="badge badge-green">Quality: {(item.quality_score * 100).toFixed(0)}%</span>
                          )}
                          <Link to={`/studio?voice_id=${id}`} className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: 12, height: 'auto', minHeight: 'auto', borderRadius: 6 }}>Use</Link>
                        </div>
                      </div>

                      {(item.preview_url || item.audio_url) ? (
                        <div style={{ width: '100%' }}>
                          <audio controls src={item.preview_url || item.audio_url} style={{ width: '100%', height: 36 }} />
                        </div>
                      ) : (
                        item.status === 'processing' || item.status === 'queued' ? (
                          <div className="progress" style={{ marginTop: 4 }}>
                            <div className="progress-fill" style={{ width: `${(item.progress || 0) * 100}%` }} />
                          </div>
                        ) : null
                      )}

                      {item.status === 'failed' && item.error_message && (
                        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{item.error_message}</div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </Reveal>

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Reveal delay={0.06}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Stats</div>
              {[
                ['Plays', (voice.plays_count || 0).toLocaleString()],
                ['Likes', (voice.likes_count || 0).toLocaleString()],
                ['Downloads', (voice.downloads_count || 0).toLocaleString()],
                ['Quality', voice.quality_score != null ? `${(voice.quality_score * 100).toFixed(0)}%` : '—'],
                ['Similarity', voice.similarity_score != null ? `${(voice.similarity_score * 100).toFixed(0)}%` : '—'],
                ['Model', voice.base_model || 'xtts_v2'],
                ['Training', voice.training_status || '—'],
                ['License', voice.license_type || 'personal'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-2)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>{k}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)', textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.09}>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to={`/generate?voice=${id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}><Wand2 size={14} />Generate Speech</Link>
              <Link to={`/clone?voice=${id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}><Zap size={14} />Clone / Improve</Link>
              <Link to={`/detection?voice=${id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}><ShieldAlert size={14} />Detect Deepfake</Link>
              <Link to={`/quality?voice=${id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}><Activity size={14} />Quality Test</Link>
            </div>
          </Reveal>

          <Reveal delay={0.11}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Timestamps</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-4)', lineHeight: 2 }}>
                <div>Created {voice.created_at ? formatDistanceToNow(new Date(voice.created_at), { addSuffix: true }) : '—'}</div>
                <div>Updated {voice.updated_at ? formatDistanceToNow(new Date(voice.updated_at), { addSuffix: true }) : '—'}</div>
              </div>
              {voice.consent_verified && (
                <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(22,163,74,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>✓ Consent verified</div>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {showPublishModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 16, width: '100%', maxWidth: 600, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={20} /> Publish Voice to Hub</h2>
            <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginBottom: 24 }}>Select which voice models to showcase on your public profile. Only these models will be playable by other users.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 450, overflowY: 'auto', marginBottom: 24 }}>
              {models.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>No models found. Generate or clone a voice first.</div>
              ) : models.map((m: any) => {
                const isCloned = m.source_type === 'clone' || m.source_type === 'cloned'
                return (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--bg-2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedPublicModels.includes(m.id)} onChange={e => {
                      if (e.target.checked) setSelectedPublicModels(p => [...p, m.id])
                      else setSelectedPublicModels(p => p.filter(id => id !== m.id))
                    }} style={{ marginTop: 2, accentColor: 'var(--blue)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.model_version} {isCloned && <span style={{ padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>CLONED</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>Created: {new Date(m.created_at).toLocaleDateString()}</div>
                      {m.preview_url && <audio controls src={m.preview_url} style={{ width: '100%', height: 28, marginTop: 8 }} />}
                    </div>
                  </label>
                )
              })}
            </div>

            {models.some((m: any) => selectedPublicModels.includes(m.id) && (m.source_type === 'clone' || m.source_type === 'cloned')) && (
              <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', padding: 12, borderRadius: 8, marginBottom: 20, display: 'flex', gap: 10 }}>
                <ShieldAlert size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#ca8a04', lineHeight: 1.5 }}>
                  <strong>Consent Required:</strong> You are publishing a cloned voice. By proceeding, you confirm you have the right to share this voice and agree it will be watermarked and identified as synthetic to prevent misuse.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowPublishModal(false); setEditData(p => ({ ...p, visibility: 'private', avatar_url: p.avatar_url || '' })) }} className="btn btn-ghost">Cancel</button>
              <button onClick={() => {
                if (selectedPublicModels.length === 0) return toast.error('Select at least one model.')
                setEditData(p => ({ ...p, visibility: 'public' }))
                setShowPublishModal(false)
              }} className="btn btn-primary">Confirm Selection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
