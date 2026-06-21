import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/api/client'
import { supabase } from '@/lib/supabase'

interface User {
  id: string; email: string; username: string; display_name: string
  avatar_url?: string; plan_tier: string; is_verified: boolean
  followers_count: number; following_count: number; voices_count: number; plays_count: number
  bio?: string; website?: string; location?: string; preferred_language?: string
  email_notifications?: boolean
}

interface AuthState {
  user: User | null; accessToken: string | null; refreshToken: string | null; loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  setTokens: (access: string, refresh: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null, loading: false,

      setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ accessToken: access, refreshToken: refresh })
      },

      login: async (email, password) => {
        set({ loading: true })
        try {
          const data = await authApi.login(email, password)
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token })
        } finally { set({ loading: false }) }
      },

      register: async (formData) => {
        set({ loading: true })
        try { await authApi.register(formData) }
        finally { set({ loading: false }) }
      },

      logout: async () => {
        const { refreshToken } = get()
        try { if (refreshToken) await authApi.logout(refreshToken) } catch {}
        try { await supabase.auth.signOut() } catch {}
        localStorage.clear();
        sessionStorage.clear();
        set({ user: null, accessToken: null, refreshToken: null });
        window.location.href = '/';
      },

      refreshUser: async () => {
        try {
          const user = await authApi.me()
          set({ user })
        } catch { get().logout() }
      },

      updateUser: (updates) => set(s => {
        if (s.user) return { user: { ...s.user, ...updates } as User }
        return { 
          user: { 
            id: updates.id || '', 
            email: updates.email || '', 
            username: updates.username || updates.email?.split('@')[0] || 'user', 
            display_name: updates.display_name || 'User', 
            plan_tier: 'free', 
            is_verified: true,
            followers_count: 0, 
            following_count: 0, 
            voices_count: 0, 
            plays_count: 0,
            ...updates 
          } as User
        }
      }),
    }),
    { name: 'vc-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
)
