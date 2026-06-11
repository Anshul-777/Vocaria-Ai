import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic2, ArrowRight, User, Globe, Lock, Shield, Info , Zap} from 'lucide-react'
import { voicesApi, getErrorMessage } from '@/api/client'
import { Spinner } from '@/components/ui/shared'
import toast from 'react-hot-toast'
import { Reveal } from '@/hooks/motionVariants'
import clsx from 'clsx'

const GENDERS = ['Male', 'Female', 'Neutral']
const AGES = ['Young', 'Middle-Aged', 'Old']
const ACCENTS = ['American - Neutral', 'American - Southern', 'British - RP', 'British - Cockney', 'Australian', 'Indian', 'Irish', 'Scottish', 'Other']

export default function NewVoiceProfile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gender, setGender] = useState('')
  const [ageStyle, setAgeStyle] = useState('')
  const [accent, setAccent] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Voice Name is required.')
      return
    }

    setLoading(true)
    try {
      const visibility = isPublic ? 'PUBLIC' : 'PRIVATE'
      const v = await voicesApi.create({
        name: name.trim(),
        description: description.trim(),
        gender,
        age_style: ageStyle,
        accent,
        visibility,
        consent_verified: true,
      })
      toast.success('Voice Profile Created!')
      // Redirect back to profiles list
      navigate('/voices')
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Failed to create voice profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3"><Zap className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-fuchsia-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Clone Voice</h1></div>
            <p className="text-gray-500 font-medium mt-1.5 text-sm">
              Define the demographics and characteristics of this voice profile.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <form onSubmit={handleCreate} className="card p-6 sm:p-8 space-y-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
          
          {/* Identity Basics */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-['Syne',sans-serif] text-gray-900 border-b pb-2 border-gray-100">Identity Basics</h2>
            
            <div className="space-y-2">
              <label className="label">Voice Name <span className="text-red-500">*</span></label>
              <input 
                autoFocus
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. My Voice, Marketing Persona, Podcast Host..." 
                className="input" 
                required
              />
              <p className="text-xs text-gray-400 mt-1">This is how the voice will appear in your library and in the Hub.</p>
            </div>

            <div className="space-y-2">
              <label className="label">Description (Optional)</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Describe this voice... e.g. A warm, energetic voice suitable for tutorials." 
                className="input min-h-[80px] resize-y py-3" 
              />
            </div>
          </div>

          {/* Demographics */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-['Syne',sans-serif] text-gray-900 border-b pb-2 border-gray-100 flex items-center gap-2">
              <Mic2 size={18} className="text-gray-400" /> Vocal Demographics
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label">Gender</label>
                <div className="flex gap-2">
                  {GENDERS.map(g => (
                    <button 
                      key={g} 
                      type="button"
                      onClick={() => setGender(g)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
                        gender === g 
                          ? "bg-blue-50 border-blue-600 text-blue-700" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">Age Group</label>
                <div className="flex gap-2">
                  {AGES.map(a => (
                    <button 
                      key={a} 
                      type="button"
                      onClick={() => setAgeStyle(a)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
                        ageStyle === a 
                          ? "bg-blue-50 border-blue-600 text-blue-700" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="label">Accent</label>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map(acc => (
                    <button 
                      key={acc} 
                      type="button"
                      onClick={() => setAccent(acc)}
                      className={clsx(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                        accent === acc 
                          ? "bg-blue-50 border-blue-600 text-blue-700" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      {acc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility & Hub */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-['Syne',sans-serif] text-gray-900 border-b pb-2 border-gray-100 flex items-center gap-2">
              <Globe size={18} className="text-gray-400" /> Community & Hub
            </h2>

            <div 
              onClick={() => setIsPublic(!isPublic)}
              className={clsx(
                "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4",
                isPublic ? "border-blue-500 bg-blue-50/50" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
              )}
            >
              <div className={clsx("w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors", isPublic ? "bg-blue-600" : "bg-white border border-gray-300")}>
                {isPublic && <motion.div initial={{scale:0}} animate={{scale:1}} className="w-2 h-2 bg-white rounded-[2px]" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  Publish to Voice Hub
                  {isPublic ? <Globe size={14} className="text-blue-500" /> : <Lock size={14} className="text-gray-400" />}
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Allow other creators to use this voice profile in the Community Hub. You retain ownership, and personal details remain private.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield size={14} /> By creating this profile, you confirm you have rights to this voice.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate('/voices')} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex items-center justify-center gap-2 min-w-[280px]">
                {loading ? (
                  <><Spinner size={16} color="white" /> Creating Profile...</>
                ) : (
                  <>Create Profile & Proceed to Clone <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>

        </form>
      </Reveal>
    </div>
  )
}
