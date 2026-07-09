import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Key, Bell, Lock, ShieldAlert, HardDrive, Cpu, CreditCard, Check, Eye, EyeOff, Plus, Trash2, Copy, AlertTriangle, Download, Database , Settings} from 'lucide-react'
import { usersApi, apiKeysApi, authApi, getErrorMessage } from '@/api/client'
import { Reveal, Spinner } from '@/components/ui/shared'
import { useAuthStore } from '@/store/authStore'
import Billing from '../billing/Billing'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// ─── TABS ────────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ display_name: user?.display_name || '', bio: user?.bio || '', website: user?.website || '', location: user?.location || '', preferred_language: user?.preferred_language || 'en' })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await usersApi.updateProfile(form)
      updateUser(form)
      toast.success('Profile updated successfully')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Account details</h2>
        <p className="text-sm text-gray-500 font-medium">This information will be displayed on your public profile page.</p>
      </div>

      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
            <input value={form.display_name} onChange={set('display_name')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Language</label>
            <select value={form.preferred_language} onChange={set('preferred_language')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all appearance-none">
              {[['en','English'],['es','Spanish'],['fr','French'],['de','German'],['zh','Chinese'],['ja','Japanese']].map(([c,l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
          <textarea value={form.bio} onChange={set('bio') as any} rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none" placeholder="Tell the community about yourself…" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
            <input value={form.website} onChange={set('website')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" placeholder="https://…" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
            <input value={form.location} onChange={set('location')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" placeholder="City, Country" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Email Address</h3>
        <div className="max-w-md">
          <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed" />
          <p className="text-xs font-medium text-gray-400 mt-2">Email cannot be changed directly. Contact support if you need to update it.</p>
        </div>
      </div>

      <div className="pt-4">
        <button onClick={save} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Spinner size={16} color="white" /> : <Check size={16} />} Save changes
        </button>
      </div>
    </div>
  )
}

function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showCurr, setShowCurr] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (form.new_password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    try {
      await authApi.changePassword(form.current_password, form.new_password)
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Password settings</h2>
        <p className="text-sm text-gray-500 font-medium">Update your password to keep your account secure.</p>
      </div>

      <div className="space-y-6 w-full">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Current Password</label>
          <div className="relative">
            <input type={showCurr ? 'text' : 'password'} value={form.current_password} onChange={set('current_password')} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" />
            <button onClick={() => setShowCurr(!showCurr)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
              {showCurr ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={form.new_password} onChange={set('new_password')} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" />
            <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
          <input type="password" value={form.confirm} onChange={set('confirm')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all" />
        </div>
      </div>

      <div className="pt-4">
        <button onClick={save} disabled={saving || !form.current_password || !form.new_password} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Spinner size={16} color="white" /> : <Lock size={16} />} Save password
        </button>
      </div>
    </div>
  )
}

function NotifsTab() {
  const { user, updateUser } = useAuthStore()
  const [emailNotifs, setEmailNotifs] = useState(user?.email_notifications !== false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await usersApi.updateProfile({ email_notifications: emailNotifs })
      updateUser({ email_notifications: emailNotifs })
      toast.success('Preferences saved')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Notification preferences</h2>
        <p className="text-sm text-gray-500 font-medium">Control how Vocaria communicates with you.</p>
      </div>

      <div className="w-full">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-bold text-gray-900">Email Notifications</div>
            <div className="text-sm font-medium text-gray-500 mt-1 leading-relaxed">Receive occasional emails for background job completions (like dataset generation), security alerts, and plan changes.</div>
          </div>
          <button 
            onClick={() => setEmailNotifs(!emailNotifs)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${emailNotifs ? 'bg-black' : 'bg-gray-200'}`}
          >
            <motion.div 
              animate={{ x: emailNotifs ? 24 : 2 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm" 
            />
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button onClick={save} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Spinner size={16} color="white" /> : <Check size={16} />} Save changes
        </button>
      </div>
    </div>
  )
}

function StorageTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Storage utilization</h2>
        <p className="text-sm text-gray-500 font-medium">Monitor your disk usage for voice profiles and generated audio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="text-2xl font-extrabold text-black">1.2 GB</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Total Used</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="text-2xl font-extrabold text-black">800 MB</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Voice Datasets</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="text-2xl font-extrabold text-black">400 MB</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Generated Output</div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mt-6">
        <div className="flex justify-between text-sm font-bold text-gray-900 mb-3">
          <span>Storage Capacity</span>
          <span>1.2 GB / 5.0 GB</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
          <div className="bg-black h-3 rounded-full" style={{ width: '24%' }}></div>
        </div>
        <p className="text-xs font-medium text-gray-500">Upgrade to a Pro plan to unlock 50 GB of scalable cloud storage.</p>
      </div>
    </div>
  )
}

function DataControlTab() {
  const [telemetry, setTelemetry] = useState(true)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Data & Privacy Control</h2>
        <p className="text-sm text-gray-500 font-medium">Manage how your data is stored, processed, and exported.</p>
      </div>

      <div className="w-full space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-bold text-gray-900">Allow Telemetry & Diagnostics</div>
            <div className="text-sm font-medium text-gray-500 mt-1 leading-relaxed">Permit Vocaria to collect anonymous usage data to improve our machine learning models.</div>
          </div>
          <button 
            onClick={() => setTelemetry(!telemetry)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${telemetry ? 'bg-black' : 'bg-gray-200'}`}
          >
            <motion.div animate={{ x: telemetry ? 24 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Download size={20} className="text-black" />
            <div className="text-sm font-bold text-gray-900">Export All Personal Data</div>
          </div>
          <div className="text-sm font-medium text-gray-500 mb-4 leading-relaxed">Request a comprehensive archive containing all your cloned voices, generated audio logs, settings, and profile information in a readable format.</div>
          <button className="bg-gray-100 hover:bg-gray-200 text-black px-5 py-2 rounded-xl text-sm font-bold transition-colors">
            Request Data Export
          </button>
        </div>
      </div>
    </div>
  )
}

function ModelsTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">AI Model configuration</h2>
        <p className="text-sm text-gray-500 font-medium">Configure defaults for generation pipelines and detection strictness.</p>
      </div>

      <div className="space-y-6 w-full">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Default TTS Engine</label>
          <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all appearance-none">
            <option value="xtts">XTTS-v2 (Ultra-realistic, Fast)</option>
            <option value="vits">VITS (High fidelity, Multi-speaker)</option>
            <option value="bark">Bark (Expressive, Background noise)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Deepfake Detection Strictness</label>
          <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all appearance-none">
            <option value="balanced">Balanced (Recommended)</option>
            <option value="strict">Strict (Higher false positive rate)</option>
            <option value="lenient">Lenient (Only flags high confidence)</option>
          </select>
        </div>

        <div className="pt-4">
          <button className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2">
            <Check size={16} /> Save preferences
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteTab() {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = () => {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    setTimeout(() => {
      toast.success('Account successfully queued for deletion')
      window.location.href = '/'
    }, 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 font-medium">Permanently delete your account and all associated data.</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 w-full">
        <div className="flex items-start gap-4">
          <AlertTriangle size={24} className="text-red-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-base font-bold text-red-800 mb-2">Are you absolutely sure?</h3>
            <p className="text-sm text-red-700 font-medium leading-relaxed mb-4">
              This action cannot be undone. This will permanently delete the <strong>{useAuthStore.getState().user?.display_name}</strong> account, remove all custom voice clones, delete your generations, and purge your data from our servers.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-bold text-red-800">Please type <span className="font-mono bg-red-100 px-1.5 rounded text-red-900">DELETE</span> to confirm.</label>
              <input 
                value={confirmText} 
                onChange={e => setConfirmText(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white border border-red-300 rounded-xl text-sm font-mono text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" 
              />
              <button 
                onClick={handleDelete} 
                disabled={deleting || confirmText !== 'DELETE'} 
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 w-full sm:w-auto"
              >
                {deleting ? <Spinner size={16} color="white" /> : <Trash2 size={16} />} 
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN SETTINGS PAGE ──────────────────────────────────────────────────────

const TABS = [
  { id: 'account',   label: 'Account',       icon: User },
  { id: 'billing',   label: 'Billings',      icon: CreditCard },
  { id: 'notifs',    label: 'Notification',  icon: Bell },
  { id: 'password',  label: 'Passwords',     icon: Lock },
  { id: 'storage',   label: 'Storage',       icon: HardDrive },
  { id: 'data',      label: 'Data Control',  icon: Database },
  { id: 'models',    label: 'Models',        icon: Cpu },
  { id: 'delete',    label: 'Delete',        icon: ShieldAlert, danger: true },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')

  return (
    <div className="w-full pb-24">
      {/* Page Header */}
      <Reveal>
        <div className="mb-10">
          <div className="flex items-center gap-3"><Settings className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-slate-500 animate-text-pan" style={{ fontFamily: 'Playfair Display', serif }}>Settings</h1></div>
          <p className="text-gray-500 font-medium text-sm md:text-base max-w-lg">
            Manage your account preferences, subscriptions, data, and security.
          </p>
        </div>
      </Reveal>

      {/* 2-Column Layout */}
      <Reveal delay={0.04}>
        <div className="flex flex-col md:flex-row gap-10">
          
          {/* Left Sidebar (Local Navigation) */}
          <div className="w-full md:w-56 shrink-0">
            <div className="flex flex-col gap-1">
              {TABS.map(item => {
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      active 
                        ? (item.danger ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-black') 
                        : (item.danger ? 'text-red-400 hover:text-red-600 hover:bg-red-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={16} className={active ? (item.danger ? 'text-red-600' : 'text-black') : (item.danger ? 'text-red-400' : 'text-gray-400')} strokeWidth={active ? 2.5 : 2} />
                      {item.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {activeTab === 'account'  && <ProfileTab />}
                {activeTab === 'billing'  && <Billing />}
                {activeTab === 'notifs'   && <NotifsTab />}
                {activeTab === 'password' && <PasswordTab />}
                {activeTab === 'storage'  && <StorageTab />}
                {activeTab === 'data'     && <DataControlTab />}
                {activeTab === 'models'   && <ModelsTab />}
                {activeTab === 'delete'   && <DeleteTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>
      </Reveal>
    </div>
  )
}

