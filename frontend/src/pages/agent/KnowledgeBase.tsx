import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FileText, Globe, Type, X, Trash2, ChevronDown,
  Upload, Check, AlertTriangle, BookOpen, Search, MoreVertical,
  Calendar, Hash, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface KnowledgeBaseItem {
  id: string
  user_id: string
  name: string
  type: 'text' | 'file' | 'website'
  content: string
  file_name: string | null
  url: string | null
  status: 'ready' | 'processing' | 'error'
  char_count: number
  created_at: string
}

type CreateMode = 'text' | 'file' | 'website' | null

const TYPE_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  text: { icon: Type, label: 'Text', color: 'text-blue-600', bg: 'bg-blue-50' },
  file: { icon: FileText, label: 'File', color: 'text-purple-600', bg: 'bg-purple-50' },
  website: { icon: Globe, label: 'Website', color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  processing: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  error: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export default function KnowledgeBase() {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [search, setSearch] = useState('')

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Failed to fetch knowledge bases:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge base? This action cannot be undone.')) return
    try {
      const { error } = await supabase.from('knowledge_bases').delete().eq('id', id)
      if (error) throw error
      toast.success('Knowledge base deleted')
      fetchItems()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Knowledge Base</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">BETA</span>
        </div>
      </div>

      {/* Create Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {([
          { mode: 'text' as const, icon: Plus, title: 'Create From Text', desc: 'Paste or write text content directly' },
          { mode: 'file' as const, icon: FileText, title: 'Create From File', desc: 'Upload PDF, TXT, DOCX, or MD files' },
          { mode: 'website' as const, icon: Globe, title: 'Create From Website', desc: 'Extract content from a URL' },
        ]).map((card, i) => {
          const Icon = card.icon
          return (
            <motion.button
              key={card.mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setCreateMode(card.mode)}
              className="flex items-center gap-4 px-5 py-5 rounded-xl border border-gray-200 bg-white text-left hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shrink-0">
                <Icon size={20} className="text-gray-400 group-hover:text-indigo-500 transition-colors" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-gray-900">{card.title}</div>
                <div className="text-[11.5px] text-gray-500 mt-0.5">{card.desc}</div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge bases..."
            className="w-full sm:w-[320px] h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center">
            <div className="inline-flex items-center gap-2 text-[13px] text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Loading...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 -m-5 rounded-full border border-dashed border-gray-200 opacity-60" />
              <div className="absolute inset-0 -m-10 rounded-full border border-dashed border-gray-100 opacity-40" />
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <BookOpen size={26} className="text-gray-300" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">No Knowledge Bases Found</h3>
            <p className="text-[13px] text-gray-500 max-w-[360px] mx-auto">
              There are currently no knowledge bases. Create one above to give your agents context and domain knowledge.
            </p>
          </div>
        ) : (
          filtered.map((item, i) => {
            const meta = TYPE_META[item.type] || TYPE_META.text
            const Icon = meta.icon
            const status = STATUS_STYLES[item.status] || STATUS_STYLES.ready

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-gray-900 truncate">{item.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-gray-400 capitalize">{meta.label}</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="text-[11px] text-gray-400">{item.char_count?.toLocaleString() || 0} chars</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${status.bg} ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {item.status}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {createMode && (
          <CreateKBModal
            mode={createMode}
            onClose={() => setCreateMode(null)}
            onCreated={() => { setCreateMode(null); fetchItems() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Create KB Modal ──────────────────────────────────────────────────── */

function CreateKBModal({ mode, onClose, onCreated }: { mode: 'text' | 'file' | 'website'; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const titles: Record<string, string> = {
    text: 'Create From Text',
    file: 'Create From File',
    website: 'Create From Website',
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''))

    // Read text files
    if (f.type === 'text/plain' || f.name.endsWith('.md') || f.name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (ev) => setContent(ev.target?.result as string || '')
      reader.readAsText(f)
    } else {
      setContent(`[Binary file: ${f.name}, ${(f.size / 1024).toFixed(1)} KB]`)
    }
  }

  const handleScrapeUrl = async () => {
    if (!url.trim()) { toast.error('Please enter a URL'); return }
    setScraping(true)
    try {
      // Attempt to fetch the URL content via a proxy or directly
      const response = await fetch(url.trim())
      const html = await response.text()
      // Simple HTML-to-text extraction
      const doc = new DOMParser().parseFromString(html, 'text/html')
      // Remove scripts and styles
      doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove())
      const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || ''
      if (text.length < 10) throw new Error('No content extracted')
      setContent(text.slice(0, 50000)) // Cap at 50k chars
      if (!name) {
        const title = doc.querySelector('title')?.textContent?.trim()
        setName(title || new URL(url).hostname)
      }
      toast.success(`Extracted ${text.length.toLocaleString()} characters`)
    } catch (err: any) {
      // Fallback: just store the URL reference
      setContent(`[Website content from: ${url}]`)
      if (!name) setName(new URL(url).hostname)
      toast('Could not extract content. URL saved as reference.', { icon: '⚠️' })
    } finally {
      setScraping(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Please enter a name'); return }
    if (!content.trim() && mode !== 'website') { toast.error('Please add some content'); return }
    if (mode === 'website' && !url.trim() && !content.trim()) { toast.error('Please enter a URL'); return }

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Not authenticated')

      const { error } = await supabase.from('knowledge_bases').insert({
        user_id: userData.user.id,
        name: name.trim(),
        type: mode,
        content: content.trim() || `[URL: ${url}]`,
        file_name: file?.name || null,
        url: mode === 'website' ? url.trim() : null,
        status: 'ready',
        char_count: content.length,
      })

      if (error) throw error
      toast.success('Knowledge base created!')
      onCreated()
    } catch (err: any) {
      console.error('Failed to create KB:', err)
      toast.error(err.message || 'Failed to create knowledge base')
    } finally {
      setSaving(false)
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
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[90] w-auto sm:w-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[17px] font-bold text-gray-900">{titles[mode]}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Product FAQ, Company Info"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Mode-specific input */}
          {mode === 'text' && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={12}
                placeholder="Paste or type your knowledge base content here..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none leading-relaxed transition-all"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[11px] text-gray-400">{content.length.toLocaleString()} characters</span>
              </div>
            </div>
          )}

          {mode === 'file' && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Upload File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
              >
                <Upload size={24} className="text-gray-300 group-hover:text-indigo-400 mb-3 transition-colors" />
                {file ? (
                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-gray-900">{file.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-gray-600">Click to upload</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">TXT, MD, PDF, DOCX supported</div>
                  </div>
                )}
              </button>
              {content && (
                <div className="mt-3">
                  <div className="text-[12px] text-gray-500 mb-1.5">Preview ({content.length.toLocaleString()} chars)</div>
                  <div className="max-h-[120px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 text-[12px] text-gray-600 leading-relaxed">
                    {content.slice(0, 1000)}{content.length > 1000 ? '...' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'website' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Website URL</label>
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com/about"
                    className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                  <button
                    onClick={handleScrapeUrl}
                    disabled={scraping || !url.trim()}
                    className="h-11 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
                  >
                    {scraping ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <Globe size={14} />
                    )}
                    {scraping ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </div>
              {content && (
                <div>
                  <div className="text-[12px] text-gray-500 mb-1.5">Extracted Content ({content.length.toLocaleString()} chars)</div>
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 text-[12px] text-gray-600 leading-relaxed">
                    {content.slice(0, 2000)}{content.length > 2000 ? '...' : ''}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Check size={14} />
                Create Knowledge Base
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  )
}
