import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Mic2, Minimize2, Maximize2, RefreshCw, Settings, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { VocariaLogo } from '@/components/ui/VocariaLogo'

interface Message { id: string; role: 'user' | 'assistant'; content: string; ts: number }

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'



// ── Message bubble ──
function Bubble({ msg }: { msg: Message }) {
  if (!msg.content) return null
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}
    >
      {!isUser && (
        <div style={{ marginRight: 8, marginTop: 2 }}>
          <VocariaLogo size={28} />
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '9px 13px' : '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--blue)' : 'var(--bg-2)',
        color: isUser ? 'white' : 'var(--fg)',
        fontSize: 13.5,
        lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </motion.div>
  )
}

// ── Main Chatbot Component ──
export default function Chatbot() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'assistant',
        content: `Hi${user ? ` ${user.display_name?.split(' ')[0]}` : ''}! 👋 I'm Vocaria, your AI assistant.\n\nI can help you with:\n• Voice cloning & generation\n• Deepfake detection\n• API integration\n• Platform features & billing\n\nWhat would you like to know?`,
        ts: Date.now(),
      }])
    }
  }, [open])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: Date.now() }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    setLoading(true)
    setError(null)

    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', ts: Date.now() }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const userMessages = allMessages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-12) // last 12 msgs for context

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(`${BASE_URL}/agent/support-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: userMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.error) {
              setError(json.error)
              setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
              return
            }
            const chunk = json.text
            if (chunk) {
              setLoading(false)
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
              ))
            }
          } catch (e) {
            console.error("Parse error:", e)
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error communicating with server')
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
    setTimeout(() => setOpen(p => { if (p) { setMessages([{ id: '0', role: 'assistant', content: 'Chat cleared! How can I help you?', ts: Date.now() }]); } return p }), 100)
  }

  const chatWidth = expanded ? 560 : 420
  const chatHeight = expanded ? 620 : 500

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
              width: 52, height: 52, borderRadius: 16,
              background: 'transparent',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}
          >
            <VocariaLogo size={52} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
              width: chatWidth, height: chatHeight,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 20, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', flexShrink: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <VocariaLogo size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>Vocaria</div>
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  AI Assistant
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={clearChat} title="Clear chat" style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-5)', display: 'flex' }}><RefreshCw size={13} /></button>
                <button onClick={() => setExpanded(!expanded)} title="Resize" style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-5)', display: 'flex' }}>{expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
                <button onClick={() => setOpen(false)} title="Close" style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-5)', display: 'flex' }}><X size={14} /></button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column' }}>
              {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flexShrink: 0 }}>
                    <VocariaLogo size={28} />
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-4)' }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}
              {error && (
                <div style={{ padding: '9px 13px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 10, fontSize: 12.5, color: 'var(--red)', marginBottom: 8 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about cloning, detection, API…"
                  rows={1}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--bg-2)', fontSize: 13.5, color: 'var(--fg)', outline: 'none',
                    resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                    maxHeight: 100, overflow: 'auto',
                    transition: 'border-color 0.14s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !loading ? 'var(--blue)' : 'var(--bg-3)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.14s', flexShrink: 0 }}>
                  <Send size={14} color={input.trim() && !loading ? 'white' : 'var(--fg-5)'} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 6, textAlign: 'center' }}>
                Enter to send · Shift+Enter for newline
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
