import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { notificationsApi } from '@/api/client'
import { Reveal, EmptyState, Spinner } from '@/components/ui/shared'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'

import { Sparkles, AlertCircle, Info, ShieldAlert } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  clone_complete: 'var(--blue)', clone_failed: 'var(--red)',
  generation_complete: '#7c3aed', detection_alert: 'var(--red)',
  quota_warning: 'var(--amber)', quota_exceeded: 'var(--red)',
  plan_changed: 'var(--blue)', member_joined: 'var(--green)',
  system_alert: 'var(--amber)', new_follower: 'var(--green)',
  voice_liked: '#db2777', comment_received: 'var(--blue)',
}

const TYPE_ICONS: Record<string, any> = {
  system_alert: Info,
  clone_complete: Sparkles,
  generation_complete: Sparkles,
  detection_alert: ShieldAlert,
  clone_failed: AlertCircle,
  quota_warning: AlertCircle,
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const load = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifs(data || [])
      setUnread((data || []).filter(n => !n.is_read).length)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredNotifs = notifs
    .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'unread') return (a.is_read === b.is_read) ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.is_read ? 1 : -1
      return 0
    })

  const markRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id)
    const notif = notifs.find(n => n.id === id)
    setNotifs(prev => prev.filter(n => n.id !== id))
    if (notif && !notif.is_read) {
      setUnread(prev => Math.max(0, prev - 1))
    }
    toast.success('Notification deleted')
  }

  const markAllRead = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return

    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userData.user.id).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
    toast.success('All marked as read')
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-black flex items-center gap-3">
            <Bell size={24} className="text-gray-400" /> Notifications
            {unread > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{unread} new</span>}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium w-full sm:w-64 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-800 cursor-pointer focus:ring-2 focus:ring-black outline-none transition-all"
            >
              <option value="newest">Newest</option>
              <option value="unread">Unread First</option>
              <option value="oldest">Oldest</option>
            </select>
            {unread > 0 && (
              <button onClick={markAllRead} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
                <CheckCheck size={16} /> Mark all read
              </button>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><Spinner size={24} /></div>
          ) : filteredNotifs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Bell size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No notifications found</h3>
              <p className="text-sm font-medium text-gray-500 mt-2 max-w-sm">You're all caught up! Notifications about jobs, plans, and activity will appear here.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifs.map((n, i) => {
                const color = TYPE_COLORS[n.type] || 'var(--fg-4)'
                const Icon = TYPE_ICONS[n.type] || Bell
                return (
                  <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                    onClick={() => !n.is_read && markRead(n.id)}
                    className="group"
                    style={{ display: 'flex', gap: 16, padding: '16px 24px', borderBottom: '1px solid var(--border-2)', cursor: n.is_read ? 'default' : 'pointer', background: n.is_read ? 'transparent' : 'rgba(37,99,235,0.02)', transition: 'background 0.15s, transform 0.2s', alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 700, color: 'var(--fg-1)', lineHeight: 1.4 }}>{n.title}</div>
                        {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--fg-4)', marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 6, fontWeight: 500 }}>
                        {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                      {!n.is_read && (
                        <button onClick={(e) => markRead(n.id, e)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark as read">
                          <Check size={18} />
                        </button>
                      )}
                      <button onClick={(e) => deleteNotif(n.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </Reveal>
    </div>
  )
}
