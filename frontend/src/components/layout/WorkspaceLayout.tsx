import { useState, useMemo } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Link2, BookOpen, Mic2, Settings,
  ArrowLeft, ChevronUp, ChevronDown, Menu, X, Sparkles,
  Activity, Plug, MessageCircle, Shield, Zap, Crown
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { VocariaLogo } from '@/components/ui/VocariaLogo'

/* ─── Plan Configuration ───────────────────────────────────────────────── */

const PLAN_CONFIG: Record<string, {
  label: string
  color: string
  bgGradient: string
  borderColor: string
  textColor: string
  icon: typeof Crown
  credits: number
  showUpgrade: boolean
}> = {
  free: {
    label: 'Free',
    color: 'text-gray-600',
    bgGradient: 'from-gray-50 to-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    icon: Zap,
    credits: 5000,
    showUpgrade: true,
  },
  pro: {
    label: 'Pro',
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Sparkles,
    credits: 50000,
    showUpgrade: true,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-amber-600',
    bgGradient: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: Crown,
    credits: -1, // unlimited
    showUpgrade: false,
  },
}

/* ─── Navigation Structure ─────────────────────────────────────────────── */

const WORKSPACE_NAV = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/agent/dashboard' },
    ],
  },
  {
    title: 'AGENT SETUP',
    items: [
      { label: 'Agents', icon: Users, path: '/agent/agents' },
      { label: 'Knowledge Base', icon: BookOpen, path: '/agent/knowledge-base' },
    ],
  },
  {
    title: 'COMMUNICATE',
    items: [
      { label: 'Live Chat', icon: MessageCircle, path: '/agent/live-chat', accent: true },
    ],
  },
  {
    title: 'ACTIVITY',
    items: [
      { label: 'Activity Log', icon: Activity, path: '/agent/activity' },
      { label: 'Integrations', icon: Plug, path: '/agent/integrations' },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Account', icon: Settings, path: '/agent/account' },
    ],
  },
]

/* ─── Avatar Component ─────────────────────────────────────────────────── */

function WorkspaceAvatar({ user, size = 32 }: { user: any; size?: number }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="rounded-full object-cover ring-2 ring-white/80 shadow-sm shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  const initials = (user?.display_name || user?.email || 'U')
    .split(' ')
    .map((w: string) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-sm shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

/* ─── Plan Badge Component ─────────────────────────────────────────────── */

function PlanBadge({ tier }: { tier: string }) {
  const plan = PLAN_CONFIG[tier?.toLowerCase()] || PLAN_CONFIG.free
  const PlanIcon = plan.icon

  return (
    <div className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider',
      plan.color,
      `bg-gradient-to-r ${plan.bgGradient}`
    )}>
      <PlanIcon size={11} strokeWidth={2.5} />
      {plan.label}
    </div>
  )
}

/* ─── Main Layout ──────────────────────────────────────────────────────── */

export default function WorkspaceLayout() {
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const userTier = (user?.plan_tier || 'free').toLowerCase()
  const planConfig = PLAN_CONFIG[userTier] || PLAN_CONFIG.free

  const SidebarContent = () => {
    const activePath = useMemo(() => {
      return WORKSPACE_NAV
        .flatMap(s => s.items)
        .map(i => i.path)
        .filter(p => location.pathname === p || location.pathname.startsWith(p + '/'))
        .sort((a, b) => b.length - a.length)[0]
    }, [location.pathname])

    return (
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[60px] shrink-0 border-b border-gray-100/80">
          <VocariaLogo size={28} withText={true} onClick={() => navigate('/agent/dashboard')} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-3 space-y-0.5 scrollbar-hide">
          {WORKSPACE_NAV.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400/80 select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.path === activePath
                  const isAccent = (item as any).accent

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebar(false)}
                      className={clsx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
                        isActive
                          ? isAccent
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200/50'
                            : 'bg-indigo-50/80 text-indigo-700'
                          : isAccent
                            ? 'text-indigo-600 hover:bg-indigo-50/60'
                            : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={clsx(
                          'shrink-0 transition-colors',
                          isActive
                            ? isAccent ? 'text-white' : 'text-indigo-600'
                            : isAccent
                              ? 'text-indigo-400 group-hover:text-indigo-500'
                              : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {isAccent && !isActive && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 text-[9px] font-bold uppercase tracking-wider">
                          Live
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-gray-100/80 px-3 py-3 space-y-2.5">
          {/* Back to Products */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all group"
          >
            <ArrowLeft size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            <span>Back to Vocaria Products</span>
          </Link>

          {/* Plan Card — Dynamic based on user.plan_tier */}
          <div className={clsx(
            'rounded-xl border p-3.5 bg-gradient-to-br',
            planConfig.bgGradient,
            planConfig.borderColor
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <PlanBadge tier={userTier} />
            </div>

            {planConfig.credits > 0 ? (
              <>
                <div className="mt-2 text-[11.5px] text-gray-500 font-medium">
                  <span className="font-bold text-gray-700">0</span>
                  <span className="text-gray-400"> / </span>
                  <span>{planConfig.credits.toLocaleString()} credits</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
                  <div className="h-full w-[0%] rounded-full bg-indigo-500 transition-all duration-500" />
                </div>
              </>
            ) : (
              <div className="mt-1.5 text-[11.5px] text-amber-600 font-medium flex items-center gap-1.5">
                <Shield size={12} strokeWidth={2.5} />
                Unlimited credits
              </div>
            )}

            {/* Only show upgrade button if plan allows it */}
            {planConfig.showUpgrade && (
              <button
                onClick={() => navigate('/billing')}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/80 py-2 text-[12px] font-semibold text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <Sparkles size={12} className="text-indigo-500" />
                Upgrade Plan
              </button>
            )}
          </div>

          {/* User Profile */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50/80 transition-all group"
          >
            <WorkspaceAvatar user={user} size={30} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12.5px] font-semibold text-gray-800 truncate">
                {user?.display_name || 'User'}
              </div>
              <div className="text-[10.5px] text-gray-400 truncate">
                {user?.email || ''}
              </div>
            </div>
            <ChevronUp
              size={13}
              className={clsx(
                'text-gray-400 transition-transform duration-200',
                userMenuOpen ? '' : 'rotate-180'
              )}
            />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafbfc] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[248px] flex-col border-r border-gray-200/80 bg-white shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-[70] w-[280px] bg-white border-r border-gray-200 lg:hidden flex flex-col"
            >
              <div className="absolute right-3 top-4 z-10">
                <button
                  onClick={() => setMobileSidebar(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex lg:hidden items-center justify-between h-14 px-4 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setMobileSidebar(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={20} />
          </button>
          <VocariaLogo size={26} withText={true} />
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
