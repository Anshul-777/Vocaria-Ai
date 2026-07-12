import React, { useEffect, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/layout/AuthLayout'
import Chatbot from './components/Chatbot'

const Landing = lazy(() => import('./pages/Landing'))
const Start = lazy(() => import('./pages/Start'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPw = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPw = lazy(() => import('./pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const Onboarding = lazy(() => import('./pages/auth/Onboarding'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const VoiceLibrary = lazy(() => import('./pages/voices/VoiceLibrary'))
const NewVoiceProfile = lazy(() => import('./pages/voices/NewVoiceProfile'))
const VoiceAgent = lazy(() => import('./pages/agent/VoiceAgent'))
const VoiceDetail = lazy(() => import('./pages/voices/VoiceDetail'))
const ClonePage = lazy(() => import('./pages/voices/ClonePage'))
const GeneratePage = lazy(() => import('./pages/voices/GeneratePage'))
const DetectionLab = lazy(() => import('./pages/detection/DetectionLab'))
const LiveDetect = lazy(() => import('./pages/detection/LiveDetection'))
const DetectResult = lazy(() => import('./pages/detection/DetectionResult'))
const HubPage = lazy(() => import('./pages/hub/HubPage'))
const HubVoice = lazy(() => import('./pages/hub/HubVoiceDetail'))
const PublicProfile = lazy(() => import('./pages/hub/PublicProfile'))
const Analytics = lazy(() => import('./pages/analytics/Analytics'))
const Billing = lazy(() => import('./pages/billing/Billing'))
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'))
const Notifications = lazy(() => import('./pages/notifications/NotificationsPage'))
const AuditPage = lazy(() => import('./pages/audit/AuditPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'))
const ApiDocsPage = lazy(() => import('./pages/api_docs/ApiDocsPage'))
const BenchmarksPage = lazy(() => import('./pages/benchmarks/BenchmarksPage'))
const QualityPage = lazy(() => import('./pages/quality/QualityPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const StudioPage = lazy(() => import('./pages/studio/StudioPage'))
const VoiceTools = lazy(() => import('./pages/tools/VoiceTools'))

function Loader() {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), 250)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999] gap-2.5 text-gray-500 text-[13px] font-medium">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin text-blue-500">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="flex items-end">
        Loading
        <span className="flex ml-0.5 pb-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            >
              .
            </motion.span>
          ))}
        </span>
      </div>
    </div>
  )
}

import { supabase } from './lib/supabase'

function Protected({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        useAuthStore.getState().updateUser({
           id: session.user.id,
           email: session.user.email,
           display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
           avatar_url: session.user.user_metadata?.avatar_url,
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        useAuthStore.getState().updateUser({
           id: session.user.id,
           email: session.user.email,
           display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
           avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <Loader />;
  if (session) return <Navigate to="/start" replace />;

  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore()
  // Disable refresh to prevent logout on failure
  // useEffect(() => { if (accessToken) refreshUser().catch(() => {}) }, [])

  return (
    <BrowserRouter>
      <Toaster position="top-right" gutter={8} toastOptions={{ duration: 4000, style: { borderRadius: 12, fontSize: 13.5, fontWeight: 500, padding: '10px 14px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', background: 'white', color: 'var(--fg)' }, success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } }, error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } } }} />
      <Suspense fallback={<Loader />}>
          <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/start" element={<Protected><Start /></Protected>} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/forgot-password" element={<ForgotPw />} />
            <Route path="/reset-password" element={<ResetPw />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>
          <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
          <Route element={<Protected><AppLayout /></Protected>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="voices" element={<VoiceLibrary />} />
            <Route path="voices/new" element={<NewVoiceProfile />} />
            <Route path="voices/:id" element={<VoiceDetail />} />
            <Route path="agent" element={<VoiceAgent />} />
            <Route path="clone" element={<ClonePage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/detection" element={<DetectionLab />} />
            <Route path="/detection/live" element={<LiveDetect />} />
            <Route path="/detection/:id" element={<DetectResult />} />
            <Route path="/hub" element={<HubPage />} />
            <Route path="/hub/:id" element={<HubVoice />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
            <Route path="/quality" element={<QualityPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/tools" element={<VoiceTools />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </Suspense>
      {user && <Chatbot />}
    </BrowserRouter>
  )
}
